import { Router, Request, Response, NextFunction } from 'express';
import * as svc from './proper.service';
import { updateCriteriaSchema, balanceSchema, permitSchema } from './proper.schema';
import { authenticate, onlyAdminAndAbove } from '@/middlewares/auth';
import { successResponse } from '@/utils/response';

const router = Router();
const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

// Dashboard + kriteria
router.get('/dashboard', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  successResponse(res, await svc.getDashboard(req.user!.companyId, req.query.period as string), 'Dashboard PROPER');
}));
router.put('/criteria', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const input = updateCriteriaSchema.parse(req.body);
  successResponse(res, await svc.updateCriteria(req.user!.companyId, input.period, input.scores, input.targetRank), 'Kriteria PROPER diperbarui');
}));

// Neraca lingkungan
router.get('/balances', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  successResponse(res, await svc.listBalances(req.user!.companyId, { period: req.query.period as string, type: req.query.type as string }), 'Neraca lingkungan');
}));
router.post('/balances', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const input = balanceSchema.parse(req.body);
  successResponse(res, await svc.upsertBalance(req.user!.companyId, input), 'Neraca disimpan', 201);
}));
router.delete('/balances/:id', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  await svc.deleteBalance(req.params.id, req.user!.companyId);
  successResponse(res, null, 'Neraca dihapus');
}));

// Izin lingkungan
router.get('/permits', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  successResponse(res, await svc.listPermits(req.user!.companyId), 'Daftar izin lingkungan');
}));
router.post('/permits', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const input = permitSchema.parse(req.body);
  successResponse(res, await svc.createPermit(req.user!.companyId, input), 'Izin ditambahkan', 201);
}));
router.put('/permits/:id', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const input = permitSchema.partial().parse(req.body);
  successResponse(res, await svc.updatePermit(req.params.id, req.user!.companyId, input), 'Izin diperbarui');
}));
router.delete('/permits/:id', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  await svc.deletePermit(req.params.id, req.user!.companyId);
  successResponse(res, null, 'Izin dihapus');
}));

// Evidence bank + RKL-RPL + SIMPEL export
router.get('/evidence', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  successResponse(res, await svc.getEvidenceBank(req.user!.companyId), 'Evidence bank PROPER');
}));
router.get('/rkl-rpl', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  successResponse(res, await svc.getRklRpl(req.user!.companyId, (req.query.period as string) || ''), 'Data RKL-RPL');
}));
router.get('/export/simpel.xlsx', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const buffer = await svc.exportSimpel(req.user!.companyId, req.query.period as string);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="neraca-lingkungan-simpel.xlsx"');
  res.send(buffer);
}));

export default router;
