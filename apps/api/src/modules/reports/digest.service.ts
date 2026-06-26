import { prisma } from '@/config/prisma';
import { getExecutiveSummary } from '@/modules/dashboard/dashboard.service';
import { sendEmail } from '@/modules/notifications/notification.service';

/** Kirim ringkasan mingguan ke admin tiap perusahaan (dipanggil cron). */
export async function sendWeeklyDigests(): Promise<number> {
  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  let sent = 0;

  for (const c of companies) {
    const admins = await prisma.user.findMany({
      where: { companyId: c.id, role: { in: ['SUPERADMIN', 'ADMIN_5S'] }, isActive: true },
      select: { email: true },
    });
    if (admins.length === 0) continue;

    const s = await getExecutiveSummary(c.id);
    const deltaStr = s.delta == null ? '' : s.delta >= 0 ? ` (▲ ${s.delta})` : ` (▼ ${Math.abs(s.delta)})`;
    const html = `
      <h2>Ringkasan Mingguan 5S — ${c.name}</h2>
      <p>Periode: <strong>${s.period?.name ?? '-'}</strong></p>
      <ul>
        <li>Skor rata-rata perusahaan: <strong>${s.companyAvg}</strong>${deltaStr}</li>
        <li>Pencapaian KPI: <strong>${s.kpiAchievement}%</strong></li>
        <li>Progress OKR: <strong>${s.okrProgress}%</strong></li>
        <li>⚠️ Audit terlambat: <strong>${s.overdueAudits}</strong></li>
        <li>⚠️ Perbaikan lewat target: <strong>${s.lateImprovements}</strong></li>
      </ul>
      <p>Buka aplikasi 5S Enterprise untuk detail lengkap.</p>`;

    for (const a of admins) {
      if (await sendEmail(a.email, `Digest Mingguan 5S — ${c.name}`, html)) sent++;
    }
  }

  if (sent > 0) console.log(`[digest] ${sent} email digest mingguan terkirim`);
  return sent;
}
