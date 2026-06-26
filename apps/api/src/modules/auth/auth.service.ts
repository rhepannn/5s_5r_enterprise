import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/config/prisma';
import { redis } from '@/config/redis';
import { env } from '@/config/env';
import { AppError } from '@/middlewares/errorHandler';
import type { LoginInput, RegisterInput, ChangePasswordInput } from './auth.schema';
import type { UserRole } from '@prisma/client';

const SALT_ROUNDS = 12;
const REFRESH_TOKEN_PREFIX = 'refresh:';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string;
  divisionId: string | null;
  avatar: string | null;
}

function signAccessToken(user: AuthUser): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      divisionId: user.divisionId,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES as jwt.SignOptions['expiresIn'] }
  );
}

function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES as jwt.SignOptions['expiresIn'],
  });
}

async function storeRefreshToken(userId: string, token: string): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: { token, userId, expiresAt },
  });

  await redis.set(
    `${REFRESH_TOKEN_PREFIX}${token}`,
    userId,
    'EX',
    7 * 24 * 60 * 60
  );
}

export async function login(input: LoginInput): Promise<{ tokens: TokenPair; user: AuthUser }> {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      role: true,
      companyId: true,
      divisionId: true,
      avatar: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    throw new AppError('Email atau password salah', 401);
  }

  const isMatch = await bcrypt.compare(input.password, user.passwordHash);
  if (!isMatch) {
    throw new AppError('Email atau password salah', 401);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const authUser: AuthUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    divisionId: user.divisionId,
    avatar: user.avatar,
  };

  const accessToken = signAccessToken(authUser);
  const refreshToken = signRefreshToken(user.id);
  await storeRefreshToken(user.id, refreshToken);

  return { tokens: { accessToken, refreshToken }, user: authUser };
}

export async function register(input: RegisterInput): Promise<{ tokens: TokenPair; user: AuthUser }> {
  const exists = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (exists) {
    throw new AppError('Email sudah terdaftar', 409);
  }

  const company = await prisma.company.findUnique({ where: { id: input.companyId } });
  if (!company) {
    throw new AppError('Perusahaan tidak ditemukan', 404);
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      role: (input.role as UserRole) || 'ANGGOTA',
      companyId: input.companyId,
      divisionId: input.divisionId || null,
      phone: input.phone || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      companyId: true,
      divisionId: true,
      avatar: true,
    },
  });

  const authUser: AuthUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    divisionId: user.divisionId,
    avatar: user.avatar,
  };

  const accessToken = signAccessToken(authUser);
  const refreshToken = signRefreshToken(user.id);
  await storeRefreshToken(user.id, refreshToken);

  return { tokens: { accessToken, refreshToken }, user: authUser };
}

export async function refreshAccessToken(token: string): Promise<TokenPair> {
  let payload: jwt.JwtPayload;

  try {
    payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
  } catch {
    throw new AppError('Refresh token tidak valid atau sudah expired', 401);
  }

  const cached = await redis.get(`${REFRESH_TOKEN_PREFIX}${token}`);
  if (!cached) {
    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new AppError('Refresh token tidak valid atau sudah expired', 401);
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub as string },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      companyId: true,
      divisionId: true,
      avatar: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    throw new AppError('User tidak ditemukan atau tidak aktif', 401);
  }

  await prisma.refreshToken.delete({ where: { token } });
  await redis.del(`${REFRESH_TOKEN_PREFIX}${token}`);

  const authUser: AuthUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    divisionId: user.divisionId,
    avatar: user.avatar,
  };

  const accessToken = signAccessToken(authUser);
  const newRefreshToken = signRefreshToken(user.id);
  await storeRefreshToken(user.id, newRefreshToken);

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(refreshToken: string): Promise<void> {
  try {
    await prisma.refreshToken.delete({ where: { token: refreshToken } });
  } catch {
    // Token may not exist, ignore
  }
  await redis.del(`${REFRESH_TOKEN_PREFIX}${refreshToken}`);
}

export async function changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user) throw new AppError('User tidak ditemukan', 404);

  const isMatch = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!isMatch) throw new AppError('Password lama tidak sesuai', 400);

  const passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  // Revoke all refresh tokens
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

export async function getMe(userId: string): Promise<AuthUser & { company: { name: string; code: string } }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      companyId: true,
      divisionId: true,
      avatar: true,
      company: { select: { name: true, code: true } },
    },
  });

  if (!user) throw new AppError('User tidak ditemukan', 404);
  return user;
}
