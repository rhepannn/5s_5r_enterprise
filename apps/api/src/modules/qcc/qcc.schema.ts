import { z } from 'zod';

export const createQccSchema = z.object({
  title: z.string().min(3, 'Judul minimal 3 karakter'),
  divisionId: z.string().min(1, 'Divisi wajib dipilih'),
  problemDesc: z.string().min(5, 'Deskripsi masalah wajib diisi'),
  members: z.array(z.string()).min(1, 'Minimal 1 anggota'),
  startDate: z.string().datetime(),
  targetDate: z.string().datetime(),
  rootCause: z.string().optional(),
  savingCost: z.number().nonnegative().optional(),
});

export const updateQccSchema = z.object({
  title: z.string().min(3).optional(),
  problemDesc: z.string().min(5).optional(),
  members: z.array(z.string()).optional(),
  rootCause: z.string().optional(),
  solution: z.string().optional(),
  savingCost: z.number().nonnegative().optional(),
  targetDate: z.string().datetime().optional(),
});

export const toolsSchema = z.object({
  toolsData: z.record(z.any()),
});

export type CreateQccInput = z.infer<typeof createQccSchema>;
export type UpdateQccInput = z.infer<typeof updateQccSchema>;
