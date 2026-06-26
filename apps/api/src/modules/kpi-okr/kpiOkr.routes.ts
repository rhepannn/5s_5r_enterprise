import { Router, Request, Response, NextFunction } from 'express';
import * as svc from './kpiOkr.service';
import { createOkrSchema, updateKeyResultSchema, createKpiSchema } from './kpiOkr.schema';
import { authenticate, kepalaAndAbove, onlyAdminAndAbove, authorize } from '@/middlewares/auth';
import { successResponse } from '@/utils/response';

const router = Router();
const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

const canView = authorize('SUPERADMIN', 'ADMIN_5S', 'AUDITOR', 'KEPALA_DIVISI');
const isAdmin = (req: Request) => req.user!.role === 'SUPERADMIN' || req.user!.role === 'ADMIN_5S';

// ============ OKR ============
router.get('/okr', authenticate, canView, wrap(async (req, res) => {
  const data = await svc.listOkrs(req.user!.companyId, {
    quarter: req.query.quarter as string,
    level: req.query.level as string,
    divisionId: req.query.divisionId as string,
  });
  successResponse(res, data, 'Daftar OKR');
}));

router.post('/okr', authenticate, kepalaAndAbove, wrap(async (req, res) => {
  const input = createOkrSchema.parse(req.body);
  const data = await svc.createOkr(req.user!.companyId, input, isAdmin(req));
  successResponse(res, data, 'OKR berhasil dibuat', 201);
}));

router.patch('/okr/key-results/:krId', authenticate, kepalaAndAbove, wrap(async (req, res) => {
  const { actual } = updateKeyResultSchema.parse(req.body);
  const data = await svc.updateKeyResult(req.params.krId, req.user!.companyId, actual);
  successResponse(res, data, 'Key Result diperbarui');
}));

router.delete('/okr/:id', authenticate, kepalaAndAbove, wrap(async (req, res) => {
  await svc.deleteOkr(req.params.id, req.user!.companyId);
  successResponse(res, null, 'OKR dihapus');
}));

// ============ KPI ============
router.get('/kpi', authenticate, canView, wrap(async (req, res) => {
  const data = await svc.listKpis(req.user!.companyId, {
    period: req.query.period as string,
    divisionId: req.query.divisionId as string,
  });
  successResponse(res, data, 'Daftar KPI');
}));

router.post('/kpi', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const input = createKpiSchema.parse(req.body);
  const data = await svc.createKpi(req.user!.companyId, input);
  successResponse(res, data, 'KPI berhasil dibuat', 201);
}));

router.post('/kpi/recompute', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const data = await svc.recomputeKpiActuals(req.user!.companyId);
  successResponse(res, data, 'KPI actual dihitung ulang dari data audit');
}));

router.delete('/kpi/:id', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  await svc.deleteKpi(req.params.id, req.user!.companyId);
  successResponse(res, null, 'KPI dihapus');
}));

export default router;
