import { Router, Request, Response, NextFunction } from 'express';
import * as svc from './schedule.service';
import { createScheduleSchema, updateScheduleSchema } from './schedule.schema';
import { authenticate, onlyAdminAndAbove } from '@/middlewares/auth';
import { successResponse } from '@/utils/response';

const router = Router();
const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

router.get('/', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const data = await svc.listSchedules(req.user!.companyId);
  successResponse(res, data, 'Daftar jadwal audit otomatis');
}));

router.post('/', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const input = createScheduleSchema.parse(req.body);
  const data = await svc.createSchedule(req.user!.companyId, input);
  successResponse(res, data, 'Jadwal audit otomatis dibuat', 201);
}));

router.put('/:id', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const input = updateScheduleSchema.parse(req.body);
  const data = await svc.updateSchedule(req.params.id, req.user!.companyId, input);
  successResponse(res, data, 'Jadwal diperbarui');
}));

router.delete('/:id', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  await svc.deleteSchedule(req.params.id, req.user!.companyId);
  successResponse(res, null, 'Jadwal dihapus');
}));

// Trigger manual (uji): jalankan generator sesi due sekarang
router.post('/run-now', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const created = await svc.generateDueSessions();
  successResponse(res, { created }, `${created} sesi audit dibuat`);
}));

export default router;
