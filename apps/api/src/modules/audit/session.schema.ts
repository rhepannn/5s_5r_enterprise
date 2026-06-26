import { z } from 'zod';

export const createSessionSchema = z.object({
  type: z.enum(['MANDIRI', 'INTERNAL', 'CROSS', 'SURPRISE']),
  areaId: z.string().min(1, 'Area wajib dipilih'),
  auditorId: z.string().min(1, 'Auditor wajib dipilih'),
  periodId: z.string().min(1, 'Periode wajib dipilih'),
  scheduledAt: z.string().datetime(),
  notes: z.string().optional(),
});

export const updateItemsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().cuid(),
        score: z.number().int().min(1).max(5).nullable().optional(),
        notes: z.string().max(1000).optional(),
      })
    )
    .min(1, 'Minimal 1 item'),
});

export const rejectSchema = z.object({
  reason: z.string().min(3, 'Alasan penolakan wajib diisi').max(500),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateItemsInput = z.infer<typeof updateItemsSchema>;
