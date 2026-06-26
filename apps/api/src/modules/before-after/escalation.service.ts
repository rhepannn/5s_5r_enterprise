import { prisma } from '@/config/prisma';
import { notifyUser } from '@/modules/notifications/notification.service';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Eskalasi perbaikan Before/After yang lewat target & belum selesai.
 * Tangga eskalasi (poin kritis spec): H+3 → PIC, H+7 → + Kepala Divisi, H+14 → + Admin 5S.
 * Setelah H+14, ulangi tiap 7 hari agar tetap jadi perhatian manajemen.
 * Dijalankan harian via cron; tiap ambang menembak sekali (berdasarkan selisih hari).
 */
export async function escalateOverdueImprovements(now: Date = new Date()): Promise<{
  scanned: number;
  escalated: number;
  byTier: Record<'PIC' | 'KEPALA' | 'ADMIN', number>;
}> {
  const overdue = await prisma.improvement.findMany({
    where: { targetDate: { lt: now }, status: { notIn: ['CLOSED', 'REJECTED'] } },
    select: {
      id: true, code: true, description: true, targetDate: true, picId: true, divisionId: true,
      division: { select: { name: true, department: { select: { plant: { select: { companyId: true } } } } } },
    },
  });

  const byTier = { PIC: 0, KEPALA: 0, ADMIN: 0 };
  let escalated = 0;

  for (const imp of overdue) {
    const days = Math.floor((now.getTime() - imp.targetDate.getTime()) / DAY);

    let tier: 'PIC' | 'KEPALA' | 'ADMIN' | null = null;
    if (days === 3) tier = 'PIC';
    else if (days === 7) tier = 'KEPALA';
    else if (days >= 14 && (days - 14) % 7 === 0) tier = 'ADMIN';
    if (!tier) continue;

    // Penerima kumulatif sesuai tingkat eskalasi
    const recipients = new Set<string>();
    if (imp.picId) recipients.add(imp.picId);

    if (tier === 'KEPALA' || tier === 'ADMIN') {
      const kepala = await prisma.user.findMany({
        where: { role: 'KEPALA_DIVISI', divisionId: imp.divisionId, isActive: true },
        select: { id: true },
      });
      kepala.forEach((u) => recipients.add(u.id));
    }
    if (tier === 'ADMIN') {
      const companyId = imp.division?.department?.plant?.companyId;
      if (companyId) {
        const admins = await prisma.user.findMany({
          where: { role: 'ADMIN_5S', companyId, isActive: true },
          select: { id: true },
        });
        admins.forEach((u) => recipients.add(u.id));
      }
    }

    const tierLabel = tier === 'PIC' ? 'PIC' : tier === 'KEPALA' ? 'Kepala Divisi' : 'Admin 5S';
    const label = imp.description.length > 60 ? `${imp.description.slice(0, 60)}…` : imp.description;
    const title = `Perbaikan Terlambat ${days} Hari — ${imp.code}`;
    const body = `"${label}" (${imp.division?.name ?? '-'}) telah lewat target ${days} hari. Eskalasi ke ${tierLabel}.`;
    const html = `<h2>Eskalasi Perbaikan Terlambat</h2>
      <p>Dokumen <strong>${imp.code}</strong> — ${label}</p>
      <ul>
        <li><strong>Divisi:</strong> ${imp.division?.name ?? '-'}</li>
        <li><strong>Terlambat:</strong> ${days} hari dari target</li>
        <li><strong>Tingkat eskalasi:</strong> ${tierLabel}</li>
      </ul>
      <p>Mohon segera ditindaklanjuti melalui aplikasi 5S Enterprise.</p>`;

    await Promise.all(
      [...recipients].map((uid) => notifyUser(uid, { title, body, html, data: { improvementId: imp.id, type: 'IMPROVEMENT_ESCALATION', tier } }))
    );

    byTier[tier]++;
    escalated++;
    console.log(`[escalation] ${imp.code} terlambat ${days} hari → ${tierLabel} (${recipients.size} penerima)`);
  }

  return { scanned: overdue.length, escalated, byTier };
}
