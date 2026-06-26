import cron from 'node-cron';
import { generateDueSessions, sendDueReminders } from '@/modules/audit/schedule.service';
import { sendWeeklyDigests } from '@/modules/reports/digest.service';
import { notifyExpiringPermits } from '@/modules/proper/proper.service';
import { escalateOverdueImprovements } from '@/modules/before-after/escalation.service';

/**
 * Daftarkan cron jobs audit. Dipanggil sekali saat server start.
 * - Generate sesi audit dari jadwal recurring: setiap hari 00:30
 * - Kirim reminder H-3/H-1/hari-H: setiap hari 07:00
 */
export function initScheduler(): void {
  cron.schedule('30 0 * * *', () => {
    generateDueSessions().catch((e) => console.error('[cron:generate]', e));
  });

  cron.schedule('0 7 * * *', () => {
    sendDueReminders().catch((e) => console.error('[cron:reminder]', e));
  });

  // Digest mingguan — Senin 08:00
  cron.schedule('0 8 * * 1', () => {
    sendWeeklyDigests().catch((e) => console.error('[cron:digest]', e));
  });

  // Cek izin lingkungan kadaluarsa — tiap hari 09:00
  cron.schedule('0 9 * * *', () => {
    notifyExpiringPermits().catch((e) => console.error('[cron:permit]', e));
  });

  // Eskalasi perbaikan terlambat (H+3 PIC, H+7 Kepala, H+14 Admin) — tiap hari 08:30
  cron.schedule('30 8 * * *', () => {
    escalateOverdueImprovements().catch((e) => console.error('[cron:escalation]', e));
  });

  console.log('[scheduler] Cron terdaftar — generate 00:30, reminder 07:00, digest Senin 08:00, izin 09:00, eskalasi 08:30 (timezone server)');
}
