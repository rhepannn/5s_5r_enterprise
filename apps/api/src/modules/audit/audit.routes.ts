import { Router, Request, Response, NextFunction } from 'express';
import * as svc from './audit.service';
import {
  createPeriodSchema, updatePeriodSchema,
  createChecklistTemplateSchema, updateChecklistTemplateSchema, bulkCreateChecklistSchema,
} from './audit.schema';
import { authenticate, onlyAdminAndAbove } from '@/middlewares/auth';
import { successResponse } from '@/utils/response';
import type { AreaCategory, PilarType } from '@prisma/client';

const router = Router();
const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

// ============ Audit Period ============
router.get('/periods', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const data = await svc.listPeriods(req.user!.companyId);
  successResponse(res, data, 'Daftar periode audit');
}));

router.get('/periods/:id', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const data = await svc.getPeriodById(req.params.id, req.user!.companyId);
  successResponse(res, data);
}));

router.post('/periods', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const input = createPeriodSchema.parse(req.body);
  const data = await svc.createPeriod(req.user!.companyId, input);
  successResponse(res, data, 'Periode audit berhasil dibuat', 201);
}));

router.put('/periods/:id', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const input = updatePeriodSchema.parse(req.body);
  const data = await svc.updatePeriod(req.params.id, req.user!.companyId, input);
  successResponse(res, data, 'Periode audit berhasil diperbarui');
}));

router.patch('/periods/:id/toggle-active', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const data = await svc.togglePeriodActive(req.params.id, req.user!.companyId);
  successResponse(res, data, `Periode ${data.isActive ? 'diaktifkan' : 'dinonaktifkan'}`);
}));

router.delete('/periods/:id', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  await svc.deletePeriod(req.params.id, req.user!.companyId);
  successResponse(res, null, 'Periode audit berhasil dihapus');
}));

// ============ Checklist Template ============
router.get('/checklist-templates', authenticate, wrap(async (req, res) => {
  const data = await svc.listChecklistTemplates({
    areaCategory: req.query.areaCategory as AreaCategory | undefined,
    pilar: req.query.pilar as PilarType | undefined,
    isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
  });
  successResponse(res, data, 'Daftar template checklist');
}));

router.get('/checklist-templates/summary', authenticate, wrap(async (req, res) => {
  const data = await svc.getChecklistSummary();
  successResponse(res, data, 'Ringkasan template checklist');
}));

router.get('/checklist-templates/:id', authenticate, wrap(async (req, res) => {
  const data = await svc.getChecklistTemplateById(req.params.id);
  successResponse(res, data);
}));

router.post('/checklist-templates', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const input = createChecklistTemplateSchema.parse(req.body);
  const data = await svc.createChecklistTemplate(input);
  successResponse(res, data, 'Template checklist berhasil dibuat', 201);
}));

router.post('/checklist-templates/bulk', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const { items } = bulkCreateChecklistSchema.parse(req.body);
  const data = await svc.bulkCreateChecklistTemplates(items);
  successResponse(res, data, `${data.count} template berhasil ditambahkan`, 201);
}));

router.put('/checklist-templates/:id', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const input = updateChecklistTemplateSchema.parse(req.body);
  const data = await svc.updateChecklistTemplate(req.params.id, input);
  successResponse(res, data, 'Template checklist berhasil diperbarui');
}));

router.delete('/checklist-templates/:id', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  await svc.deleteChecklistTemplate(req.params.id);
  successResponse(res, null, 'Template checklist berhasil dihapus');
}));

export default router;
