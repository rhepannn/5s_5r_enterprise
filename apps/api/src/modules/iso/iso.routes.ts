import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as svc from './iso.service';
import { authenticate, authorize, onlyAdminAndAbove, allAuthenticated } from '@/middlewares/auth';
import { successResponse } from '@/utils/response';
import { AppError } from '@/middlewares/errorHandler';
import type { IsoStandard } from '@prisma/client';

const router = Router();
const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

const VALID: IsoStandard[] = ['ISO_9001', 'ISO_14001', 'ISO_45001'];
const parseStd = (s: string): IsoStandard => {
  if (!VALID.includes(s as IsoStandard)) throw new AppError('Standar ISO tidak valid (ISO_9001/ISO_14001/ISO_45001)', 400);
  return s as IsoStandard;
};

const tagSchema = z.object({ clauses: z.array(z.string()).max(20) });
const canTag = authorize('SUPERADMIN', 'ADMIN_5S', 'AUDITOR', 'KEPALA_DIVISI', 'PIC');

router.get('/clauses', authenticate, allAuthenticated, wrap(async (req, res) => {
  const std = req.query.standard ? parseStd(req.query.standard as string) : undefined;
  successResponse(res, await svc.listClauses(std), 'Daftar klausul ISO');
}));

router.get('/compliance/:standard', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  successResponse(res, await svc.getComplianceStatus(req.user!.companyId, parseStd(req.params.standard)), 'Status compliance');
}));

router.get('/readiness', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  successResponse(res, await svc.getReadiness(req.user!.companyId), 'Kesiapan audit ISO');
}));

router.get('/potential-nc', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  successResponse(res, await svc.getPotentialNCs(req.user!.companyId), 'Potensi non-conformance');
}));

router.get('/evidence/:standard', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  successResponse(res, await svc.getEvidencePackage(req.user!.companyId, parseStd(req.params.standard)), 'Evidence package');
}));

router.patch('/improvements/:id/tag', authenticate, canTag, wrap(async (req, res) => {
  const { clauses } = tagSchema.parse(req.body);
  successResponse(res, await svc.tagImprovement(req.params.id, req.user!.companyId, clauses), 'Tag klausul ISO diperbarui');
}));

export default router;
