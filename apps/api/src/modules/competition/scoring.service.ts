import { prisma } from '@/config/prisma';
import { AppError } from '@/middlewares/errorHandler';
import { cached, invalidateCache } from '@/config/cache';
import type { AuditPeriod, DivisionCategory } from '@prisma/client';

// ============================================================
// Bobot formula skor kompetisi divisi (jumlah = 1.00)
// ============================================================
export const WEIGHTS = {
  audit: 0.45,
  beforeAfter: 0.18,
  innovation: 0.09,
  consistency: 0.08,
  surprise: 0.10,
  environment: 0.10,
};

// Poin bonus tambahan (diskrit, ditambahkan di atas skor berbobot)
export const BONUS = {
  okrCompleted: 8,   // per OKR divisi dgn semua KR tercapai
  qccCompleted: 15,  // per proyek QCC selesai
  consistencyNoDrop: 5, // skor audit tidak turun dari periode lalu
};

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

export interface ScoreComponents {
  auditScore: number;
  beforeAfterScore: number;
  innovationBonus: number;
  consistencyScore: number;
  surpriseScore: number;
  environmentScore: number;
  baseScore: number;
}

async function computeComponents(
  divisionId: string,
  period: AuditPeriod,
  prevAuditScore: number | null
): Promise<ScoreComponents> {
  const audits = await prisma.auditSession.findMany({
    where: { divisionId, periodId: period.id, status: 'APPROVED', totalScore: { not: null } },
    select: { totalScore: true, type: true, surpriseMultiplier: true },
  });
  const auditScore = clamp(avg(audits.map((a) => a.totalScore as number)));

  const surprise = audits.filter((a) => a.type === 'SURPRISE');
  const surpriseScore = surprise.length
    ? clamp(avg(surprise.map((a) => (a.totalScore as number) * a.surpriseMultiplier)))
    : auditScore;

  const imps = await prisma.improvement.findMany({
    where: { divisionId, status: 'CLOSED', actualDate: { gte: period.startDate, lte: period.endDate } },
    select: { actualDate: true, targetDate: true, bonusPoints: true, isProperEvidence: true },
  });
  const onTime = imps.filter((i) => i.actualDate && i.actualDate <= i.targetDate).length;
  const beforeAfterScore = imps.length ? clamp((onTime / imps.length) * 100) : 0;
  const innovationBonus = clamp(imps.reduce((a, i) => a + i.bonusPoints, 0));
  const properCount = imps.filter((i) => i.isProperEvidence).length;
  const environmentScore = imps.length ? clamp((properCount / imps.length) * 100) : 50;

  const consistencyScore =
    prevAuditScore == null ? 75 : auditScore >= prevAuditScore ? 100 : clamp((auditScore / prevAuditScore) * 100);

  const baseScore = round1(
    auditScore * WEIGHTS.audit +
      beforeAfterScore * WEIGHTS.beforeAfter +
      innovationBonus * WEIGHTS.innovation +
      consistencyScore * WEIGHTS.consistency +
      surpriseScore * WEIGHTS.surprise +
      environmentScore * WEIGHTS.environment
  );

  return {
    auditScore: round1(auditScore),
    beforeAfterScore: round1(beforeAfterScore),
    innovationBonus: round1(innovationBonus),
    consistencyScore: round1(consistencyScore),
    surpriseScore: round1(surpriseScore),
    environmentScore: round1(environmentScore),
    baseScore,
  };
}

/** Poin bonus diskrit: OKR 100% (+8/ea), QCC selesai (+15/ea), konsistensi no-drop (+5). */
async function computeBonus(
  divisionId: string,
  period: AuditPeriod,
  auditScore: number,
  prevAuditScore: number | null
): Promise<number> {
  // OKR divisi dgn SEMUA key result COMPLETED
  const okrs = await prisma.oKR.findMany({
    where: { level: 'DIVISION', divisionId },
    include: { keyResults: { select: { status: true } } },
  });
  const okrCompleted = okrs.filter((o) => o.keyResults.length > 0 && o.keyResults.every((k) => k.status === 'COMPLETED')).length;

  // Proyek QCC selesai pada rentang periode
  const qccCompleted = await prisma.qCCProject.count({
    where: { divisionId, status: 'COMPLETED', completedAt: { gte: period.startDate, lte: period.endDate } },
  });

  const noDrop = prevAuditScore != null && auditScore >= prevAuditScore ? 1 : 0;

  return round1(okrCompleted * BONUS.okrCompleted + qccCompleted * BONUS.qccCompleted + noDrop * BONUS.consistencyNoDrop);
}

async function getPrevScore(divisionId: string, period: AuditPeriod, companyId: string) {
  const prevPeriod = await prisma.auditPeriod.findFirst({
    where: { companyId, endDate: { lt: period.startDate } },
    orderBy: { endDate: 'desc' },
  });
  if (!prevPeriod) return null;
  return prisma.divisionScore.findUnique({
    where: { divisionId_periodId: { divisionId, periodId: prevPeriod.id } },
    select: { auditScore: true, totalScore: true },
  });
}

export async function recomputePeriodScores(periodId: string, companyId: string) {
  const period = await prisma.auditPeriod.findFirst({ where: { id: periodId, companyId } });
  if (!period) throw new AppError('Periode audit tidak ditemukan', 404);

  const divisions = await prisma.division.findMany({
    where: { department: { plant: { companyId } } },
    select: { id: true, category: true },
  });

  // progres periode (untuk proyeksi)
  const now = new Date();
  const span = period.endDate.getTime() - period.startDate.getTime();
  const elapsed = clamp(((now.getTime() - period.startDate.getTime()) / (span || 1)) * 100) / 100; // 0..1

  for (const div of divisions) {
    const prev = await getPrevScore(div.id, period, companyId);
    const c = await computeComponents(div.id, period, prev?.auditScore ?? null);
    const bonusPoints = await computeBonus(div.id, period, c.auditScore, prev?.auditScore ?? null);
    const totalScore = round1(c.baseScore + bonusPoints);

    // Proyeksi: campuran skor saat ini & periode lalu, bobot makin ke "saat ini" seiring periode berjalan
    const projectedScore =
      prev?.totalScore != null ? round1(totalScore * (0.5 + 0.5 * elapsed) + prev.totalScore * (0.5 - 0.5 * elapsed)) : totalScore;

    await prisma.divisionScore.upsert({
      where: { divisionId_periodId: { divisionId: div.id, periodId } },
      create: { divisionId: div.id, periodId, rankCategory: div.category, ...c, bonusPoints, totalScore, projectedScore },
      update: { rankCategory: div.category, ...c, bonusPoints, totalScore, projectedScore },
    });
  }

  // Ranking per kategori berdasarkan totalScore (sudah termasuk bonus)
  const categories: DivisionCategory[] = ['PRODUKSI', 'KANTOR', 'GUDANG'];
  for (const cat of categories) {
    const scores = await prisma.divisionScore.findMany({
      where: { periodId, rankCategory: cat },
      orderBy: { totalScore: 'desc' },
      select: { id: true },
    });
    await Promise.all(scores.map((s, idx) => prisma.divisionScore.update({ where: { id: s.id }, data: { rank: idx + 1 } })));
  }

  await invalidateCache(`lb:${companyId}:${periodId}:*`); // segarkan cache setelah hitung ulang
  return getLeaderboard(periodId, companyId);
}

/** Leaderboard + delta vs periode sebelumnya (di-cache 30 detik di Redis). */
export async function getLeaderboard(periodId: string, companyId: string, category?: DivisionCategory) {
  return cached(`lb:${companyId}:${periodId}:${category ?? 'all'}`, 30, () => buildLeaderboard(periodId, companyId, category));
}

async function buildLeaderboard(periodId: string, companyId: string, category?: DivisionCategory) {
  const period = await prisma.auditPeriod.findFirst({ where: { id: periodId, companyId } });
  if (!period) throw new AppError('Periode tidak ditemukan', 404);

  const scores = await prisma.divisionScore.findMany({
    where: {
      periodId,
      division: { department: { plant: { companyId } } },
      ...(category && { rankCategory: category }),
    },
    include: { division: { select: { id: true, name: true, code: true, category: true } } },
    orderBy: [{ rankCategory: 'asc' }, { rank: 'asc' }],
  });

  // delta vs periode sebelumnya
  const prevPeriod = await prisma.auditPeriod.findFirst({
    where: { companyId, endDate: { lt: period.startDate } },
    orderBy: { endDate: 'desc' },
  });
  const prevMap = new Map<string, number>();
  if (prevPeriod) {
    const prevScores = await prisma.divisionScore.findMany({
      where: { periodId: prevPeriod.id },
      select: { divisionId: true, totalScore: true },
    });
    prevScores.forEach((p) => prevMap.set(p.divisionId, p.totalScore));
  }

  return scores.map((s) => ({
    ...s,
    delta: prevMap.has(s.divisionId) ? round1(s.totalScore - (prevMap.get(s.divisionId) as number)) : null,
  }));
}
