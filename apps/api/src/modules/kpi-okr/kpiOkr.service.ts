import { prisma } from '@/config/prisma';
import { AppError } from '@/middlewares/errorHandler';
import type { OKRStatus, PilarType } from '@prisma/client';
import type { CreateOkrInput, CreateKpiInput } from './kpiOkr.schema';

// ============================================================
// OKR
// ============================================================

/** Status Key Result otomatis dari rasio actual/target. */
export function krStatus(actual: number, target: number): OKRStatus {
  if (target <= 0) return 'ON_TRACK';
  const pct = actual / target;
  if (pct >= 1) return 'COMPLETED';
  if (pct >= 0.7) return 'ON_TRACK';
  if (pct >= 0.4) return 'AT_RISK';
  return 'BEHIND';
}

export async function listOkrs(companyId: string, filters: { quarter?: string; level?: string; divisionId?: string }) {
  return prisma.oKR.findMany({
    where: {
      companyId,
      ...(filters.quarter && { quarter: filters.quarter }),
      ...(filters.level && { level: filters.level as 'COMPANY' | 'DIVISION' }),
      ...(filters.divisionId && { divisionId: filters.divisionId }),
    },
    include: { keyResults: true, division: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createOkr(companyId: string, input: CreateOkrInput, isAdmin: boolean) {
  if (input.level === 'COMPANY' && !isAdmin) {
    throw new AppError('Hanya Admin yang dapat membuat OKR level perusahaan', 403);
  }
  if (input.level === 'DIVISION' && input.divisionId) {
    const div = await prisma.division.findFirst({ where: { id: input.divisionId, department: { plant: { companyId } } } });
    if (!div) throw new AppError('Divisi tidak ditemukan', 404);
  }

  return prisma.oKR.create({
    data: {
      level: input.level,
      companyId,
      divisionId: input.level === 'DIVISION' ? input.divisionId : null,
      objective: input.objective,
      quarter: input.quarter,
      keyResults: {
        create: input.keyResults.map((kr) => ({
          title: kr.title, target: kr.target, unit: kr.unit, actual: 0, status: 'ON_TRACK',
        })),
      },
    },
    include: { keyResults: true },
  });
}

export async function updateKeyResult(krId: string, companyId: string, actual: number) {
  const kr = await prisma.oKRKeyResult.findFirst({ where: { id: krId, okr: { companyId } } });
  if (!kr) throw new AppError('Key Result tidak ditemukan', 404);

  return prisma.oKRKeyResult.update({
    where: { id: krId },
    data: { actual, status: krStatus(actual, kr.target) },
  });
}

export async function deleteOkr(id: string, companyId: string) {
  const okr = await prisma.oKR.findFirst({ where: { id, companyId } });
  if (!okr) throw new AppError('OKR tidak ditemukan', 404);
  await prisma.oKRKeyResult.deleteMany({ where: { okrId: id } });
  return prisma.oKR.delete({ where: { id } });
}

// ============================================================
// KPI
// ============================================================

export async function listKpis(companyId: string, filters: { period?: string; divisionId?: string }) {
  return prisma.kPITarget.findMany({
    where: {
      companyId,
      ...(filters.period && { period: filters.period }),
      ...(filters.divisionId && { divisionId: filters.divisionId }),
    },
    include: { division: { select: { name: true } } },
    orderBy: [{ pilar: 'asc' }],
  });
}

export async function createKpi(companyId: string, input: CreateKpiInput) {
  if (input.divisionId) {
    const div = await prisma.division.findFirst({ where: { id: input.divisionId, department: { plant: { companyId } } } });
    if (!div) throw new AppError('Divisi tidak ditemukan', 404);
  }
  return prisma.kPITarget.create({
    data: {
      companyId,
      divisionId: input.divisionId ?? null,
      pilar: input.pilar,
      indicator: input.indicator,
      target: input.target,
      unit: input.unit,
      period: input.period,
    },
  });
}

export async function deleteKpi(id: string, companyId: string) {
  const kpi = await prisma.kPITarget.findFirst({ where: { id, companyId } });
  if (!kpi) throw new AppError('KPI tidak ditemukan', 404);
  return prisma.kPITarget.delete({ where: { id } });
}

/**
 * Hitung ulang "actual" tiap KPI dari data audit: rata-rata skor item checklist
 * untuk pilar terkait (audit APPROVED), dinormalisasi ke persen (skor/5*100).
 */
export async function recomputeKpiActuals(companyId: string) {
  const kpis = await prisma.kPITarget.findMany({ where: { companyId } });

  for (const kpi of kpis) {
    const items = await prisma.auditChecklistItem.findMany({
      where: {
        pilar: kpi.pilar as PilarType,
        score: { not: null },
        session: {
          status: 'APPROVED',
          ...(kpi.divisionId ? { divisionId: kpi.divisionId } : { division: { department: { plant: { companyId } } } }),
        },
      },
      select: { score: true },
    });

    const actual = items.length
      ? Math.round((items.reduce((a, i) => a + (i.score || 0), 0) / (items.length * 5)) * 1000) / 10
      : 0;

    await prisma.kPITarget.update({ where: { id: kpi.id }, data: { actual } });
  }

  return listKpis(companyId, {});
}
