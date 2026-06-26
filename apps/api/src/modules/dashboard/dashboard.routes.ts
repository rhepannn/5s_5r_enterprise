import { Router, Request, Response, NextFunction } from 'express';
import * as svc from './dashboard.service';
import { authenticate, authorize, onlyAdminAndAbove } from '@/middlewares/auth';
import { successResponse } from '@/utils/response';

const router = Router();
const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

const execView = authorize('SUPERADMIN', 'ADMIN_5S', 'AUDITOR', 'KEPALA_DIVISI');

router.get('/summary', authenticate, execView, wrap(async (req, res) => {
  const data = await svc.getExecutiveSummary(req.user!.companyId, req.query.periodId as string | undefined);
  successResponse(res, data, 'Ringkasan dashboard');
}));

router.get('/heatmap', authenticate, execView, wrap(async (req, res) => {
  const data = await svc.getAreaHeatmap(req.user!.companyId);
  successResponse(res, data, 'Heatmap area');
}));

router.get('/gap-analysis', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const data = await svc.getGapAnalysis(req.user!.companyId);
  successResponse(res, data, 'Gap analysis');
}));

router.get('/individual-stats', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const data = await svc.getIndividualStats(req.user!.companyId);
  successResponse(res, data, 'Statistik individu');
}));

export default router;
