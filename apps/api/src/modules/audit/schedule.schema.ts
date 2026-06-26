import { z } from 'zod';

export const createScheduleSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(['MANDIRI', 'INTERNAL', 'CROSS', 'SURPRISE']).default('INTERNAL'),
  frequency: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY']),
  dayOfMonth: z.number().int().min(1).max(28).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  hour: z.number().int().min(0).max(23).default(8),
  areaId: z.string().min(1, 'Area wajib dipilih'),
  auditorId: z.string().min(1, 'Auditor wajib dipilih'),
  periodId: z.string().optional(),
}).refine(
  (d) => (d.frequency === 'WEEKLY' ? d.dayOfWeek !== undefined : d.dayOfMonth !== undefined),
  { message: 'WEEKLY butuh dayOfWeek; MONTHLY/QUARTERLY butuh dayOfMonth', path: ['frequency'] }
);

export const updateScheduleSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  type: z.enum(['MANDIRI', 'INTERNAL', 'CROSS', 'SURPRISE']).optional(),
  frequency: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY']).optional(),
  dayOfMonth: z.number().int().min(1).max(28).nullable().optional(),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  hour: z.number().int().min(0).max(23).optional(),
  auditorId: z.string().min(1).optional(),
  periodId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
