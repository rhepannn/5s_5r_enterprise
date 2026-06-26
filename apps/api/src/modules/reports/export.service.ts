import ExcelJS from 'exceljs';
import { prisma } from '@/config/prisma';
import { AppError } from '@/middlewares/errorHandler';

const scope = (companyId: string) => ({ division: { department: { plant: { companyId } } } });

function styleHeader(sheet: ExcelJS.Worksheet) {
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
}

async function toBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  const ab = await wb.xlsx.writeBuffer();
  return Buffer.from(ab as ArrayBuffer);
}

const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString('id-ID') : '-');

export async function exportAudits(companyId: string): Promise<Buffer> {
  const sessions = await prisma.auditSession.findMany({
    where: scope(companyId),
    include: { area: true, division: true, auditor: true, period: true },
    orderBy: { scheduledAt: 'desc' },
  });
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Audit');
  sheet.columns = [
    { header: 'Area', key: 'area', width: 25 },
    { header: 'Divisi', key: 'div', width: 22 },
    { header: 'Tipe', key: 'type', width: 12 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Auditor', key: 'auditor', width: 22 },
    { header: 'Periode', key: 'period', width: 14 },
    { header: 'Skor', key: 'score', width: 10 },
    { header: 'Dijadwalkan', key: 'sched', width: 14 },
    { header: 'Selesai', key: 'done', width: 14 },
  ];
  sessions.forEach((s) => sheet.addRow({
    area: s.area.name, div: s.division.name, type: s.type, status: s.status,
    auditor: s.auditor.name, period: s.period.name, score: s.totalScore ?? '-',
    sched: fmtDate(s.scheduledAt), done: fmtDate(s.completedAt),
  }));
  styleHeader(sheet);
  return toBuffer(wb);
}

export async function exportImprovements(companyId: string): Promise<Buffer> {
  const imps = await prisma.improvement.findMany({
    where: scope(companyId),
    include: { division: true, pic: true },
    orderBy: { createdAt: 'desc' },
  });
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Before-After');
  sheet.columns = [
    { header: 'Kode', key: 'code', width: 20 },
    { header: 'Divisi', key: 'div', width: 22 },
    { header: 'Kategori', key: 'cat', width: 14 },
    { header: 'Deskripsi', key: 'desc', width: 40 },
    { header: 'PIC', key: 'pic', width: 20 },
    { header: 'Status', key: 'status', width: 18 },
    { header: 'Target', key: 'target', width: 14 },
    { header: 'Selesai', key: 'actual', width: 14 },
    { header: 'Tepat Waktu', key: 'ontime', width: 12 },
    { header: 'PROPER', key: 'proper', width: 9 },
    { header: 'Bonus', key: 'bonus', width: 8 },
  ];
  imps.forEach((i) => sheet.addRow({
    code: i.code, div: i.division.name, cat: i.problemCategory, desc: i.description, pic: i.pic.name,
    status: i.status, target: fmtDate(i.targetDate), actual: fmtDate(i.actualDate),
    ontime: i.actualDate ? (i.actualDate <= i.targetDate ? 'Ya' : 'Tidak') : '-',
    proper: i.isProperEvidence ? 'Ya' : '-', bonus: i.bonusPoints,
  }));
  styleHeader(sheet);
  return toBuffer(wb);
}

export async function exportKpi(companyId: string): Promise<Buffer> {
  const kpis = await prisma.kPITarget.findMany({ where: { companyId }, include: { division: true } });
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('KPI');
  sheet.columns = [
    { header: 'Pilar', key: 'pilar', width: 12 },
    { header: 'Indikator', key: 'ind', width: 35 },
    { header: 'Divisi', key: 'div', width: 22 },
    { header: 'Target', key: 'target', width: 12 },
    { header: 'Aktual', key: 'actual', width: 12 },
    { header: 'Unit', key: 'unit', width: 8 },
    { header: 'Periode', key: 'period', width: 12 },
  ];
  kpis.forEach((k) => sheet.addRow({
    pilar: k.pilar, ind: k.indicator, div: k.division?.name ?? 'Perusahaan',
    target: k.target, actual: k.actual ?? '-', unit: k.unit, period: k.period,
  }));
  styleHeader(sheet);
  return toBuffer(wb);
}

export async function exportLeaderboard(companyId: string, periodId: string): Promise<Buffer> {
  const scores = await prisma.divisionScore.findMany({
    where: { periodId, division: { department: { plant: { companyId } } } },
    include: { division: true },
    orderBy: [{ rankCategory: 'asc' }, { rank: 'asc' }],
  });
  if (scores.length === 0) throw new AppError('Belum ada skor untuk periode ini', 400);
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Leaderboard');
  sheet.columns = [
    { header: 'Kategori', key: 'cat', width: 12 },
    { header: 'Rank', key: 'rank', width: 7 },
    { header: 'Divisi', key: 'div', width: 24 },
    { header: 'Total', key: 'total', width: 10 },
    { header: 'Audit', key: 'audit', width: 9 },
    { header: 'B/A', key: 'ba', width: 9 },
    { header: 'Inovasi', key: 'inov', width: 9 },
    { header: 'Konsist.', key: 'cons', width: 9 },
    { header: 'Surprise', key: 'surp', width: 9 },
    { header: 'Lingk.', key: 'env', width: 9 },
    { header: 'Bonus', key: 'bonus', width: 9 },
  ];
  scores.forEach((s) => sheet.addRow({
    cat: s.rankCategory, rank: s.rank, div: s.division.name, total: s.totalScore,
    audit: s.auditScore, ba: s.beforeAfterScore, inov: s.innovationBonus,
    cons: s.consistencyScore, surp: s.surpriseScore, env: s.environmentScore, bonus: s.bonusPoints,
  }));
  styleHeader(sheet);
  return toBuffer(wb);
}
