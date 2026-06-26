import { prisma } from '@/config/prisma';
import { AppError } from '@/middlewares/errorHandler';
import { logTrail, type TrailActor } from './auditTrail.service';
import { notifyStatusChange } from '@/modules/notifications/notification.service';
import type { CreateSessionInput, UpdateItemsInput } from './session.schema';
import type { AuditStatus, Prisma, UserRole } from '@prisma/client';

const SURPRISE_MULTIPLIER = 1.2;

/** Konteks pemirsa (dari JWT) untuk scoping data per-peran. */
export interface Viewer {
  id: string;
  role: UserRole;
  companyId: string;
  divisionId: string | null;
}

const isAdminRole = (role: UserRole) => role === 'SUPERADMIN' || role === 'ADMIN_5S';

/** Best-effort: beri tahu Kepala Divisi terkait (fire-and-forget). */
function notifyDivisionHeads(divisionId: string, sessionId: string, areaName: string, message: string): void {
  void prisma.user
    .findMany({ where: { role: 'KEPALA_DIVISI', divisionId, isActive: true }, select: { id: true } })
    .then((heads) => Promise.allSettled(heads.map((h) => notifyStatusChange(h.id, sessionId, areaName, message))))
    .catch((e) => console.error('[notify] division heads:', e));
}

const sessionInclude = {
  area: { select: { id: true, name: true, code: true, category: true } },
  division: { select: { id: true, name: true, category: true } },
  auditor: { select: { id: true, name: true, email: true } },
  period: { select: { id: true, name: true } },
  checklistItems: { orderBy: [{ pilar: 'asc' as const }, { createdAt: 'asc' as const }] },
} satisfies Prisma.AuditSessionInclude;

/** Scope query ke perusahaan user lewat relasi area→division→department→plant. */
function companyScope(companyId: string): Prisma.AuditSessionWhereInput {
  return { division: { department: { plant: { companyId } } } };
}

/** Hitung skor total ternormalisasi 0-100 dari item yang sudah dinilai. */
function computeTotalScore(items: { score: number | null }[]): number | null {
  const scored = items.filter((i) => i.score != null);
  if (scored.length === 0) return null;
  const sum = scored.reduce((acc, i) => acc + (i.score || 0), 0);
  return Math.round((sum / (scored.length * 5)) * 1000) / 10;
}

// ============================================================
// LIST / GET
// ============================================================

export async function listSessions(
  viewer: Viewer,
  filters: { status?: string; divisionId?: string; periodId?: string; auditorId?: string }
) {
  const where: Prisma.AuditSessionWhereInput = {
    ...companyScope(viewer.companyId),
    ...(filters.status && { status: filters.status as AuditStatus }),
    ...(filters.periodId && { periodId: filters.periodId }),
  };

  // Scope per-peran:
  if (viewer.role === 'AUDITOR') {
    where.auditorId = viewer.id;                       // hanya audit yang ditugaskan ke dirinya
  } else if (viewer.role === 'KEPALA_DIVISI') {
    where.divisionId = viewer.divisionId ?? '__none__'; // hanya divisinya sendiri
  } else {
    // Admin/Superadmin: boleh filter manual lewat query
    if (filters.divisionId) where.divisionId = filters.divisionId;
    if (filters.auditorId) where.auditorId = filters.auditorId;
  }

  return prisma.auditSession.findMany({
    where,
    include: {
      area: { select: { name: true, code: true } },
      division: { select: { name: true, category: true } },
      auditor: { select: { name: true } },
      period: { select: { name: true } },
      _count: { select: { checklistItems: true } },
    },
    orderBy: { scheduledAt: 'desc' },
  });
}

export async function getSessionById(id: string, companyId: string) {
  const session = await prisma.auditSession.findFirst({
    where: { id, ...companyScope(companyId) },
    include: sessionInclude,
  });
  if (!session) throw new AppError('Sesi audit tidak ditemukan', 404);
  return session;
}

/** Guard akses lihat detail: Admin/Super bebas; Auditor hanya miliknya; Kepala hanya divisinya. */
export function assertCanView(
  session: { auditorId: string; divisionId: string },
  viewer: Viewer
) {
  if (isAdminRole(viewer.role)) return;
  if (viewer.role === 'AUDITOR' && session.auditorId === viewer.id) return;
  if (viewer.role === 'KEPALA_DIVISI' && session.divisionId === viewer.divisionId) return;
  throw new AppError('Anda tidak memiliki akses ke audit ini', 403);
}

// ============================================================
// CREATE (schedule) — auto-generate checklist + auto-tag PROPER/ISO
// ============================================================

export async function createSession(companyId: string, input: CreateSessionInput, actor: TrailActor) {
  const area = await prisma.workArea.findFirst({
    where: { id: input.areaId, division: { department: { plant: { companyId } } } },
    include: { division: true },
  });
  if (!area) throw new AppError('Area kerja tidak ditemukan', 404);

  const auditor = await prisma.user.findFirst({ where: { id: input.auditorId, companyId } });
  if (!auditor) throw new AppError('Auditor tidak ditemukan', 404);

  const period = await prisma.auditPeriod.findFirst({ where: { id: input.periodId, companyId } });
  if (!period) throw new AppError('Periode audit tidak ditemukan', 404);

  // Ambil template checklist sesuai kategori area → jadi item audit (auto-tag PROPER & ISO)
  const templates = await prisma.checklistTemplate.findMany({
    where: { areaCategory: area.category, isActive: true },
    orderBy: [{ pilar: 'asc' }, { sortOrder: 'asc' }],
  });

  if (templates.length === 0) {
    throw new AppError(`Belum ada template checklist untuk kategori area ${area.category}`, 400);
  }

  const session = await prisma.auditSession.create({
    data: {
      type: input.type,
      status: 'SCHEDULED',
      scheduledAt: new Date(input.scheduledAt),
      surpriseMultiplier: input.type === 'SURPRISE' ? SURPRISE_MULTIPLIER : 1.0,
      areaId: area.id,
      divisionId: area.divisionId,
      auditorId: input.auditorId,
      periodId: input.periodId,
      notes: input.notes,
      checklistItems: {
        create: templates.map((t) => ({
          pilar: t.pilar,
          question: t.question,
          isProperTag: t.isProperTag,
          isoClause: t.isoClause,
          templateId: t.id,
        })),
      },
    },
    include: sessionInclude,
  });

  await logTrail({
    entity: 'AuditSession',
    entityId: session.id,
    action: 'CREATE',
    toStatus: 'SCHEDULED',
    changes: { type: input.type, area: area.name, items: templates.length },
    actor,
  });

  return session;
}

// ============================================================
// LIFECYCLE TRANSITIONS
// ============================================================

/** Pastikan actor adalah auditor yang ditugaskan, atau Admin/Superadmin. */
function assertAuditorOrAdmin(session: { auditorId: string }, actor: TrailActor) {
  const isAdmin = actor.role === 'SUPERADMIN' || actor.role === 'ADMIN_5S';
  if (!isAdmin && session.auditorId !== actor.id) {
    throw new AppError('Hanya auditor yang ditugaskan yang dapat mengisi audit ini', 403);
  }
}

export async function startSession(id: string, companyId: string, actor: TrailActor) {
  const session = await getSessionById(id, companyId);
  assertAuditorOrAdmin(session, actor);

  if (session.status !== 'SCHEDULED') {
    throw new AppError(`Audit hanya bisa dimulai dari status SCHEDULED (status sekarang: ${session.status})`, 400);
  }

  const updated = await prisma.auditSession.update({
    where: { id },
    data: { status: 'IN_PROGRESS', startedAt: new Date() },
    include: sessionInclude,
  });

  await logTrail({
    entity: 'AuditSession', entityId: id, action: 'STATUS_CHANGE',
    fromStatus: 'SCHEDULED', toStatus: 'IN_PROGRESS', actor,
  });

  return updated;
}

export async function updateItems(id: string, companyId: string, input: UpdateItemsInput, actor: TrailActor) {
  const session = await getSessionById(id, companyId);
  assertAuditorOrAdmin(session, actor);

  if (session.status !== 'IN_PROGRESS') {
    throw new AppError(`Audit hanya bisa diisi saat status IN_PROGRESS (status sekarang: ${session.status})`, 400);
  }

  const validIds = new Set(session.checklistItems.map((i) => i.id));
  for (const item of input.items) {
    if (!validIds.has(item.id)) throw new AppError(`Item ${item.id} bukan bagian dari sesi ini`, 400);
  }

  await prisma.$transaction(
    input.items.map((item) =>
      prisma.auditChecklistItem.update({
        where: { id: item.id },
        data: {
          ...(item.score !== undefined && { score: item.score }),
          ...(item.notes !== undefined && { notes: item.notes }),
        },
      })
    )
  );

  // Recompute total dari kondisi terbaru
  const fresh = await prisma.auditChecklistItem.findMany({
    where: { sessionId: id },
    select: { score: true },
  });
  const totalScore = computeTotalScore(fresh);

  const updated = await prisma.auditSession.update({
    where: { id },
    data: { totalScore },
    include: sessionInclude,
  });

  await logTrail({
    entity: 'AuditSession', entityId: id, action: 'SCORE_UPDATE',
    changes: { updatedItems: input.items.length, totalScore }, actor,
  });

  return updated;
}

export async function submitSession(id: string, companyId: string, actor: TrailActor) {
  const session = await getSessionById(id, companyId);
  assertAuditorOrAdmin(session, actor);

  if (session.status !== 'IN_PROGRESS') {
    throw new AppError(`Audit hanya bisa disubmit dari status IN_PROGRESS (status sekarang: ${session.status})`, 400);
  }

  const unscored = session.checklistItems.filter((i) => i.score == null);
  if (unscored.length > 0) {
    throw new AppError(`Masih ada ${unscored.length} item belum dinilai. Lengkapi semua sebelum submit.`, 400);
  }

  const totalScore = computeTotalScore(session.checklistItems);

  const updated = await prisma.auditSession.update({
    where: { id },
    data: { status: 'PENDING_REVIEW', completedAt: new Date(), totalScore },
    include: sessionInclude,
  });

  await logTrail({
    entity: 'AuditSession', entityId: id, action: 'SUBMIT',
    fromStatus: 'IN_PROGRESS', toStatus: 'PENDING_REVIEW',
    changes: { totalScore }, actor,
  });

  notifyDivisionHeads(session.divisionId, id, updated.area.name, 'Audit baru menunggu review Anda');

  // Auto-notif potensi non-conformance ISO: item ber-klausul ISO dgn skor rendah (<=2)
  const ncItems = session.checklistItems.filter((i) => i.isoClause && i.score != null && i.score <= 2);
  if (ncItems.length > 0) {
    const clauses = [...new Set(ncItems.map((i) => i.isoClause))].join(', ');
    notifyDivisionHeads(session.divisionId, id, updated.area.name, `⚠️ Potensi non-conformance ISO (klausul ${clauses}) — ${ncItems.length} item skor rendah`);
  }

  return updated;
}

/** Review oleh Kepala Divisi: PENDING_REVIEW → COMPLETED. */
export async function reviewSession(id: string, companyId: string, actor: TrailActor) {
  const session = await getSessionById(id, companyId);

  if (session.status !== 'PENDING_REVIEW') {
    throw new AppError(`Hanya bisa direview dari status PENDING_REVIEW (status sekarang: ${session.status})`, 400);
  }

  // Kepala divisi harus dari divisi yang sama; Admin/Superadmin bebas
  const isAdmin = actor.role === 'SUPERADMIN' || actor.role === 'ADMIN_5S';
  if (!isAdmin) {
    if (actor.role !== 'KEPALA_DIVISI') {
      throw new AppError('Hanya Kepala Divisi atau Admin yang dapat mereview', 403);
    }
    const reviewer = await prisma.user.findUnique({ where: { id: actor.id }, select: { divisionId: true } });
    if (reviewer?.divisionId !== session.divisionId) {
      throw new AppError('Kepala Divisi hanya dapat mereview audit divisinya sendiri', 403);
    }
  }

  const updated = await prisma.auditSession.update({
    where: { id },
    data: { status: 'COMPLETED', reviewedAt: new Date(), reviewedById: actor.id },
    include: sessionInclude,
  });

  await logTrail({
    entity: 'AuditSession', entityId: id, action: 'APPROVE',
    fromStatus: 'PENDING_REVIEW', toStatus: 'COMPLETED',
    notes: 'Direview Kepala Divisi', actor,
  });

  void notifyStatusChange(session.auditorId, id, updated.area.name, 'Audit Anda telah direview, menunggu approval final Admin');

  return updated;
}

/** Approval final oleh Admin 5S: COMPLETED → APPROVED. */
export async function approveSession(id: string, companyId: string, actor: TrailActor) {
  const session = await getSessionById(id, companyId);

  if (session.status !== 'COMPLETED') {
    throw new AppError(`Approval final hanya dari status COMPLETED (status sekarang: ${session.status})`, 400);
  }

  const updated = await prisma.auditSession.update({
    where: { id },
    data: { status: 'APPROVED', approvedAt: new Date(), approvedById: actor.id },
    include: sessionInclude,
  });

  await logTrail({
    entity: 'AuditSession', entityId: id, action: 'APPROVE',
    fromStatus: 'COMPLETED', toStatus: 'APPROVED',
    notes: 'Approval final Admin 5S', actor,
  });

  void notifyStatusChange(session.auditorId, id, updated.area.name, 'Audit Anda telah disetujui final 🎉');

  return updated;
}

/** Tolak audit (dari PENDING_REVIEW atau COMPLETED) → REJECTED. */
export async function rejectSession(id: string, companyId: string, reason: string, actor: TrailActor) {
  const session = await getSessionById(id, companyId);

  if (session.status !== 'PENDING_REVIEW' && session.status !== 'COMPLETED') {
    throw new AppError(`Hanya bisa ditolak dari status PENDING_REVIEW atau COMPLETED (status sekarang: ${session.status})`, 400);
  }

  const updated = await prisma.auditSession.update({
    where: { id },
    data: { status: 'REJECTED', rejectedAt: new Date(), rejectionReason: reason },
    include: sessionInclude,
  });

  await logTrail({
    entity: 'AuditSession', entityId: id, action: 'REJECT',
    fromStatus: session.status, toStatus: 'REJECTED', notes: reason, actor,
  });

  void notifyStatusChange(session.auditorId, id, updated.area.name, `Audit ditolak: ${reason}`);

  return updated;
}

/** Auditor merevisi audit yang ditolak: REJECTED → IN_PROGRESS. */
export async function reviseSession(id: string, companyId: string, actor: TrailActor) {
  const session = await getSessionById(id, companyId);
  assertAuditorOrAdmin(session, actor);

  if (session.status !== 'REJECTED') {
    throw new AppError(`Revisi hanya bisa dari status REJECTED (status sekarang: ${session.status})`, 400);
  }

  const updated = await prisma.auditSession.update({
    where: { id },
    data: { status: 'IN_PROGRESS', rejectedAt: null, rejectionReason: null },
    include: sessionInclude,
  });

  await logTrail({
    entity: 'AuditSession', entityId: id, action: 'STATUS_CHANGE',
    fromStatus: 'REJECTED', toStatus: 'IN_PROGRESS', notes: 'Revisi auditor', actor,
  });

  return updated;
}

export async function deleteSession(id: string, companyId: string, actor: TrailActor) {
  const session = await getSessionById(id, companyId);
  if (session.status !== 'SCHEDULED') {
    throw new AppError('Hanya audit berstatus SCHEDULED yang bisa dihapus', 400);
  }
  await prisma.auditSession.delete({ where: { id } });
  await logTrail({
    entity: 'AuditSession', entityId: id, action: 'DELETE',
    fromStatus: 'SCHEDULED', actor,
  });
}

/** Tambah foto (URL hasil upload) ke sebuah item checklist. */
export async function addItemPhotos(
  sessionId: string,
  itemId: string,
  companyId: string,
  urls: string[],
  actor: TrailActor
) {
  const session = await getSessionById(sessionId, companyId);
  assertAuditorOrAdmin(session, actor);

  if (session.status !== 'IN_PROGRESS') {
    throw new AppError('Foto hanya bisa ditambahkan saat audit berlangsung (IN_PROGRESS)', 400);
  }

  const item = session.checklistItems.find((i) => i.id === itemId);
  if (!item) throw new AppError('Item checklist tidak ditemukan', 404);

  const updated = await prisma.auditChecklistItem.update({
    where: { id: itemId },
    data: { photos: { push: urls } },
  });

  await logTrail({
    entity: 'AuditSession', entityId: sessionId, action: 'PHOTO_ADD',
    changes: { itemId, added: urls.length }, actor,
  });

  return updated;
}
