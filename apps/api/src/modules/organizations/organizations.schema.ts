import { z } from 'zod';

// ============ Company ============
export const createCompanySchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(20).toUpperCase(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

// ============ Plant ============
export const createPlantSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(20).toUpperCase(),
  address: z.string().optional(),
});

export const updatePlantSchema = createPlantSchema.partial();

// ============ Department ============
export const createDepartmentSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(20).toUpperCase(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

// ============ Division ============
export const createDivisionSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(20).toUpperCase(),
  category: z.enum(['PRODUKSI', 'KANTOR', 'GUDANG']),
});

export const updateDivisionSchema = createDivisionSchema.partial();

// ============ WorkArea ============
export const createWorkAreaSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(20).toUpperCase(),
  category: z.enum(['PRODUKSI', 'KANTOR', 'GUDANG', 'LABORATORIUM', 'OUTDOOR']),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const updateWorkAreaSchema = createWorkAreaSchema.partial();

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type CreatePlantInput = z.infer<typeof createPlantSchema>;
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type CreateDivisionInput = z.infer<typeof createDivisionSchema>;
export type CreateWorkAreaInput = z.infer<typeof createWorkAreaSchema>;
