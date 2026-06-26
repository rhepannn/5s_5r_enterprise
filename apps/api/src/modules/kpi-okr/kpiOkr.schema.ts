import { z } from 'zod';

// ============ OKR ============
export const createOkrSchema = z.object({
  level: z.enum(['COMPANY', 'DIVISION']),
  divisionId: z.string().optional(),
  objective: z.string().min(5, 'Objective minimal 5 karakter'),
  quarter: z.string().regex(/^\d{4}-Q[1-4]$/, 'Format kuartal: 2026-Q2'),
  keyResults: z.array(z.object({
    title: z.string().min(3),
    target: z.number().positive(),
    unit: z.string().min(1),
  })).min(1, 'Minimal 1 Key Result'),
}).refine((d) => d.level === 'COMPANY' || !!d.divisionId, {
  message: 'OKR level DIVISION wajib pilih divisi', path: ['divisionId'],
});

export const updateKeyResultSchema = z.object({
  actual: z.number().nonnegative(),
});

// ============ KPI ============
export const createKpiSchema = z.object({
  divisionId: z.string().optional(),
  pilar: z.enum(['RINGKAS', 'RAPI', 'RESIK', 'RAWAT', 'RAJIN']),
  indicator: z.string().min(3),
  target: z.number().positive(),
  unit: z.string().default('%'),
  period: z.string().min(1),
});

export type CreateOkrInput = z.infer<typeof createOkrSchema>;
export type CreateKpiInput = z.infer<typeof createKpiSchema>;
