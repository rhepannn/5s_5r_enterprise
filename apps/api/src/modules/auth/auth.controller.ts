import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from './auth.schema';
import { successResponse } from '@/utils/response';
import { AppError } from '@/middlewares/errorHandler';
import { env, isProd } from '@/config/env';
import type { CookieOptions } from 'express';

// Opsi cookie refresh token. sameSite='none' (lintas-domain) mewajibkan secure=true.
const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SAMESITE === 'none' ? true : isProd,
  sameSite: env.COOKIE_SAMESITE,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
};

export async function loginHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);

    res.cookie('refreshToken', result.tokens.refreshToken, refreshCookieOptions);

    successResponse(res, {
      accessToken: result.tokens.accessToken,
      user: result.user,
    }, 'Login berhasil');
  } catch (err) {
    next(err);
  }
}

export async function registerHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = registerSchema.parse(req.body);
    const result = await authService.register(input);

    res.cookie('refreshToken', result.tokens.refreshToken, refreshCookieOptions);

    successResponse(res, {
      accessToken: result.tokens.accessToken,
      user: result.user,
    }, 'Registrasi berhasil', 201);
  } catch (err) {
    next(err);
  }
}

export async function refreshHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.refreshToken || refreshTokenSchema.parse(req.body).refreshToken;
    if (!token) throw new AppError('Refresh token tidak ditemukan', 401);

    const tokens = await authService.refreshAccessToken(token);

    res.cookie('refreshToken', tokens.refreshToken, refreshCookieOptions);

    successResponse(res, { accessToken: tokens.accessToken }, 'Token diperbarui');
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.refreshToken;
    if (token) await authService.logout(token);

    res.clearCookie('refreshToken', { httpOnly: true, secure: refreshCookieOptions.secure, sameSite: env.COOKIE_SAMESITE });
    successResponse(res, null, 'Logout berhasil');
  } catch (err) {
    next(err);
  }
}

export async function getMeHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const user = await authService.getMe(userId);
    successResponse(res, user, 'Data profil berhasil diambil');
  } catch (err) {
    next(err);
  }
}

export async function changePasswordHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = changePasswordSchema.parse(req.body);
    await authService.changePassword(req.user!.id, input);
    successResponse(res, null, 'Password berhasil diubah');
  } catch (err) {
    next(err);
  }
}
