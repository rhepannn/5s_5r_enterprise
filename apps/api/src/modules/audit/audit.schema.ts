import { z } from 'zod';

const periodBaseSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.enum(['MONTHLY', 'QUARTERLY', 'SEMESTER', 'ANNUAL']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export const createPeriodSchema = periodBaseSchema.refine(
  (d) => new Date(d.startDate) < new Date(d.endDate),
  { message: 'Tanggal mulai harus sebelum tanggal akhir', path: ['endDate'] }
);

export const updatePeriodSchema = periodBaseSchema.partial();

export const createChecklistTemplateSchema = z.object({
  name: z.string().min(2).max(200),
  areaCategory: z.enum(['PRODUKSI', 'KANTOR', 'GUDANG', 'LABORATORIUM', 'OUTDOOR']),
  pilar: z.enum(['RINGKAS', 'RAPI', 'RESIK', 'RAWAT', 'RAJIN']),
  question: z.string().min(5).max(500),
  guidance: z.string().optional(),
  isProperTag: z.boolean().default(false),
  isoClause: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

export const updateChecklistTemplateSchema = createChecklistTemplateSchema.partial();

export const bulkCreateChecklistSchema = z.object({
  items: z.array(createChecklistTemplateSchema).min(1).max(200),
});

export type CreatePeriodInput = z.infer<typeof createPeriodSchema>;
export type CreateChecklistTemplateInput = z.infer<typeof createChecklistTemplateSchema>;
