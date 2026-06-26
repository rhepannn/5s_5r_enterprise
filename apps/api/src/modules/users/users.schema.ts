import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  role: z.enum(['SUPERADMIN', 'ADMIN_5S', 'AUDITOR', 'KEPALA_DIVISI', 'PIC', 'ANGGOTA']),
  companyId: z.string().cuid(),
  divisionId: z.string().cuid().optional(),
  phone: z.string().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum(['SUPERADMIN', 'ADMIN_5S', 'AUDITOR', 'KEPALA_DIVISI', 'PIC', 'ANGGOTA']).optional(),
  divisionId: z.string().cuid().nullable().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const listUsersQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  role: z.enum(['SUPERADMIN', 'ADMIN_5S', 'AUDITOR', 'KEPALA_DIVISI', 'PIC', 'ANGGOTA']).optional(),
  divisionId: z.string().optional(),
  isActive: z.string().optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
