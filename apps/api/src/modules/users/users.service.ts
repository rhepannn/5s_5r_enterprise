import bcrypt from 'bcryptjs';
import { prisma } from '@/config/prisma';
import { AppError } from '@/middlewares/errorHandler';
import { getPagination } from '@/utils/pagination';
import type { Request } from 'express';
import { Prisma, type UserRole } from '@prisma/client';
import type { CreateUserInput, UpdateUserInput } from './users.schema';

const SALT_ROUNDS = 12;

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  avatar: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  companyId: true,
  divisionId: true,
  company: { select: { name: true, code: true } },
  division: { select: { id: true, name: true, category: true } },
};

export async function listUsers(req: Request) {
  const { page, limit, skip } = getPagination(req);
  const { search, role, divisionId, isActive } = req.query;

  const where: Prisma.UserWhereInput = {
    companyId: req.user!.companyId,
  };

  if (search) {
    where.OR = [
      { name: { contains: String(search), mode: 'insensitive' } },
      { email: { contains: String(search), mode: 'insensitive' } },
    ];
  }

  if (role) where.role = role as UserRole;
  if (divisionId) where.divisionId = String(divisionId);
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, select: userSelect, skip, take: limit, orderBy: { name: 'asc' } }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page, limit };
}

export async function getUserById(id: string, companyId: string) {
  const user = await prisma.user.findFirst({
    where: { id, companyId },
    select: userSelect,
  });
  if (!user) throw new AppError('User tidak ditemukan', 404);
  return user;
}

export async function createUser(input: CreateUserInput) {
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw new AppError('Email sudah terdaftar', 409);

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      role: input.role as UserRole,
      companyId: input.companyId,
      divisionId: input.divisionId || null,
      phone: input.phone || null,
    },
    select: userSelect,
  });
}

export async function updateUser(id: string, companyId: string, input: UpdateUserInput) {
  const user = await prisma.user.findFirst({ where: { id, companyId } });
  if (!user) throw new AppError('User tidak ditemukan', 404);

  return prisma.user.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.role && { role: input.role as UserRole }),
      ...(input.divisionId !== undefined && { divisionId: input.divisionId }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
    select: userSelect,
  });
}

export async function deleteUser(id: string, companyId: string) {
  const user = await prisma.user.findFirst({ where: { id, companyId } });
  if (!user) throw new AppError('User tidak ditemukan', 404);
  // Soft delete
  return prisma.user.update({ where: { id }, data: { isActive: false } });
}

export async function resetUserPassword(id: string, companyId: string, newPassword: string) {
  const user = await prisma.user.findFirst({ where: { id, companyId } });
  if (!user) throw new AppError('User tidak ditemukan', 404);

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
  await prisma.refreshToken.deleteMany({ where: { userId: id } });
}
