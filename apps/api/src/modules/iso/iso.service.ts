import { prisma } from '@/config/prisma';
import { AppError } from '@/middlewares/errorHandler';
import { getExecutiveSummary } from '@/modules/dashboard/dashboard.service';
import type { IsoStandard, Prisma } from '@prisma/client';

const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const ALL_STANDARDS: IsoStandard[] = ['ISO_9001', 'ISO_14001', 'ISO_45001'];

// ============================================================
// Seed klausul referensi (lazy, global)
// ============================================================
const DEFAULT_CLAUSES: { standard: IsoStandard; code: string; title: string; description: string }[] = [
  // ISO 9001 — Mutu
  { standard: 'ISO_9001', code: '7.1.3', title: 'Infrastruktur', description: 'Penyediaan & pemeliharaan infrastruktur (5S area kerja)' },
  { standard: 'ISO_9001', code: '7.1.4', title: 'Lingkungan operasi proses', description: 'Kondisi lingkungan kerja yang sesuai' },
  { standard: 'ISO_9001', code: '7.5', title: 'Informasi terdokumentasi', description: 'Dokumentasi prosedur & rekaman' },
  { standard: 'ISO_9001', code: '8.5.1', title: 'Pengendalian produksi & jasa', description: 'Kondisi terkendali area produksi' },
  { standard: 'ISO_9001', code: '8.7', title: 'Pengendalian ketidaksesuaian', description: 'Penanganan output tidak sesuai' },
  { standard: 'ISO_9001', code: '10.2', title: 'Ketidaksesuaian & tindakan korektif', description: 'Perbaikan & pencegahan berulang' },
  // ISO 14001 — Lingkungan
  { standard: 'ISO_14001', code: '6.1.2', title: 'Aspek lingkungan', description: 'Identifikasi aspek & dampak lingkungan' },
  { standard: 'ISO_14001', code: '7.5', title: 'Informasi terdokumentasi', description: 'Dokumentasi sistem manajemen lingkungan' },
  { standard: 'ISO_14001', code: '8.1', title: 'Perencanaan & pengendalian operasi', description: 'Pengelolaan limbah, kebersihan, 3R' },
  { standard: 'ISO_14001', code: '8.2', title: 'Kesiagaan & tanggap darurat', description: 'Kesiapan situasi darurat lingkungan' },
  { standard: 'ISO_14001', code: '9.1', title: 'Pemantauan & pengukuran', description: 'Monitoring kinerja lingkungan' },
  // ISO 45001 — K3
  { standard: 'ISO_45001', code: '6.1.2', title: 'Identifikasi bahaya & penilaian risiko', description: 'HIRADC area kerja' },
  { standard: 'ISO_45001', code: '7.2', title: 'Kompetensi', description: 'Kompetensi & pelatihan K3' },
  { standard: 'ISO_45001', code: '8.1.2', title: 'Menghilangkan bahaya & mengurangi risiko', description: 'Hierarki pengendalian (5S, rambu, APD)' },
  { standard: 'ISO_45001', code: '8.2', title: 'Kesiagaan & tanggap darurat', description: 'Kesiapan darurat K3' },
  { standard: 'ISO_45001', code: '7.4', title: 'Komunikasi', description: 'Komunikasi K3 & rambu keselamatan' },
];

async function ensureClauses(): Promise<void> {
  const count = await prisma.isoClause.count();
  if (count === 0) await prisma.isoClause.createMany({ data: DEFAULT_CLAUSES, skipDuplicates: true });
}

export async function listClauses(standard?: IsoStandard) {
  await ensureClauses();
  return prisma.isoClause.findMany({
    where: { isActive: true, ...(standard && { standard }) },
    orderBy: [{ standard: 'asc' }, { code: 'asc' }],
  });
}

// ============================================================
// Tagging perbaikan ke klausul (multi-tag)
// ============================================================
export async function tagImprovement(improvementId: string, companyId: string, clauses: string[]) {
  const imp = await prisma.improvement.findFirst({
    where: { id: improvementId, division: { department: { plant: { companyId } } } },
  });
  if (!imp) throw new AppError('Perbaikan tidak ditemukan', 404);
  return prisma.improvement.update({ where: { id: improvementId }, data: { isoClauses: clauses } });
}

// ============================================================
// Status compliance per standar
// ============================================================
export async function getComplianceStatus(companyId: string, standard: IsoStandard) {
  const clauses = await listClauses(standard);

  const imps = await prisma.improvement.findMany({
    where: { division: { department: { plant: { companyId } } }, isoClauses: { isEmpty: false } },
    select: { isoClauses: true, status: true },
  });
  const items = await prisma.auditChecklistItem.findMany({
    where: { isoClause: { not: null }, session: { status: 'APPROVED', division: { department: { plant: { companyId } } } } },
    select: { isoClause: true, score: true },
  });

  const result = clauses.map((c) => {
    const impEv = imps.filter((i) => i.isoClauses.includes(c.code));
    const auditEv = items.filter((i) => i.isoClause === c.code);
    const evidenceCount = impEv.length + auditEv.length;
    return {
      id: c.id, code: c.code, title: c.title, description: c.description,
      improvements: impEv.length,
      closedImprovements: impEv.filter((i) => i.status === 'CLOSED').length,
      auditItems: auditEv.length,
      evidenceCount,
      covered: evidenceCount > 0,
    };
  });

  const covered = result.filter((r) => r.covered).length;
  return { standard, total: clauses.length, covered, coverage: clauses.length ? round1((covered / clauses.length) * 100) : 0, clauses: result };
}

// ============================================================
// Readiness audit ISO (dari tren skor 5S + coverage)
// ============================================================
export async function getReadiness(companyId: string) {
  const summary = await getExecutiveSummary(companyId);
  const coverages = [];
  for (const s of ALL_STANDARDS) {
    const c = await getComplianceStatus(companyId, s);
    coverages.push({ standard: s, coverage: c.coverage, covered: c.covered, total: c.total });
  }
  const avgCoverage = round1(avg(coverages.map((c) => c.coverage)));
  const readinessScore = round1(summary.companyAvg * 0.5 + avgCoverage * 0.5);
  const level = readinessScore >= 85 ? 'Siap' : readinessScore >= 70 ? 'Cukup Siap' : 'Belum Siap';
  return { companyAvg: summary.companyAvg, avgCoverage, readinessScore, level, coverages, trend: summary.trend };
}

// ============================================================
// Potensi Non-Conformance (NC)
// ============================================================
export async function getPotentialNCs(companyId: string) {
  const now = new Date();
  const lowItems = await prisma.auditChecklistItem.findMany({
    where: {
      isoClause: { not: null }, score: { lte: 2 },
      session: { status: 'APPROVED', division: { department: { plant: { companyId } } } },
    },
    select: { id: true, isoClause: true, score: true, question: true, session: { select: { area: { select: { name: true } }, division: { select: { name: true } } } } },
    take: 50,
  });

  const badImps = await prisma.improvement.findMany({
    where: {
      division: { department: { plant: { companyId } } },
      isoClauses: { isEmpty: false },
      OR: [
        { status: 'REJECTED' },
        { AND: [{ status: { notIn: ['CLOSED', 'REJECTED'] } }, { targetDate: { lt: now } }] },
      ],
    },
    select: { id: true, code: true, isoClauses: true, status: true, description: true, division: { select: { name: true } } },
    take: 50,
  });

  return {
    count: lowItems.length + badImps.length,
    lowScoreItems: lowItems.map((i) => ({ id: i.id, clause: i.isoClause, score: i.score, question: i.question, area: i.session.area.name, division: i.session.division.name })),
    problematicImprovements: badImps.map((i) => ({ id: i.id, code: i.code, clauses: i.isoClauses, status: i.status, description: i.description, division: i.division.name })),
  };
}

// ============================================================
// Evidence package (1-klik): semua bukti per klausul untuk satu standar
// ============================================================
export async function getEvidencePackage(companyId: string, standard: IsoStandard) {
  const clauses = await listClauses(standard);
  const scope: Prisma.ImprovementWhereInput = { division: { department: { plant: { companyId } } } };

  const pkg = [];
  for (const c of clauses) {
    const improvements = await prisma.improvement.findMany({
      where: { ...scope, isoClauses: { has: c.code } },
      select: { code: true, description: true, status: true, photoBefore: true, photoAfter: true, division: { select: { name: true } } },
    });
    const auditItems = await prisma.auditChecklistItem.findMany({
      where: { isoClause: c.code, session: { status: 'APPROVED', division: { department: { plant: { companyId } } } } },
      select: { question: true, score: true, photos: true, session: { select: { area: { select: { name: true } } } } },
      take: 20,
    });
    pkg.push({ clause: c.code, title: c.title, improvements, auditItems });
  }
  return { standard, generatedAt: new Date(), clauses: pkg };
}
