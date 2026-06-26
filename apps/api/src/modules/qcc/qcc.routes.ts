import { Router, Request, Response, NextFunction } from 'express';
import * as svc from './qcc.service';
import { createQccSchema, updateQccSchema, toolsSchema } from './qcc.schema';
import { authenticate, authorize, allAuthenticated } from '@/middlewares/auth';
import { successResponse } from '@/utils/response';
import type { TrailActor } from '@/modules/audit/auditTrail.service';

const router = Router();
const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
const actorOf = (req: Request): TrailActor => ({ id: req.user!.id, email: req.user!.email, role: req.user!.role });

// "Kelola proyek QCC": Super/Admin/Kepala/PIC
const canManage = authorize('SUPERADMIN', 'ADMIN_5S', 'KEPALA_DIVISI', 'PIC');

router.get('/', authenticate, allAuthenticated, wrap(async (req, res) => {
  const data = await svc.listQcc(req.user!.companyId, { status: req.query.status as string, divisionId: req.query.divisionId as string });
  successResponse(res, data, 'Daftar proyek QCC');
}));

router.get('/stats', authenticate, allAuthenticated, wrap(async (req, res) => {
  successResponse(res, await svc.getStats(req.user!.companyId), 'Statistik QCC');
}));

router.get('/:id', authenticate, allAuthenticated, wrap(async (req, res) => {
  successResponse(res, await svc.getQccById(req.params.id, req.user!.companyId));
}));

router.post('/', authenticate, canManage, wrap(async (req, res) => {
  const input = createQccSchema.parse(req.body);
  successResponse(res, await svc.createQcc(req.user!.companyId, input, actorOf(req)), 'Proyek QCC dibuat', 201);
}));

router.put('/:id', authenticate, canManage, wrap(async (req, res) => {
  const input = updateQccSchema.parse(req.body);
  successResponse(res, await svc.updateQcc(req.params.id, req.user!.companyId, input, actorOf(req)), 'Proyek QCC diperbarui');
}));

router.post('/:id/advance', authenticate, canManage, wrap(async (req, res) => {
  successResponse(res, await svc.advanceStage(req.params.id, req.user!.companyId, actorOf(req)), 'Tahap PDCA dimajukan');
}));

router.put('/:id/tools', authenticate, canManage, wrap(async (req, res) => {
  const { toolsData } = toolsSchema.parse(req.body);
  successResponse(res, await svc.saveTools(req.params.id, req.user!.companyId, toolsData, actorOf(req)), 'QCC tools disimpan');
}));

router.delete('/:id', authenticate, canManage, wrap(async (req, res) => {
  await svc.deleteQcc(req.params.id, req.user!.companyId);
  successResponse(res, null, 'Proyek QCC dihapus');
}));

export default router;
