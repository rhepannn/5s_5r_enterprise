import { prisma } from '@/config/prisma';
import { AppError } from '@/middlewares/errorHandler';
import { logTrail, type TrailActor } from '@/modules/audit/auditTrail.service';
import { notifyStatusChange } from '@/modules/notifications/notification.service';
import type { CreateImprovementInput, UpdateImprovementInput } from './improvement.schema';
import type { Prisma, ProblemCategory } from '@prisma/client';

const VERIFIED_BONUS = 5;

const include = {
  division: { select: { id: true, name: true, category: true } },
  pic: { select: { id: true, name: true, email: true } },
  qccProject: { select: { id: true, title: true, status: true } },
} satisfies Prisma.ImprovementInclude;

function companyScope(companyId: string): Prisma.ImprovementWhereInput {
  return { division: { department: { plant: { companyId } } } };
}

/** BA-YYYY-DIV-XXXX, sekuensial per divisi per tahun. */
async function generateCode(divisionCode: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `BA-${year}-${divisionCode.toUpperCase()}-`;
  const count = await prisma.improvement.count({ where: { code: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
}

/** Auto-flag PROPER evidence bila kategori relevan lingkungan (kebersihan/limbah). */
function autoProperFlag(category: ProblemCategory, explicit?: boolean): boolean {
  if (explicit !== undefined) return explicit;
  return category === 'KEBERSIHAN';
}

// ============================================================
// LIST / GET
// ============================================================

export async function listImprovements(
  companyId: string,
  filters: { status?: string; divisionId?: string; problemCategory?: string }
) {
  return prisma.improvement.findMany({
    where: {
      ...companyScope(companyId),
      ...(filters.status && { status: filters.status as Prisma.EnumImprovementStatusFilter['equals'] }),
      ...(filters.divisionId && { divisionId: filters.divisionId }),
      ...(filters.problemCategory && { problemCategory: filters.problemCategory as ProblemCategory }),
    },
    include,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getImprovementById(id: string, companyId: string) {
  const imp = await prisma.improvement.findFirst({ where: { id, ...companyScope(companyId) }, include });
  if (!imp) throw new AppError('Perbaikan tidak ditemukan', 404);
  return imp;
}

// ============================================================
// CREATE / UPDATE
// ============================================================

export async function createImprovement(companyId: string, input: CreateImprovementInput, actor: TrailActor) {
  const division = await prisma.division.findFirst({
    where: { id: input.divisionId, department: { plant: { companyId } } },
  });
  if (!division) throw new AppError('Divisi tidak ditemukan', 404);

  const pic = await prisma.user.findFirst({ where: { id: input.picId, companyId } });
  if (!pic) throw new AppError('PIC tidak ditemukan', 404);

  const code = await generateCode(division.code);

  const imp = await prisma.improvement.create({
    data: {
      code,
      divisionId: input.divisionId,
      problemCategory: input.problemCategory,
      pilarTags: input.pilarTags,
      description: input.description,
      rootCause: input.rootCause,
      actions: input.actions,
      picId: input.picId,
      targetDate: new Date(input.targetDate),
      estimatedCost: input.estimatedCost ?? null,
      isoClause: input.isoClause ?? null,
      isProperEvidence: autoProperFlag(input.problemCategory, input.isProperEvidence),
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      bonusPoints: VERIFIED_BONUS,
      status: 'OPEN',
    },
    include,
  });

  await logTrail({ entity: 'Improvement', entityId: imp.id, action: 'CREATE', toStatus: 'OPEN', changes: { code }, actor });
  return imp;
}

export async function updateImprovement(id: string, companyId: string, input: UpdateImprovementInput, actor: TrailActor) {
  const imp = await getImprovementById(id, companyId);
  if (imp.status === 'CLOSED' || imp.status === 'REJECTED') {
    throw new AppError('Perbaikan yang sudah selesai/ditolak tidak dapat diubah', 400);
  }

  const updated = await prisma.improvement.update({
    where: { id },
    data: {
      ...(input.problemCategory && { problemCategory: input.problemCategory }),
      ...(input.pilarTags && { pilarTags: input.pilarTags }),
      ...(input.description && { description: input.description }),
      ...(input.rootCause && { rootCause: input.rootCause }),
      ...(input.actions && { actions: input.actions }),
      ...(input.picId && { picId: input.picId }),
      ...(input.targetDate && { targetDate: new Date(input.targetDate) }),
      ...(input.estimatedCost !== undefined && { estimatedCost: input.estimatedCost }),
      ...(input.isoClause !== undefined && { isoClause: input.isoClause }),
      ...(input.isProperEvidence !== undefined && { isProperEvidence: input.isProperEvidence }),
    },
    include,
  });
  await logTrail({ entity: 'Improvement', entityId: id, action: 'UPDATE', actor });
  return updated;
}

// ============================================================
// STATUS WORKFLOW
// ============================================================

export async function startProgress(id: string, companyId: string, actor: TrailActor) {
  const imp = await getImprovementById(id, companyId);
  if (imp.status !== 'OPEN') throw new AppError(`Hanya bisa dimulai dari status OPEN (sekarang: ${imp.status})`, 400);
  const updated = await prisma.improvement.update({ where: { id }, data: { status: 'IN_PROGRESS' }, include });
  await logTrail({ entity: 'Improvement', entityId: id, action: 'STATUS_CHANGE', fromStatus: 'OPEN', toStatus: 'IN_PROGRESS', actor });
  return updated;
}

export async function submitVerification(id: string, companyId: string, actor: TrailActor) {
  const imp = await getImprovementById(id, companyId);
  if (imp.status !== 'IN_PROGRESS') throw new AppError(`Hanya dari status IN_PROGRESS (sekarang: ${imp.status})`, 400);
  if (imp.photoAfter.length === 0) throw new AppError('Wajib upload minimal 1 foto "After" sebelum minta verifikasi', 400);

  const updated = await prisma.improvement.update({ where: { id }, data: { status: 'VERIFICATION_NEEDED' }, include });
  await logTrail({ entity: 'Improvement', entityId: id, action: 'SUBMIT', fromStatus: 'IN_PROGRESS', toStatus: 'VERIFICATION_NEEDED', actor });
  notifyDivisionHeads(imp.divisionId, id, imp.code, 'Perbaikan menunggu verifikasi foto After Anda');
  return updated;
}

export async function verifyImprovement(id: string, companyId: string, actor: TrailActor) {
  const imp = await getImprovementById(id, companyId);
  if (imp.status !== 'VERIFICATION_NEEDED') throw new AppError(`Hanya bisa diverifikasi dari status VERIFICATION_NEEDED (sekarang: ${imp.status})`, 400);

  const now = new Date();
  const updated = await prisma.improvement.update({
    where: { id },
    data: { status: 'CLOSED', actualDate: now, verifiedAt: now, verifiedById: actor.id, bonusPoints: VERIFIED_BONUS },
    include,
  });
  const onTime = updated.actualDate && updated.targetDate && updated.actualDate <= updated.targetDate;
  await logTrail({
    entity: 'Improvement', entityId: id, action: 'VERIFY',
    fromStatus: 'VERIFICATION_NEEDED', toStatus: 'CLOSED',
    changes: { bonus: VERIFIED_BONUS, onTime }, notes: 'Foto After terverifikasi', actor,
  });
  void notifyStatusChange(imp.picId, id, imp.code, `Perbaikan diverifikasi & ditutup 🎉 (+${VERIFIED_BONUS} poin)`);
  return updated;
}

export async function requestRevision(id: string, companyId: string, reason: string, actor: TrailActor) {
  const imp = await getImprovementById(id, companyId);
  if (imp.status !== 'VERIFICATION_NEEDED') throw new AppError(`Hanya dari status VERIFICATION_NEEDED (sekarang: ${imp.status})`, 400);
  const updated = await prisma.improvement.update({ where: { id }, data: { status: 'IN_PROGRESS', rejectionReason: reason }, include });
  await logTrail({ entity: 'Improvement', entityId: id, action: 'REVISION', fromStatus: 'VERIFICATION_NEEDED', toStatus: 'IN_PROGRESS', notes: reason, actor });
  void notifyStatusChange(imp.picId, id, imp.code, `Perlu revisi: ${reason}`);
  return updated;
}

export async function rejectImprovement(id: string, companyId: string, reason: string, actor: TrailActor) {
  const imp = await getImprovementById(id, companyId);
  if (imp.status === 'CLOSED' || imp.status === 'REJECTED') throw new AppError('Status tidak bisa ditolak', 400);
  const updated = await prisma.improvement.update({ where: { id }, data: { status: 'REJECTED', rejectionReason: reason }, include });
  await logTrail({ entity: 'Improvement', entityId: id, action: 'REJECT', fromStatus: imp.status, toStatus: 'REJECTED', notes: reason, actor });
  void notifyStatusChange(imp.picId, id, imp.code, `Temuan ditolak: ${reason}`);
  return updated;
}

// ============================================================
// FOTO
// ============================================================

export async function addPhotos(id: string, companyId: string, type: 'BEFORE' | 'AFTER', urls: string[], actor: TrailActor) {
  const imp = await getImprovementById(id, companyId);
  if (imp.status === 'CLOSED' || imp.status === 'REJECTED') throw new AppError('Tidak bisa menambah foto pada perbaikan selesai/ditolak', 400);

  const updated = await prisma.improvement.update({
    where: { id },
    data: type === 'BEFORE' ? { photoBefore: { push: urls } } : { photoAfter: { push: urls } },
    include,
  });
  await logTrail({ entity: 'Improvement', entityId: id, action: 'PHOTO_ADD', changes: { type, added: urls.length }, actor });
  return updated;
}

// ============================================================
// ESCALATE KE QCC (1 klik)
// ============================================================

export async function escalateToQCC(id: string, companyId: string, actor: TrailActor) {
  const imp = await getImprovementById(id, companyId);
  if (imp.qccProjectId) throw new AppError('Perbaikan ini sudah ter-escalate ke QCC', 400);

  const qcc = await prisma.qCCProject.create({
    data: {
      title: `QCC: ${imp.code} — ${imp.description.substring(0, 60)}`,
      divisionId: imp.divisionId,
      status: 'PLAN',
      members: [imp.pic.name],
      startDate: new Date(),
      targetDate: imp.targetDate,
      problemDesc: imp.description,
      rootCause: imp.rootCause,
      bonusPoints: 15,
    },
  });

  const updated = await prisma.improvement.update({ where: { id }, data: { qccProjectId: qcc.id }, include });
  await logTrail({ entity: 'Improvement', entityId: id, action: 'ESCALATE_QCC', changes: { qccProjectId: qcc.id }, actor });
  return { improvement: updated, qccProject: qcc };
}

// ============================================================
// LAPORAN REKAP
// ============================================================

export async function getReport(companyId: string) {
  const where = companyScope(companyId);
  const all = await prisma.improvement.findMany({
    where,
    select: { status: true, targetDate: true, actualDate: true, divisionId: true, bonusPoints: true, createdAt: true, division: { select: { name: true } } },
  });

  const byStatus: Record<string, number> = { OPEN: 0, IN_PROGRESS: 0, VERIFICATION_NEEDED: 0, CLOSED: 0, REJECTED: 0 };
  const perDivision: Record<string, { name: string; total: number; closed: number; onTime: number; bonus: number }> = {};
  let closedCount = 0;
  let onTimeCount = 0;

  for (const i of all) {
    byStatus[i.status] = (byStatus[i.status] || 0) + 1;
    const d = (perDivision[i.divisionId] ||= { name: i.division.name, total: 0, closed: 0, onTime: 0, bonus: 0 });
    d.total++;
    if (i.status === 'CLOSED') {
      d.closed++;
      d.bonus += i.bonusPoints;
      closedCount++;
      if (i.actualDate && i.actualDate <= i.targetDate) { d.onTime++; onTimeCount++; }
    }
  }

  // Tren 6 bulan terakhir (jumlah perbaikan dibuat per bulan)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const now = new Date();
  const trend: { month: string; total: number; closed: number }[] = [];
  for (let m = 5; m >= 0; m--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - m + 1, 1);
    const inMonth = all.filter((i) => i.createdAt >= ref && i.createdAt < next);
    trend.push({
      month: `${monthNames[ref.getMonth()]} ${ref.getFullYear()}`,
      total: inMonth.length,
      closed: inMonth.filter((i) => i.status === 'CLOSED').length,
    });
  }

  return {
    total: all.length,
    byStatus,
    closedCount,
    onTimePercentage: closedCount > 0 ? Math.round((onTimeCount / closedCount) * 1000) / 10 : 0,
    totalBonus: Object.values(perDivision).reduce((a, d) => a + d.bonus, 0),
    perDivision: Object.values(perDivision).sort((a, b) => b.closed - a.closed),
    trend,
  };
}

// ============================================================
// Helper notifikasi (best-effort)
// ============================================================

function notifyDivisionHeads(divisionId: string, entityId: string, code: string, message: string): void {
  void prisma.user
    .findMany({ where: { role: 'KEPALA_DIVISI', divisionId, isActive: true }, select: { id: true } })
    .then((heads) => Promise.allSettled(heads.map((h) => notifyStatusChange(h.id, entityId, code, message))))
    .catch((e) => console.error('[notify] improvement heads:', e));
}
