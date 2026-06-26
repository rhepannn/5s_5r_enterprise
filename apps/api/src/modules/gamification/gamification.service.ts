import { prisma } from '@/config/prisma';
import { AppError } from '@/middlewares/errorHandler';
import type { Prisma } from '@prisma/client';

const impScope = (companyId: string): Prisma.ImprovementWhereInput => ({ division: { department: { plant: { companyId } } } });

// ============================================================
// BADGE ENGINE
// ============================================================
interface BadgeStats { audits: number; improvements: number; closedImprovements: number; properImprovements: number; kaizenIdeas: number }

export const BADGES = [
  { code: 'PEJUANG_5S', name: 'Pejuang 5S', desc: 'Melakukan ≥ 5 audit', icon: '🛡️', check: (s: BadgeStats) => s.audits >= 5 },
  { code: 'AUDITOR_TELADAN', name: 'Auditor Teladan', desc: 'Melakukan ≥ 15 audit', icon: '🏅', check: (s: BadgeStats) => s.audits >= 15 },
  { code: 'RAJA_PERBAIKAN', name: 'Raja Perbaikan', desc: '≥ 5 perbaikan ditutup', icon: '👑', check: (s: BadgeStats) => s.closedImprovements >= 5 },
  { code: 'INOVATOR', name: 'Inovator', desc: '≥ 3 ide Kaizen', icon: '💡', check: (s: BadgeStats) => s.kaizenIdeas >= 3 },
  { code: 'PENJAGA_LINGKUNGAN', name: 'Penjaga Lingkungan', desc: '≥ 3 perbaikan PROPER', icon: '🌱', check: (s: BadgeStats) => s.properImprovements >= 3 },
  { code: 'KONTRIBUTOR_AKTIF', name: 'Kontributor Aktif', desc: '≥ 10 total kontribusi', icon: '⭐', check: (s: BadgeStats) => s.audits + s.improvements >= 10 },
];
const BADGE_MAP = Object.fromEntries(BADGES.map((b) => [b.code, b]));

/** Hitung & berikan badge yang memenuhi syarat (auto-award). */
export async function computeBadges(companyId: string): Promise<number> {
  const users = await prisma.user.findMany({
    where: { companyId, isActive: true },
    select: { id: true, _count: { select: { audits: true, improvements: true, kaizenIdeas: true } } },
  });
  let awarded = 0;
  for (const u of users) {
    const [closed, proper, existing] = await Promise.all([
      prisma.improvement.count({ where: { picId: u.id, status: 'CLOSED' } }),
      prisma.improvement.count({ where: { picId: u.id, isProperEvidence: true } }),
      prisma.userBadge.findMany({ where: { userId: u.id }, select: { badgeType: true } }),
    ]);
    const stats: BadgeStats = { audits: u._count.audits, improvements: u._count.improvements, closedImprovements: closed, properImprovements: proper, kaizenIdeas: u._count.kaizenIdeas };
    const have = new Set(existing.map((e) => e.badgeType));
    for (const b of BADGES) {
      if (b.check(stats) && !have.has(b.code)) { await prisma.userBadge.create({ data: { userId: u.id, badgeType: b.code } }); awarded++; }
    }
  }
  return awarded;
}

export async function listBadges(companyId: string) {
  const badges = await prisma.userBadge.findMany({
    where: { user: { companyId } },
    include: { user: { select: { name: true, role: true } } },
    orderBy: { earnedAt: 'desc' },
  });
  return badges.map((b) => ({
    id: b.id, userName: b.user.name, role: b.user.role, earnedAt: b.earnedAt,
    badge: BADGE_MAP[b.badgeType] || { code: b.badgeType, name: b.badgeType, icon: '🏆', desc: '' },
  }));
}

export async function getMyBadges(userId: string) {
  const badges = await prisma.userBadge.findMany({ where: { userId }, orderBy: { earnedAt: 'desc' } });
  const earned = new Set(badges.map((b) => b.badgeType));
  return BADGES.map((b) => ({ ...b, earned: earned.has(b.code), earnedAt: badges.find((x) => x.badgeType === b.code)?.earnedAt ?? null }));
}

// ============================================================
// WALL OF FAME
// ============================================================
export async function getWallOfFame(companyId: string) {
  const bestPhotos = await prisma.improvement.findMany({
    where: { ...impScope(companyId), status: 'CLOSED', photoAfter: { isEmpty: false } },
    select: { id: true, code: true, description: true, photoBefore: true, photoAfter: true, division: { select: { name: true } } },
    take: 12, orderBy: { actualDate: 'desc' },
  });
  const period = await prisma.auditPeriod.findFirst({ where: { companyId }, orderBy: { startDate: 'desc' } });
  const champions = period
    ? await prisma.divisionScore.findMany({ where: { periodId: period.id, rank: 1 }, include: { division: { select: { name: true, category: true } } }, orderBy: { totalScore: 'desc' } })
    : [];
  return { bestPhotos, champions: champions.map((c) => ({ division: c.division.name, category: c.division.category, score: c.totalScore })), period: period?.name };
}

// ============================================================
// BEST PRACTICE LIBRARY
// ============================================================
export async function markBestPractice(id: string, companyId: string, value: boolean) {
  const imp = await prisma.improvement.findFirst({ where: { id, ...impScope(companyId) } });
  if (!imp) throw new AppError('Perbaikan tidak ditemukan', 404);
  return prisma.improvement.update({ where: { id }, data: { isBestPractice: value } });
}

export async function listBestPractices(companyId: string, problemCategory?: string) {
  return prisma.improvement.findMany({
    where: { ...impScope(companyId), isBestPractice: true, ...(problemCategory && { problemCategory: problemCategory as Prisma.ImprovementWhereInput['problemCategory'] }) },
    select: { id: true, code: true, description: true, rootCause: true, actions: true, problemCategory: true, pilarTags: true, photoBefore: true, photoAfter: true, division: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

// ============================================================
// ANNUAL AWARD
// ============================================================
export async function getAnnualAward(companyId: string, year?: string) {
  const y = year || String(new Date().getFullYear());
  const period = await prisma.auditPeriod.findFirst({
    where: { companyId, OR: [{ name: { contains: y } }] },
    orderBy: { startDate: 'desc' },
  }) || await prisma.auditPeriod.findFirst({ where: { companyId }, orderBy: { startDate: 'desc' } });

  if (!period) return { year: y, period: null, winners: [] };
  const scores = await prisma.divisionScore.findMany({
    where: { periodId: period.id, rank: { lte: 3 } },
    include: { division: { select: { name: true, category: true } } },
    orderBy: [{ rankCategory: 'asc' }, { rank: 'asc' }],
  });
  return {
    year: y, period: period.name,
    winners: scores.map((s) => ({ category: s.rankCategory, rank: s.rank, division: s.division.name, score: s.totalScore })),
  };
}

// ============================================================
// SMART SUGGESTIONS (rule-based — bukan AI/ML)
// ============================================================
export async function getSuggestions(companyId: string) {
  const suggestions: { title: string; detail: string; priority: 'tinggi' | 'sedang' | 'rendah' }[] = [];

  // Pilar terlemah dari skor item audit
  const items = await prisma.auditChecklistItem.findMany({
    where: { score: { not: null }, session: { status: 'APPROVED', division: { department: { plant: { companyId } } } } },
    select: { pilar: true, score: true },
  });
  if (items.length > 0) {
    const byPilar: Record<string, number[]> = {};
    items.forEach((i) => { (byPilar[i.pilar] ||= []).push(i.score as number); });
    const avgs = Object.entries(byPilar).map(([p, arr]) => ({ pilar: p, avg: arr.reduce((a, b) => a + b, 0) / arr.length }));
    avgs.sort((a, b) => a.avg - b.avg);
    const weakest = avgs[0];
    if (weakest && weakest.avg < 4) {
      suggestions.push({ title: `Fokus perbaikan pilar ${weakest.pilar}`, detail: `Rata-rata skor pilar ${weakest.pilar} hanya ${weakest.avg.toFixed(1)}/5 — terendah. Prioritaskan pelatihan & perbaikan di area ini.`, priority: 'tinggi' });
    }
  }

  // Audit overdue
  const overdue = await prisma.auditSession.count({ where: { division: { department: { plant: { companyId } } }, scheduledAt: { lt: new Date() }, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } } });
  if (overdue > 0) suggestions.push({ title: `${overdue} audit terlambat`, detail: 'Segera selesaikan audit yang melewati jadwal untuk menjaga konsistensi skor.', priority: overdue > 3 ? 'tinggi' : 'sedang' });

  // Perbaikan lewat target
  const late = await prisma.improvement.count({ where: { ...impScope(companyId), targetDate: { lt: new Date() }, status: { notIn: ['CLOSED', 'REJECTED'] } } });
  if (late > 0) suggestions.push({ title: `${late} perbaikan lewat target`, detail: 'Tindak lanjuti perbaikan yang melewati target agar % tepat waktu naik.', priority: 'sedang' });

  // Area belum pernah diaudit
  const areasNoAudit = await prisma.workArea.count({ where: { isActive: true, division: { department: { plant: { companyId } } }, audits: { none: { status: 'APPROVED' } } } });
  if (areasNoAudit > 0) suggestions.push({ title: `${areasNoAudit} area belum pernah diaudit`, detail: 'Jadwalkan audit untuk area yang belum memiliki skor agar cakupan lengkap.', priority: 'rendah' });

  if (suggestions.length === 0) suggestions.push({ title: 'Performa baik 👍', detail: 'Tidak ada isu mendesak terdeteksi. Pertahankan konsistensi.', priority: 'rendah' });
  return suggestions;
}

// ============================================================
// DIGITAL TWIN — FLOOR PLAN
// ============================================================
export async function listFloorPlans(companyId: string) {
  return prisma.floorPlan.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } });
}
export async function createFloorPlan(companyId: string, name: string, imageUrl: string) {
  return prisma.floorPlan.create({ data: { companyId, name, imageUrl, pins: [] } });
}
export async function updatePins(id: string, companyId: string, pins: unknown[]) {
  const fp = await prisma.floorPlan.findFirst({ where: { id, companyId } });
  if (!fp) throw new AppError('Denah tidak ditemukan', 404);
  return prisma.floorPlan.update({ where: { id }, data: { pins: pins as Prisma.InputJsonValue } });
}
export async function deleteFloorPlan(id: string, companyId: string) {
  const fp = await prisma.floorPlan.findFirst({ where: { id, companyId } });
  if (!fp) throw new AppError('Denah tidak ditemukan', 404);
  return prisma.floorPlan.delete({ where: { id } });
}
