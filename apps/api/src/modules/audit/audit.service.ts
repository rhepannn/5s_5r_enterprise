import { prisma } from '@/config/prisma';
import { AppError } from '@/middlewares/errorHandler';
import type { CreatePeriodInput, CreateChecklistTemplateInput } from './audit.schema';
import type { AreaCategory, PilarType } from '@prisma/client';

// ============================================================
// AUDIT PERIOD
// ============================================================

export async function listPeriods(companyId: string) {
  return prisma.auditPeriod.findMany({
    where: { companyId },
    include: { _count: { select: { sessions: true } } },
    orderBy: { startDate: 'desc' },
  });
}

export async function getPeriodById(id: string, companyId: string) {
  const period = await prisma.auditPeriod.findFirst({ where: { id, companyId } });
  if (!period) throw new AppError('Periode audit tidak ditemukan', 404);
  return period;
}

export async function createPeriod(companyId: string, input: CreatePeriodInput) {
  return prisma.auditPeriod.create({
    data: {
      name: input.name,
      type: input.type,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      companyId,
    },
  });
}

export async function updatePeriod(id: string, companyId: string, input: Partial<CreatePeriodInput>) {
  const period = await prisma.auditPeriod.findFirst({ where: { id, companyId } });
  if (!period) throw new AppError('Periode audit tidak ditemukan', 404);

  return prisma.auditPeriod.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.type && { type: input.type }),
      ...(input.startDate && { startDate: new Date(input.startDate) }),
      ...(input.endDate && { endDate: new Date(input.endDate) }),
    },
  });
}

export async function togglePeriodActive(id: string, companyId: string) {
  const period = await prisma.auditPeriod.findFirst({ where: { id, companyId } });
  if (!period) throw new AppError('Periode audit tidak ditemukan', 404);
  return prisma.auditPeriod.update({ where: { id }, data: { isActive: !period.isActive } });
}

export async function deletePeriod(id: string, companyId: string) {
  const period = await prisma.auditPeriod.findFirst({ where: { id, companyId } });
  if (!period) throw new AppError('Periode audit tidak ditemukan', 404);

  const hasSession = await prisma.auditSession.count({ where: { periodId: id } });
  if (hasSession > 0) throw new AppError('Periode tidak dapat dihapus karena sudah memiliki sesi audit', 400);

  return prisma.auditPeriod.delete({ where: { id } });
}

// ============================================================
// CHECKLIST TEMPLATE
// ============================================================

export async function listChecklistTemplates(filters?: {
  areaCategory?: AreaCategory;
  pilar?: PilarType;
  isActive?: boolean;
}) {
  return prisma.checklistTemplate.findMany({
    where: {
      ...(filters?.areaCategory && { areaCategory: filters.areaCategory }),
      ...(filters?.pilar && { pilar: filters.pilar }),
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
    },
    orderBy: [{ areaCategory: 'asc' }, { pilar: 'asc' }, { sortOrder: 'asc' }],
  });
}

export async function getChecklistTemplateById(id: string) {
  const tmpl = await prisma.checklistTemplate.findUnique({ where: { id } });
  if (!tmpl) throw new AppError('Template checklist tidak ditemukan', 404);
  return tmpl;
}

export async function createChecklistTemplate(input: CreateChecklistTemplateInput) {
  return prisma.checklistTemplate.create({ data: input });
}

export async function bulkCreateChecklistTemplates(items: CreateChecklistTemplateInput[]) {
  return prisma.checklistTemplate.createMany({ data: items, skipDuplicates: true });
}

export async function updateChecklistTemplate(id: string, input: Partial<CreateChecklistTemplateInput>) {
  const exists = await prisma.checklistTemplate.findUnique({ where: { id } });
  if (!exists) throw new AppError('Template checklist tidak ditemukan', 404);
  return prisma.checklistTemplate.update({ where: { id }, data: input });
}

export async function deleteChecklistTemplate(id: string) {
  const exists = await prisma.checklistTemplate.findUnique({ where: { id } });
  if (!exists) throw new AppError('Template checklist tidak ditemukan', 404);
  return prisma.checklistTemplate.delete({ where: { id } });
}

export async function getChecklistSummary() {
  const grouped = await prisma.checklistTemplate.groupBy({
    by: ['areaCategory', 'pilar'],
    _count: { id: true },
    where: { isActive: true },
  });
  return grouped;
}
