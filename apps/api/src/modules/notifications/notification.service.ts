import fs from 'fs';
import admin from 'firebase-admin';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '@/config/env';
import { prisma } from '@/config/prisma';

// ============================================================
// Inisialisasi (resilient — nyala otomatis saat kredensial diisi)
// ============================================================

let fcmReady = false;
try {
  // Prioritas: file path (disarankan) → JSON inline
  let saRaw = '';
  if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    saRaw = fs.readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf-8');
  } else if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    saRaw = env.FIREBASE_SERVICE_ACCOUNT_JSON;
  }

  if (saRaw) {
    const serviceAccount = JSON.parse(saRaw);
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    fcmReady = true;
    console.log('[FCM] Push notification aktif');
  } else {
    console.warn('[FCM] Service account kosong — push notification nonaktif');
  }
} catch (err) {
  console.error('[FCM] Gagal inisialisasi:', (err as Error).message);
}

let transporter: Transporter | null = null;
if (env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  console.log('[Email] SMTP aktif');
} else {
  console.warn('[Email] SMTP_HOST kosong — email nonaktif');
}

// ============================================================
// Primitif kirim
// ============================================================

export async function sendPush(
  fcmToken: string | null | undefined,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  if (!fcmReady || !fcmToken) {
    if (!fcmReady) console.log(`[FCM:skip] ${title} — ${body}`);
    return false;
  }
  try {
    await admin.messaging().send({ token: fcmToken, notification: { title, body }, data });
    return true;
  } catch (err) {
    console.error('[FCM] Gagal kirim:', (err as Error).message);
    return false;
  }
}

/** WhatsApp Business API (opsional) — resilient: aktif saat WA_API_URL/TOKEN diisi. */
export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  if (!env.WA_API_URL || !env.WA_API_TOKEN || !phone) {
    if (!env.WA_API_URL) console.log(`[WA:skip] -> ${phone}: ${message.slice(0, 40)}`);
    return false;
  }
  try {
    await fetch(env.WA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.WA_API_TOKEN}` },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: message } }),
    });
    return true;
  } catch (err) {
    console.error('[WA] Gagal kirim:', (err as Error).message);
    return false;
  }
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!transporter || !to) {
    if (!transporter) console.log(`[Email:skip] -> ${to}: ${subject}`);
    return false;
  }
  try {
    await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, html });
    return true;
  } catch (err) {
    console.error('[Email] Gagal kirim:', (err as Error).message);
    return false;
  }
}

// ============================================================
// Notifikasi berorientasi domain
// ============================================================

/** Kirim push + email ke seorang user (lookup fcmToken & email otomatis). */
export async function notifyUser(
  userId: string,
  payload: { title: string; body: string; html?: string; data?: Record<string, string> }
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, fcmToken: true, isActive: true },
  });
  if (!user || !user.isActive) return;

  await Promise.allSettled([
    sendPush(user.fcmToken, payload.title, payload.body, payload.data),
    sendEmail(user.email, payload.title, payload.html || `<p>${payload.body}</p>`),
  ]);
}

/** Reminder jadwal audit (H-3 / H-1 / hari-H) ke auditor. */
export async function sendAuditReminder(session: {
  id: string;
  auditorId: string;
  scheduledAt: Date;
  area: { name: string };
}, daysUntil: number): Promise<void> {
  const when = daysUntil === 0 ? 'HARI INI' : `dalam ${daysUntil} hari`;
  const title = `Pengingat Audit 5S — ${when}`;
  const body = `Audit area "${session.area.name}" dijadwalkan ${when}.`;
  const html = `
    <h2>Pengingat Audit 5S</h2>
    <p>Anda memiliki jadwal audit:</p>
    <ul>
      <li><strong>Area:</strong> ${session.area.name}</li>
      <li><strong>Jadwal:</strong> ${session.scheduledAt.toLocaleString('id-ID')}</li>
      <li><strong>Waktu:</strong> ${when}</li>
    </ul>
    <p>Silakan buka aplikasi 5S Enterprise untuk memulai audit.</p>`;

  await notifyUser(session.auditorId, { title, body, html, data: { sessionId: session.id, type: 'AUDIT_REMINDER' } });
}

/** Notifikasi perubahan status (mis. perlu review / disetujui / ditolak). */
export async function notifyStatusChange(
  userId: string,
  sessionId: string,
  areaName: string,
  message: string
): Promise<void> {
  await notifyUser(userId, {
    title: 'Update Status Audit',
    body: `${areaName}: ${message}`,
    html: `<p><strong>${areaName}</strong></p><p>${message}</p>`,
    data: { sessionId, type: 'AUDIT_STATUS' },
  });
}

export const notificationStatus = () => ({ fcm: fcmReady, email: transporter !== null });
