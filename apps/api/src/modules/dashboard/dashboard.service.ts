import { prisma } from '@/config/prisma';
import { cached } from '@/config/cache';

const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

const scope = (companyId: string) => ({ division: { department: { plant: { companyId } } } });

export type HeatBand = 'green' | 'yellow' | 'red' | 'none';
export function scoreBand(score: number | null): HeatBand {
  if (score == null) return 'none';
  if (score >= 85) return 'green';
  if (score >= 70) return 'yellow';
  return 'red';
}

// ============================================================
// Ringkasan eksekutif
// ============================================================
export async function getExecutiveSummary(companyId: string, periodId?: string) {
  // Key di-cache pakai input periodId → cache HIT = nol query DB (resolusi periode di dalam)
  return cached(`dash:${companyId}:${periodId ?? 'active'}`, 60, async () => {
    const period = periodId
      ? await prisma.auditPeriod.findFirst({ where: { id: periodId, companyId } })
      : (await prisma.auditPeriod.findFirst({ where: { companyId, isActive: true }, orderBy: { startDate: 'desc' } })) ||
        (await prisma.auditPeriod.findFirst({ where: { companyId }, orderBy: { startDate: 'desc' } }));
    const now = new Date();
    // Gelombang 1: semua query independen paralel
    const [periodScores, prevPeriod, kpis, okrs, overdueAudits, lateImprovements, periods] = await Promise.all([
      period ? prisma.divisionScore.findMany({ where: { periodId: period.id, division: { department: { plant: { companyId } } } }, select: { totalScore: true } }) : Promise.resolve([]),
      period ? prisma.auditPeriod.findFirst({ where: { companyId, endDate: { lt: period.startDate } }, orderBy: { endDate: 'desc' } }) : Promise.resolve(null),
      prisma.kPITarget.findMany({ where: { companyId }, select: { target: true, actual: true } }),
      prisma.oKR.findMany({ where: { companyId }, include: { keyResults: { select: { status: true } } } }),
      prisma.auditSession.count({ where: { ...scope(companyId), scheduledAt: { lt: now }, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } } }),
      prisma.improvement.count({ where: { ...scope(companyId), targetDate: { lt: now }, status: { notIn: ['CLOSED', 'REJECTED'] } } }),
      prisma.auditPeriod.findMany({ where: { companyId }, orderBy: { startDate: 'asc' }, take: 6 }),
    ]);

    const companyAvg = round1(avg(periodScores.map((s) => s.totalScore)));

    // Gelombang 2: skor periode lain (delta + trend) paralel
    const [prevScores, ...trendScores] = await Promise.all([
      prevPeriod ? prisma.divisionScore.findMany({ where: { periodId: prevPeriod.id }, select: { totalScore: true } }) : Promise.resolve([] as { totalScore: number }[]),
      ...periods.map((p) => prisma.divisionScore.findMany({ where: { periodId: p.id }, select: { totalScore: true } })),
    ]);

    const delta = prevScores.length ? round1(companyAvg - avg(prevScores.map((s) => s.totalScore))) : null;
    const kpiAchievement = kpis.length ? round1(avg(kpis.map((k) => (k.target > 0 ? Math.min(100, ((k.actual ?? 0) / k.target) * 100) : 0)))) : 0;
    const allKrs = okrs.flatMap((o) => o.keyResults);
    const okrProgress = allKrs.length ? round1((allKrs.filter((k) => k.status === 'COMPLETED').length / allKrs.length) * 100) : 0;
    const trend = periods.map((p, i) => ({ period: p.name, avgScore: trendScores[i].length ? round1(avg(trendScores[i].map((s) => s.totalScore))) : 0 }));

    return {
      period: period ? { id: period.id, name: period.name } : null,
      companyAvg, companyBand: scoreBand(companyAvg || null), delta, kpiAchievement, okrProgress, overdueAudits, lateImprovements, trend,
    };
  });
}

// ============================================================
// Heatmap area (warna per skor)
// ============================================================
export async function getAreaHeatmap(companyId: string) {
  const areas = await prisma.workArea.findMany({
    where: { ...scope(companyId), isActive: true },
    include: {
      division: { select: { name: true, category: true } },
      audits: { where: { status: 'APPROVED', totalScore: { not: null } }, select: { totalScore: true } },
    },
    orderBy: { name: 'asc' },
  });

  return areas.map((a) => {
    const scores = a.audits.map((x) => x.totalScore as number);
    const score = scores.length ? round1(avg(scores)) : null;
    return {
      id: a.id, name: a.name, code: a.code,
      division: a.division.name, category: a.division.category,
      score, band: scoreBand(score), auditCount: scores.length,
    };
  });
}

// ============================================================
// Gap analysis: area dgn skor rendah berulang (<70)
// ============================================================
export async function getGapAnalysis(companyId: string) {
  const areas = await prisma.workArea.findMany({
    where: { ...scope(companyId), isActive: true },
    include: {
      division: { select: { name: true } },
      audits: { where: { status: 'APPROVED', totalScore: { not: null } }, select: { totalScore: true, completedAt: true } },
    },
  });

  return areas
    .map((a) => {
      const scores = a.audits.map((x) => x.totalScore as number);
      const lowCount = scores.filter((s) => s < 70).length;
      const avgScore = scores.length ? round1(avg(scores)) : null;
      return { id: a.id, name: a.name, division: a.division.name, avgScore, lowCount, totalAudits: scores.length };
    })
    .filter((g) => g.lowCount >= 2 || (g.avgScore != null && g.avgScore < 70))
    .sort((a, b) => b.lowCount - a.lowCount || (a.avgScore ?? 99) - (b.avgScore ?? 99));
}

// ============================================================
// Statistik individu
// ============================================================
export async function getIndividualStats(companyId: string) {
  const users = await prisma.user.findMany({
    where: { companyId, isActive: true },
    select: {
      id: true, name: true, role: true,
      _count: { select: { audits: true, improvements: true, badges: true } },
    },
  });

  return users
    .map((u) => ({
      id: u.id, name: u.name, role: u.role,
      auditsConducted: u._count.audits,
      improvementsSubmitted: u._count.improvements,
      badges: u._count.badges,
    }))
    .sort((a, b) => b.auditsConducted + b.improvementsSubmitted - (a.auditsConducted + a.improvementsSubmitted));
}
