import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { AppError } from './errorHandler';
import type { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  companyId: string;
  divisionId: string | null;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { id: string };
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AppError('Token autentikasi diperlukan', 401));
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = { ...payload, id: payload.sub };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(new AppError('Token sudah expired, silakan refresh', 401));
    } else {
      next(new AppError('Token tidak valid', 401));
    }
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Token autentikasi diperlukan', 401));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AppError('Anda tidak memiliki izin untuk aksi ini', 403));
      return;
    }

    next();
  };
}

export function authorizeCompany(req: Request, res: Response, next: NextFunction): void {
  const { companyId } = req.params;
  if (!req.user) {
    next(new AppError('Token autentikasi diperlukan', 401));
    return;
  }

  if (req.user.role !== 'SUPERADMIN' && req.user.companyId !== companyId) {
    next(new AppError('Akses ditolak untuk perusahaan ini', 403));
    return;
  }

  next();
}

// Shorthand role groups
export const onlySuperAdmin = authorize('SUPERADMIN');
export const onlyAdminAndAbove = authorize('SUPERADMIN', 'ADMIN_5S');
export const auditorAndAbove = authorize('SUPERADMIN', 'ADMIN_5S', 'AUDITOR');
export const kepalaAndAbove = authorize('SUPERADMIN', 'ADMIN_5S', 'KEPALA_DIVISI');
export const picAndAbove = authorize('SUPERADMIN', 'ADMIN_5S', 'KEPALA_DIVISI', 'PIC');
export const allAuthenticated = authorize('SUPERADMIN', 'ADMIN_5S', 'AUDITOR', 'KEPALA_DIVISI', 'PIC', 'ANGGOTA');
