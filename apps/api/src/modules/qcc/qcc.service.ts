import { prisma } from '@/config/prisma';
import { AppError } from '@/middlewares/errorHandler';
import { logTrail, type TrailActor } from '@/modules/audit/auditTrail.service';
import type { CreateQccInput, UpdateQccInput } from './qcc.schema';
import type { Prisma, QCCStatus } from '@prisma/client';

const PDCA_ORDER: QCCStatus[] = ['PLAN', 'DO', 'CHECK', 'ACT', 'COMPLETED'];
const scope = (companyId: string): Prisma.QCCProjectWhereInput => ({ division: { department: { plant: { companyId } } } });

const include = {
  division: { select: { id: true, name: true, category: true } },
  _count: { select: { improvements: true } },
} satisfies Prisma.QCCProjectInclude;

export async function listQcc(companyId: string, filters: { status?: string; divisionId?: string }) {
  return prisma.qCCProject.findMany({
    where: {
      ...scope(companyId),
      ...(filters.status && { status: filters.status as QCCStatus }),
      ...(filters.divisionId && { divisionId: filters.divisionId }),
    },
    include,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getQccById(id: string, companyId: string) {
  const qcc = await prisma.qCCProject.findFirst({
    where: { id, ...scope(companyId) },
    include: { ...include, improvements: { select: { id: true, code: true, status: true } } },
  });
  if (!qcc) throw new AppError('Proyek QCC tidak ditemukan', 404);
  return qcc;
}

export async function createQcc(companyId: string, input: CreateQccInput, actor: TrailActor) {
  const division = await prisma.division.findFirst({ where: { id: input.divisionId, department: { plant: { companyId } } } });
  if (!division) throw new AppError('Divisi tidak ditemukan', 404);

  const qcc = await prisma.qCCProject.create({
    data: {
      title: input.title,
      divisionId: input.divisionId,
      problemDesc: input.problemDesc,
      members: input.members,
      startDate: new Date(input.startDate),
      targetDate: new Date(input.targetDate),
      rootCause: input.rootCause ?? null,
      savingCost: input.savingCost ?? null,
      status: 'PLAN',
    },
    include,
  });
  await logTrail({ entity: 'QCCProject', entityId: qcc.id, action: 'CREATE', toStatus: 'PLAN', actor });
  return qcc;
}

export async function updateQcc(id: string, companyId: string, input: UpdateQccInput, actor: TrailActor) {
  await getQccById(id, companyId);
  const updated = await prisma.qCCProject.update({
    where: { id },
    data: {
      ...(input.title && { title: input.title }),
      ...(input.problemDesc && { problemDesc: input.problemDesc }),
      ...(input.members && { members: input.members }),
      ...(input.rootCause !== undefined && { rootCause: input.rootCause }),
      ...(input.solution !== undefined && { solution: input.solution }),
      ...(input.savingCost !== undefined && { savingCost: input.savingCost }),
      ...(input.targetDate && { targetDate: new Date(input.targetDate) }),
    },
    include,
  });
  await logTrail({ entity: 'QCCProject', entityId: id, action: 'UPDATE', actor });
  return updated;
}

/** Maju ke tahap PDCA berikutnya. */
export async function advanceStage(id: string, companyId: string, actor: TrailActor) {
  const qcc = await getQccById(id, companyId);
  const idx = PDCA_ORDER.indexOf(qcc.status);
  if (idx >= PDCA_ORDER.length - 1) throw new AppError('Proyek sudah pada tahap akhir (COMPLETED)', 400);

  const next = PDCA_ORDER[idx + 1];
  const updated = await prisma.qCCProject.update({
    where: { id },
    data: { status: next, ...(next === 'COMPLETED' && { completedAt: new Date() }) },
    include,
  });
  await logTrail({ entity: 'QCCProject', entityId: id, action: 'STAGE_ADVANCE', fromStatus: qcc.status, toStatus: next, actor });
  return updated;
}

/** Simpan data 7 QCC tools (fishbone, pareto, control chart, dll). */
export async function saveTools(id: string, companyId: string, toolsData: Record<string, unknown>, actor: TrailActor) {
  await getQccById(id, companyId);
  const updated = await prisma.qCCProject.update({
    where: { id },
    data: { toolsData: toolsData as Prisma.InputJsonValue },
    include,
  });
  await logTrail({ entity: 'QCCProject', entityId: id, action: 'TOOLS_UPDATE', actor });
  return updated;
}

export async function deleteQcc(id: string, companyId: string) {
  const qcc = await getQccById(id, companyId);
  if (qcc.status === 'COMPLETED') throw new AppError('Proyek selesai tidak dapat dihapus', 400);
  return prisma.qCCProject.delete({ where: { id } });
}

export async function getStats(companyId: string) {
  const projects = await prisma.qCCProject.findMany({
    where: scope(companyId),
    select: { status: true, savingCost: true, bonusPoints: true },
  });
  const byStatus: Record<string, number> = { PLAN: 0, DO: 0, CHECK: 0, ACT: 0, COMPLETED: 0 };
  let totalSaving = 0;
  let totalBonus = 0;
  for (const p of projects) {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    if (p.status === 'COMPLETED') {
      totalSaving += p.savingCost ?? 0;
      totalBonus += p.bonusPoints;
    }
  }
  return {
    total: projects.length,
    active: projects.length - byStatus.COMPLETED,
    completed: byStatus.COMPLETED,
    totalSaving,
    totalBonus,
    byStatus,
  };
}
