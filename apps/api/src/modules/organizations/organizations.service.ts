import { prisma } from '@/config/prisma';
import { AppError } from '@/middlewares/errorHandler';
import type {
  CreateCompanyInput,
  CreatePlantInput,
  CreateDepartmentInput,
  CreateDivisionInput,
  CreateWorkAreaInput,
} from './organizations.schema';

// ============================================================
// COMPANY
// ============================================================

export async function getCompanies() {
  return prisma.company.findMany({
    select: {
      id: true, name: true, code: true, logo: true, address: true,
      phone: true, email: true, createdAt: true,
      _count: { select: { plants: true, users: true } },
    },
    orderBy: { name: 'asc' },
  });
}

export async function getCompanyById(id: string) {
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      plants: {
        include: {
          departments: {
            include: { divisions: { include: { areas: true } } },
          },
        },
      },
    },
  });
  if (!company) throw new AppError('Perusahaan tidak ditemukan', 404);
  return company;
}

export async function createCompany(input: CreateCompanyInput) {
  return prisma.company.create({ data: input });
}

export async function updateCompany(id: string, input: Partial<CreateCompanyInput>) {
  const exists = await prisma.company.findUnique({ where: { id } });
  if (!exists) throw new AppError('Perusahaan tidak ditemukan', 404);
  return prisma.company.update({ where: { id }, data: input });
}

export async function deleteCompany(id: string) {
  const exists = await prisma.company.findUnique({ where: { id } });
  if (!exists) throw new AppError('Perusahaan tidak ditemukan', 404);
  return prisma.company.delete({ where: { id } });
}

// ============================================================
// PLANT
// ============================================================

export async function getPlantsByCompany(companyId: string) {
  return prisma.plant.findMany({
    where: { companyId },
    include: { _count: { select: { departments: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function getPlantById(id: string) {
  const plant = await prisma.plant.findUnique({
    where: { id },
    include: { departments: { include: { divisions: true } } },
  });
  if (!plant) throw new AppError('Plant tidak ditemukan', 404);
  return plant;
}

export async function createPlant(companyId: string, input: CreatePlantInput) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new AppError('Perusahaan tidak ditemukan', 404);
  return prisma.plant.create({ data: { ...input, companyId } });
}

export async function updatePlant(id: string, input: Partial<CreatePlantInput>) {
  const exists = await prisma.plant.findUnique({ where: { id } });
  if (!exists) throw new AppError('Plant tidak ditemukan', 404);
  return prisma.plant.update({ where: { id }, data: input });
}

export async function deletePlant(id: string) {
  const exists = await prisma.plant.findUnique({ where: { id } });
  if (!exists) throw new AppError('Plant tidak ditemukan', 404);
  return prisma.plant.delete({ where: { id } });
}

// ============================================================
// DEPARTMENT
// ============================================================

export async function getDepartmentsByPlant(plantId: string) {
  return prisma.department.findMany({
    where: { plantId },
    include: { _count: { select: { divisions: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function createDepartment(plantId: string, input: CreateDepartmentInput) {
  const plant = await prisma.plant.findUnique({ where: { id: plantId } });
  if (!plant) throw new AppError('Plant tidak ditemukan', 404);
  return prisma.department.create({ data: { ...input, plantId } });
}

export async function updateDepartment(id: string, input: Partial<CreateDepartmentInput>) {
  const exists = await prisma.department.findUnique({ where: { id } });
  if (!exists) throw new AppError('Departemen tidak ditemukan', 404);
  return prisma.department.update({ where: { id }, data: input });
}

export async function deleteDepartment(id: string) {
  const exists = await prisma.department.findUnique({ where: { id } });
  if (!exists) throw new AppError('Departemen tidak ditemukan', 404);
  return prisma.department.delete({ where: { id } });
}

// ============================================================
// DIVISION
// ============================================================

export async function getDivisionsByDepartment(departmentId: string) {
  return prisma.division.findMany({
    where: { departmentId },
    include: { _count: { select: { areas: true, users: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function getDivisionsByCompany(companyId: string) {
  return prisma.division.findMany({
    where: { department: { plant: { companyId } } },
    include: {
      department: { select: { name: true, plant: { select: { name: true } } } },
      _count: { select: { areas: true, users: true } },
    },
    orderBy: { name: 'asc' },
  });
}

export async function getDivisionById(id: string) {
  const division = await prisma.division.findUnique({
    where: { id },
    include: {
      areas: true,
      department: { include: { plant: { include: { company: true } } } },
    },
  });
  if (!division) throw new AppError('Divisi tidak ditemukan', 404);
  return division;
}

export async function createDivision(departmentId: string, input: CreateDivisionInput) {
  const dept = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!dept) throw new AppError('Departemen tidak ditemukan', 404);
  return prisma.division.create({ data: { ...input, departmentId } });
}

export async function updateDivision(id: string, input: Partial<CreateDivisionInput>) {
  const exists = await prisma.division.findUnique({ where: { id } });
  if (!exists) throw new AppError('Divisi tidak ditemukan', 404);
  return prisma.division.update({ where: { id }, data: input });
}

export async function deleteDivision(id: string) {
  const exists = await prisma.division.findUnique({ where: { id } });
  if (!exists) throw new AppError('Divisi tidak ditemukan', 404);
  return prisma.division.delete({ where: { id } });
}

// ============================================================
// WORK AREA
// ============================================================

export async function getWorkAreasByDivision(divisionId: string) {
  return prisma.workArea.findMany({
    where: { divisionId, isActive: true },
    orderBy: { name: 'asc' },
  });
}

export async function getWorkAreaById(id: string) {
  const area = await prisma.workArea.findUnique({
    where: { id },
    include: { division: { select: { name: true, category: true } } },
  });
  if (!area) throw new AppError('Area kerja tidak ditemukan', 404);
  return area;
}

export async function createWorkArea(divisionId: string, input: CreateWorkAreaInput) {
  const division = await prisma.division.findUnique({ where: { id: divisionId } });
  if (!division) throw new AppError('Divisi tidak ditemukan', 404);
  return prisma.workArea.create({ data: { ...input, divisionId } });
}

export async function updateWorkArea(id: string, input: Partial<CreateWorkAreaInput>) {
  const exists = await prisma.workArea.findUnique({ where: { id } });
  if (!exists) throw new AppError('Area kerja tidak ditemukan', 404);
  return prisma.workArea.update({ where: { id }, data: input });
}

export async function deleteWorkArea(id: string) {
  const exists = await prisma.workArea.findUnique({ where: { id } });
  if (!exists) throw new AppError('Area kerja tidak ditemukan', 404);
  return prisma.workArea.update({ where: { id }, data: { isActive: false } });
}
