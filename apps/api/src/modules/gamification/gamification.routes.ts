import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import * as svc from './gamification.service';
import { uploadImage } from '@/modules/storage/storage.service';
import { authenticate, authorize, allAuthenticated, onlyAdminAndAbove, kepalaAndAbove } from '@/middlewares/auth';
import { successResponse } from '@/utils/response';

const router = Router();
const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => (file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Hanya gambar diizinkan'))),
});
const canInput = authorize('SUPERADMIN', 'ADMIN_5S', 'AUDITOR', 'KEPALA_DIVISI', 'PIC');

// ===== Badges =====
router.post('/badges/compute', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const awarded = await svc.computeBadges(req.user!.companyId);
  successResponse(res, { awarded }, `${awarded} badge baru diberikan`);
}));
router.get('/badges', authenticate, allAuthenticated, wrap(async (req, res) => successResponse(res, await svc.listBadges(req.user!.companyId), 'Daftar badge')));
router.get('/badges/me', authenticate, allAuthenticated, wrap(async (req, res) => successResponse(res, await svc.getMyBadges(req.user!.id), 'Badge saya')));

// ===== Wall of Fame =====
router.get('/wall-of-fame', authenticate, allAuthenticated, wrap(async (req, res) => successResponse(res, await svc.getWallOfFame(req.user!.companyId), 'Wall of Fame')));

// ===== Best Practice Library =====
router.get('/best-practices', authenticate, allAuthenticated, wrap(async (req, res) => successResponse(res, await svc.listBestPractices(req.user!.companyId, req.query.problemCategory as string), 'Best Practice Library')));
router.patch('/best-practices/:id', authenticate, kepalaAndAbove, wrap(async (req, res) => {
  const { value } = z.object({ value: z.boolean() }).parse(req.body);
  successResponse(res, await svc.markBestPractice(req.params.id, req.user!.companyId, value), value ? 'Ditandai best practice' : 'Dihapus dari best practice');
}));

// ===== Annual Award =====
router.get('/annual-award', authenticate, allAuthenticated, wrap(async (req, res) => successResponse(res, await svc.getAnnualAward(req.user!.companyId, req.query.year as string), 'Annual Award')));

// ===== Smart Suggestions =====
router.get('/suggestions', authenticate, kepalaAndAbove, wrap(async (req, res) => successResponse(res, await svc.getSuggestions(req.user!.companyId), 'Smart suggestions')));

// ===== Digital Twin — Floor Plans =====
router.get('/floorplans', authenticate, allAuthenticated, wrap(async (req, res) => successResponse(res, await svc.listFloorPlans(req.user!.companyId), 'Daftar denah')));
router.post('/floorplans', authenticate, onlyAdminAndAbove, upload.single('image'), wrap(async (req, res) => {
  if (!req.file) throw new Error('Gambar denah wajib diupload');
  const name = (req.body.name as string) || 'Denah';
  const imageUrl = await uploadImage(req.file.buffer, 'floorplans');
  successResponse(res, await svc.createFloorPlan(req.user!.companyId, name, imageUrl), 'Denah ditambahkan', 201);
}));
router.put('/floorplans/:id/pins', authenticate, canInput, wrap(async (req, res) => {
  const { pins } = z.object({ pins: z.array(z.any()) }).parse(req.body);
  successResponse(res, await svc.updatePins(req.params.id, req.user!.companyId, pins), 'Pin disimpan');
}));
router.delete('/floorplans/:id', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  await svc.deleteFloorPlan(req.params.id, req.user!.companyId);
  successResponse(res, null, 'Denah dihapus');
}));

export default router;
