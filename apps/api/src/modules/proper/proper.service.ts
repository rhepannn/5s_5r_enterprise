import ExcelJS from 'exceljs';
import { prisma } from '@/config/prisma';
import { AppError } from '@/middlewares/errorHandler';
import type { BalanceInput, PermitInput } from './proper.schema';
import type { ProperRank, PermitStatus, BalanceType, Prisma } from '@prisma/client';

// ============================================================
// Kriteria PROPER (ketaatan wajib + beyond compliance)
// ============================================================
export const PROPER_CRITERIA = [
  { code: 'AMDAL', category: 'KETAATAN', name: 'Dokumen Lingkungan (AMDAL/UKL-UPL)' },
  { code: 'AIR', category: 'KETAATAN', name: 'Pengendalian Pencemaran Air' },
  { code: 'UDARA', category: 'KETAATAN', name: 'Pengendalian Pencemaran Udara' },
  { code: 'LB3', category: 'KETAATAN', name: 'Pengelolaan Limbah B3' },
  { code: 'LNB3', category: 'KETAATAN', name: 'Pengelolaan Limbah Non-B3' },
  { code: 'SML', category: 'BEYOND', name: 'Sistem Manajemen Lingkungan (ISO 14001)' },
  { code: 'EF_ENERGI', category: 'BEYOND', name: 'Efisiensi Energi' },
  { code: 'EF_AIR', category: 'BEYOND', name: 'Efisiensi Air' },
  { code: '3R_LB3', category: 'BEYOND', name: '3R Limbah B3' },
  { code: '3R_LNB3', category: 'BEYOND', name: '3R Limbah Non-B3' },
  { code: 'KEHATI', category: 'BEYOND', name: 'Keanekaragaman Hayati' },
  { code: 'CSR', category: 'BEYOND', name: 'Pemberdayaan Masyarakat (CSR)' },
] as const;

const RANK_ORDER: ProperRank[] = ['HITAM', 'MERAH', 'BIRU', 'HIJAU', 'EMAS'];

type CritStatus = 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | 'NA';

/** Proyeksi peringkat PROPER (rule-based) dari status kriteria. */
export function projectRank(scores: Record<string, CritStatus>): ProperRank {
  const ketaatan = PROPER_CRITERIA.filter((c) => c.category === 'KETAATAN');
  const beyond = PROPER_CRITERIA.filter((c) => c.category === 'BEYOND');
  const ketaatanStatus = ketaatan.map((c) => scores[c.code] || 'NON_COMPLIANT');

  if (ketaatanStatus.some((s) => s === 'NON_COMPLIANT')) return 'MERAH';
  if (ketaatanStatus.every((s) => s === 'COMPLIANT')) {
    const beyondGreen = beyond.filter((c) => scores[c.code] === 'COMPLIANT').length;
    if (beyondGreen >= 6) return 'EMAS';
    if (beyondGreen >= 3) return 'HIJAU';
    return 'BIRU';
  }
  return 'BIRU';
}

// ============================================================
// Dashboard PROPER
// ============================================================
export async function getDashboard(companyId: string, period?: string) {
  const p = period || String(new Date().getFullYear());
  let score = await prisma.properScore.findFirst({ where: { companyId, period: p } });
  if (!score) {
    score = await prisma.properScore.create({
      data: { companyId, period: p, currentRank: 'BIRU', targetRank: 'HIJAU', scores: {} },
    });
  }
  const scores = (score.scores as Record<string, CritStatus>) || {};
  const criteria = PROPER_CRITERIA.map((c) => {
    const status = scores[c.code] || 'NA';
    const light = status === 'COMPLIANT' ? 'green' : status === 'PARTIAL' ? 'yellow' : status === 'NON_COMPLIANT' ? 'red' : 'gray';
    return { ...c, status, light };
  });
  const projectedRank = projectRank(scores);

  return {
    period: p,
    currentRank: score.currentRank,
    targetRank: score.targetRank,
    projectedRank,
    criteria,
    compliantCount: criteria.filter((c) => c.status === 'COMPLIANT').length,
    totalCriteria: criteria.length,
  };
}

export async function updateCriteria(companyId: string, period: string, scores: Record<string, CritStatus>, targetRank?: ProperRank) {
  const existing = await prisma.properScore.findFirst({ where: { companyId, period } });
  const projectedRank = projectRank(scores);
  const data = { scores: scores as Prisma.InputJsonValue, projectedRank, ...(targetRank && { targetRank }) };
  if (existing) return prisma.properScore.update({ where: { id: existing.id }, data });
  return prisma.properScore.create({ data: { companyId, period, currentRank: 'BIRU', targetRank: targetRank || 'HIJAU', ...data } });
}

// ============================================================
// Neraca lingkungan (B3 / non-B3 / air / energi)
// ============================================================
export async function listBalances(companyId: string, filters: { period?: string; type?: string }) {
  return prisma.environmentBalance.findMany({
    where: { companyId, ...(filters.period && { period: filters.period }), ...(filters.type && { type: filters.type as BalanceType }) },
    orderBy: [{ period: 'desc' }, { type: 'asc' }],
  });
}

export async function upsertBalance(companyId: string, input: BalanceInput) {
  const existing = await prisma.environmentBalance.findFirst({ where: { companyId, period: input.period, type: input.type } });
  if (existing) return prisma.environmentBalance.update({ where: { id: existing.id }, data: { data: input.data as Prisma.InputJsonValue } });
  return prisma.environmentBalance.create({ data: { companyId, period: input.period, type: input.type, data: input.data as Prisma.InputJsonValue } });
}

export async function deleteBalance(id: string, companyId: string) {
  const b = await prisma.environmentBalance.findFirst({ where: { id, companyId } });
  if (!b) throw new AppError('Neraca tidak ditemukan', 404);
  return prisma.environmentBalance.delete({ where: { id } });
}

// ============================================================
// Izin lingkungan + status kadaluarsa
// ============================================================
function computePermitStatus(expiry: Date): PermitStatus {
  const days = (expiry.getTime() - Date.now()) / 86400000;
  if (days < 0) return 'EXPIRED';
  if (days <= 60) return 'EXPIRING_SOON';
  return 'ACTIVE';
}

export async function listPermits(companyId: string) {
  const permits = await prisma.environmentPermit.findMany({ where: { companyId }, orderBy: { expiryDate: 'asc' } });
  // Sinkronkan status sesuai tanggal
  for (const p of permits) {
    const fresh = computePermitStatus(p.expiryDate);
    if (fresh !== p.status) { await prisma.environmentPermit.update({ where: { id: p.id }, data: { status: fresh } }); p.status = fresh; }
  }
  return permits;
}

export async function createPermit(companyId: string, input: PermitInput) {
  return prisma.environmentPermit.create({
    data: {
      companyId, type: input.type, name: input.name, number: input.number,
      issueDate: new Date(input.issueDate), expiryDate: new Date(input.expiryDate),
      fileUrl: input.fileUrl ?? null, notes: input.notes ?? null,
      status: computePermitStatus(new Date(input.expiryDate)),
    },
  });
}

export async function updatePermit(id: string, companyId: string, input: Partial<PermitInput>) {
  const p = await prisma.environmentPermit.findFirst({ where: { id, companyId } });
  if (!p) throw new AppError('Izin tidak ditemukan', 404);
  const expiryDate = input.expiryDate ? new Date(input.expiryDate) : p.expiryDate;
  return prisma.environmentPermit.update({
    where: { id },
    data: {
      ...(input.type && { type: input.type }), ...(input.name && { name: input.name }), ...(input.number && { number: input.number }),
      ...(input.issueDate && { issueDate: new Date(input.issueDate) }), ...(input.expiryDate && { expiryDate }),
      ...(input.notes !== undefined && { notes: input.notes }), status: computePermitStatus(expiryDate),
    },
  });
}

export async function deletePermit(id: string, companyId: string) {
  const p = await prisma.environmentPermit.findFirst({ where: { id, companyId } });
  if (!p) throw new AppError('Izin tidak ditemukan', 404);
  return prisma.environmentPermit.delete({ where: { id } });
}

// ============================================================
// Evidence bank PROPER
// ============================================================
export async function getEvidenceBank(companyId: string) {
  const improvements = await prisma.improvement.findMany({
    where: { isProperEvidence: true, division: { department: { plant: { companyId } } } },
    select: { id: true, code: true, description: true, status: true, photoAfter: true, division: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const permits = await prisma.environmentPermit.findMany({ where: { companyId, fileUrl: { not: null } }, select: { id: true, name: true, number: true, fileUrl: true } });
  return { improvements, permitDocs: permits, total: improvements.length + permits.length };
}

// ============================================================
// RKL-RPL triwulanan (data)
// ============================================================
export async function getRklRpl(companyId: string, period: string) {
  const p = period || String(new Date().getFullYear());
  const balances = await prisma.environmentBalance.findMany({ where: { companyId, period: { startsWith: p.split('-')[0] } } });
  const permits = await listPermits(companyId);
  const dashboard = await getDashboard(companyId, p.split('-')[0]);
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });
  return { company: company?.name, period, balances, permits, compliance: dashboard.criteria, generatedAt: new Date() };
}

// ============================================================
// Export SIMPEL KLHK (Excel) — neraca lingkungan terstruktur
// ============================================================
export async function exportSimpel(companyId: string, period?: string): Promise<Buffer> {
  const balances = await listBalances(companyId, period ? { period } : {});
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Neraca Lingkungan SIMPEL');
  sheet.columns = [
    { header: 'Periode', key: 'period', width: 12 },
    { header: 'Jenis', key: 'type', width: 18 },
    { header: 'Parameter', key: 'param', width: 25 },
    { header: 'Nilai', key: 'value', width: 15 },
    { header: 'Satuan', key: 'unit', width: 12 },
  ];
  for (const b of balances) {
    const d = b.data as Record<string, unknown>;
    const unit = (d.unit as string) || '';
    Object.entries(d).filter(([k]) => k !== 'unit').forEach(([param, value]) => {
      sheet.addRow({ period: b.period, type: b.type, param, value: value as never, unit });
    });
  }
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } };
  return Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
}

// ============================================================
// Notifikasi izin kadaluarsa (dipanggil cron)
// ============================================================
export async function notifyExpiringPermits(): Promise<number> {
  const { sendEmail } = await import('@/modules/notifications/notification.service');
  const soon = await prisma.environmentPermit.findMany({
    where: { expiryDate: { lte: new Date(Date.now() + 60 * 86400000) } },
    include: { company: { select: { id: true, name: true } } },
  });
  let sent = 0;
  // kelompokkan per perusahaan
  const byCompany = new Map<string, typeof soon>();
  for (const p of soon) { const arr = byCompany.get(p.companyId) || []; arr.push(p); byCompany.set(p.companyId, arr); }
  for (const [companyId, permits] of byCompany) {
    const admins = await prisma.user.findMany({ where: { companyId, role: { in: ['SUPERADMIN', 'ADMIN_5S'] }, isActive: true }, select: { email: true } });
    const rows = permits.map((p) => `<li>${p.name} (${p.number}) — kadaluarsa ${p.expiryDate.toLocaleDateString('id-ID')}</li>`).join('');
    const html = `<h3>Izin Lingkungan Akan/Sudah Kadaluarsa</h3><ul>${rows}</ul>`;
    for (const a of admins) if (await sendEmail(a.email, 'Pengingat Izin Lingkungan — 5S Enterprise', html)) sent++;
  }
  return sent;
}
