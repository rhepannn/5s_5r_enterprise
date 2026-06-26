import { z } from 'zod';

const PILARS = ['RINGKAS', 'RAPI', 'RESIK', 'RAWAT', 'RAJIN'] as const;
const CATEGORIES = ['KEBERSIHAN', 'PENATAAN', 'PELABELAN', 'KESELAMATAN', 'EFISIENSI'] as const;

export const createImprovementSchema = z.object({
  divisionId: z.string().min(1, 'Divisi wajib dipilih'),
  problemCategory: z.enum(CATEGORIES),
  pilarTags: z.array(z.enum(PILARS)).min(1, 'Pilih minimal 1 pilar 5S'),
  description: z.string().min(5, 'Deskripsi minimal 5 karakter'),
  rootCause: z.string().min(3, 'Akar masalah wajib diisi'),
  actions: z.string().min(3, 'Tindakan perbaikan wajib diisi'),
  picId: z.string().min(1, 'PIC wajib dipilih'),
  targetDate: z.string().datetime(),
  estimatedCost: z.number().nonnegative().optional(),
  isoClause: z.string().optional(),
  isProperEvidence: z.boolean().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const updateImprovementSchema = z.object({
  problemCategory: z.enum(CATEGORIES).optional(),
  pilarTags: z.array(z.enum(PILARS)).min(1).optional(),
  description: z.string().min(5).optional(),
  rootCause: z.string().min(3).optional(),
  actions: z.string().min(3).optional(),
  picId: z.string().min(1).optional(),
  targetDate: z.string().datetime().optional(),
  estimatedCost: z.number().nonnegative().optional(),
  isoClause: z.string().optional(),
  isProperEvidence: z.boolean().optional(),
});

export const reasonSchema = z.object({ reason: z.string().min(3, 'Alasan wajib diisi').max(500) });

export type CreateImprovementInput = z.infer<typeof createImprovementSchema>;
export type UpdateImprovementInput = z.infer<typeof updateImprovementSchema>;
