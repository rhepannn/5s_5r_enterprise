import { z } from 'zod';

export const updateCriteriaSchema = z.object({
  period: z.string().min(1),
  scores: z.record(z.enum(['COMPLIANT', 'PARTIAL', 'NON_COMPLIANT', 'NA'])),
  targetRank: z.enum(['EMAS', 'HIJAU', 'BIRU', 'MERAH', 'HITAM']).optional(),
});

export const balanceSchema = z.object({
  period: z.string().min(1, 'Periode wajib (mis. 2026-06)'),
  type: z.enum(['LIMBAH_B3', 'LIMBAH_NON_B3', 'AIR', 'ENERGI']),
  data: z.record(z.any()),
});

export const permitSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(2),
  number: z.string().min(1),
  issueDate: z.string().datetime(),
  expiryDate: z.string().datetime(),
  fileUrl: z.string().optional(),
  notes: z.string().optional(),
});

export type BalanceInput = z.infer<typeof balanceSchema>;
export type PermitInput = z.infer<typeof permitSchema>;
