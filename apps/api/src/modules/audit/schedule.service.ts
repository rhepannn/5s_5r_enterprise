import { prisma } from '@/config/prisma';
import { AppError } from '@/middlewares/errorHandler';
import { sendAuditReminder } from '@/modules/notifications/notification.service';
import type { CreateScheduleInput } from './schedule.schema';
import type { ScheduleFrequency } from '@prisma/client';

// ============================================================
// Perhitungan jadwal berikutnya
// ============================================================

export function computeNextRun(
  frequency: ScheduleFrequency,
  opts: { dayOfMonth?: number | null; dayOfWeek?: number | null; hour: number },
  from: Date = new Date()
): Date {
  const next = new Date(from);
  next.setHours(opts.hour, 0, 0, 0);

  if (frequency === 'WEEKLY') {
    const target = opts.dayOfWeek ?? 1;
    let diff = (target - next.getDay() + 7) % 7;
    if (diff === 0 && next <= from) diff = 7;
    next.setDate(next.getDate() + diff);
  } else if (frequency === 'MONTHLY') {
    const dom = opts.dayOfMonth ?? 1;
    next.setDate(dom);
    if (next <= from) {
      next.setMonth(next.getMonth() + 1);
      next.setDate(dom);
    }
  } else {
    // QUARTERLY — bulan kuartal (Jan/Apr/Jul/Okt = index 0,3,6,9)
    const dom = opts.dayOfMonth ?? 1;
    next.setDate(dom);
    let guard = 0;
    while ((next <= from || next.getMonth() % 3 !== 0) && guard < 24) {
      next.setMonth(next.getMonth() + 1);
      next.setDate(dom);
      guard++;
    }
  }
  return next;
}

// ============================================================
// CRUD
// ============================================================

function companyScope(companyId: string) {
  return { area: { division: { department: { plant: { companyId } } } } };
}

export async function listSchedules(companyId: string) {
  return prisma.auditSchedule.findMany({
    where: companyScope(companyId),
    include: {
      area: { select: { name: true, code: true } },
      division: { select: { name: true } },
      auditor: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createSchedule(companyId: string, input: CreateScheduleInput) {
  const area = await prisma.workArea.findFirst({
    where: { id: input.areaId, division: { department: { plant: { companyId } } } },
  });
  if (!area) throw new AppError('Area kerja tidak ditemukan', 404);

  const auditor = await prisma.user.findFirst({ where: { id: input.auditorId, companyId } });
  if (!auditor) throw new AppError('Auditor tidak ditemukan', 404);

  const nextRunAt = computeNextRun(input.frequency, input);

  return prisma.auditSchedule.create({
    data: {
      name: input.name,
      type: input.type,
      frequency: input.frequency,
      dayOfMonth: input.dayOfMonth ?? null,
      dayOfWeek: input.dayOfWeek ?? null,
      hour: input.hour,
      areaId: area.id,
      divisionId: area.divisionId,
      auditorId: input.auditorId,
      periodId: input.periodId ?? null,
      nextRunAt,
    },
  });
}

export async function updateSchedule(id: string, companyId: string, input: Record<string, unknown>) {
  const sch = await prisma.auditSchedule.findFirst({ where: { id, ...companyScope(companyId) } });
  if (!sch) throw new AppError('Jadwal tidak ditemukan', 404);

  const merged = { ...sch, ...input };
  const nextRunAt = computeNextRun(merged.frequency as ScheduleFrequency, {
    dayOfMonth: merged.dayOfMonth as number | null,
    dayOfWeek: merged.dayOfWeek as number | null,
    hour: merged.hour as number,
  });

  return prisma.auditSchedule.update({
    where: { id },
    data: { ...input, nextRunAt },
  });
}

export async function deleteSchedule(id: string, companyId: string) {
  const sch = await prisma.auditSchedule.findFirst({ where: { id, ...companyScope(companyId) } });
  if (!sch) throw new AppError('Jadwal tidak ditemukan', 404);
  return prisma.auditSchedule.delete({ where: { id } });
}

// ============================================================
// Generator otomatis (dipanggil cron)
// ============================================================

export async function generateDueSessions(): Promise<number> {
  const now = new Date();
  const due = await prisma.auditSchedule.findMany({
    where: { isActive: true, OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }] },
    include: { area: { include: { division: { include: { department: { include: { plant: true } } } } } } },
  });

  let created = 0;
  for (const sch of due) {
    // Tentukan periode: pakai periodId jadwal, atau cari periode aktif perusahaan
    let periodId = sch.periodId;
    if (!periodId) {
      const companyId = sch.area.division.department.plant.companyId;
      const active = await prisma.auditPeriod.findFirst({
        where: { companyId, isActive: true },
        orderBy: { startDate: 'desc' },
      });
      periodId = active?.id ?? null;
    }
    if (!periodId) {
      console.warn(`[scheduler] Skip jadwal ${sch.id} — tidak ada periode aktif`);
      continue;
    }

    const templates = await prisma.checklistTemplate.findMany({
      where: { areaCategory: sch.area.category, isActive: true },
      orderBy: [{ pilar: 'asc' }, { sortOrder: 'asc' }],
    });
    if (templates.length === 0) {
      console.warn(`[scheduler] Skip jadwal ${sch.id} — tidak ada template untuk ${sch.area.category}`);
      continue;
    }

    await prisma.auditSession.create({
      data: {
        type: sch.type,
        status: 'SCHEDULED',
        scheduledAt: sch.nextRunAt ?? now,
        surpriseMultiplier: sch.type === 'SURPRISE' ? 1.2 : 1.0,
        areaId: sch.areaId,
        divisionId: sch.divisionId,
        auditorId: sch.auditorId,
        periodId,
        checklistItems: {
          create: templates.map((t) => ({
            pilar: t.pilar, question: t.question, isProperTag: t.isProperTag, isoClause: t.isoClause, templateId: t.id,
          })),
        },
      },
    });

    const nextRunAt = computeNextRun(sch.frequency, sch, sch.nextRunAt ?? now);
    await prisma.auditSchedule.update({ where: { id: sch.id }, data: { lastRunAt: now, nextRunAt } });
    created++;
  }

  if (created > 0) console.log(`[scheduler] ${created} sesi audit dibuat otomatis`);
  return created;
}

// ============================================================
// Reminder H-3 / H-1 / hari-H (dipanggil cron harian)
// ============================================================

export async function sendDueReminders(): Promise<number> {
  const now = new Date();
  let sent = 0;

  for (const days of [3, 1, 0]) {
    const target = new Date(now);
    target.setDate(target.getDate() + days);
    const dayStart = new Date(target); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(target); dayEnd.setHours(23, 59, 59, 999);

    const sessions = await prisma.auditSession.findMany({
      where: { status: 'SCHEDULED', scheduledAt: { gte: dayStart, lte: dayEnd } },
      include: { area: { select: { name: true } } },
    });

    for (const s of sessions) {
      await sendAuditReminder(s, days);
      sent++;
    }
  }

  if (sent > 0) console.log(`[scheduler] ${sent} reminder audit dikirim`);
  return sent;
}
