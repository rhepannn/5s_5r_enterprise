import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@/config/prisma';
import { recomputePeriodScores, getLeaderboard } from './scoring.service';
import { emitLeaderboard } from '@/config/socket';
import { authenticate, onlyAdminAndAbove, authorize } from '@/middlewares/auth';
import { successResponse } from '@/utils/response';
import { AppError } from '@/middlewares/errorHandler';
import type { DivisionCategory } from '@prisma/client';

const router = Router();
const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

const canView = authorize('SUPERADMIN', 'ADMIN_5S', 'AUDITOR', 'KEPALA_DIVISI', 'PIC', 'ANGGOTA');

// Leaderboard (semua role boleh lihat)
router.get('/leaderboard', authenticate, canView, wrap(async (req, res) => {
  const periodId = req.query.periodId as string;
  if (!periodId) throw new AppError('periodId wajib', 400);
  const category = req.query.category as DivisionCategory | undefined;
  const data = await getLeaderboard(periodId, req.user!.companyId, category);
  successResponse(res, data, 'Leaderboard');
}));

// Recompute skor periode (admin) + broadcast realtime
router.post('/recompute', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const periodId = req.body.periodId as string;
  if (!periodId) throw new AppError('periodId wajib', 400);
  const data = await recomputePeriodScores(periodId, req.user!.companyId);
  emitLeaderboard(req.user!.companyId, periodId, data);
  successResponse(res, data, 'Skor dihitung ulang & leaderboard diperbarui');
}));

// Countdown akhir periode + status
router.get('/periods/:id/countdown', authenticate, canView, wrap(async (req, res) => {
  const period = await prisma.auditPeriod.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId } });
  if (!period) throw new AppError('Periode tidak ditemukan', 404);

  const now = new Date();
  const total = period.endDate.getTime() - period.startDate.getTime();
  const elapsed = now.getTime() - period.startDate.getTime();
  const msRemaining = period.endDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  successResponse(res, {
    periodName: period.name,
    startDate: period.startDate,
    endDate: period.endDate,
    daysRemaining,
    isEnded: msRemaining <= 0,
    progressPercent: total > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / total) * 100))) : 0,
  }, 'Countdown periode');
}));

export default router;
