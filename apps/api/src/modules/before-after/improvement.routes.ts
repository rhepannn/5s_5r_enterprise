import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as svc from './improvement.service';
import { escalateOverdueImprovements } from './escalation.service';
import { getTrail } from '@/modules/audit/auditTrail.service';
import { uploadImage } from '@/modules/storage/storage.service';
import { createImprovementSchema, updateImprovementSchema, reasonSchema } from './improvement.schema';
import { authenticate, authorize, allAuthenticated, kepalaAndAbove } from '@/middlewares/auth';
import { successResponse } from '@/utils/response';
import type { TrailActor } from '@/modules/audit/auditTrail.service';

const router = Router();
const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

const actorOf = (req: Request): TrailActor => ({ id: req.user!.id, email: req.user!.email, role: req.user!.role });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => (file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Hanya gambar diizinkan'))),
});

// Input Before/After: Super/Admin/Auditor/Kepala/PIC. Verifikasi: Super/Admin/Kepala. Escalate QCC: +PIC.
const canInput = authorize('SUPERADMIN', 'ADMIN_5S', 'AUDITOR', 'KEPALA_DIVISI', 'PIC');
const canEscalate = authorize('SUPERADMIN', 'ADMIN_5S', 'KEPALA_DIVISI', 'PIC');

// ============ Read ============
router.get('/', authenticate, allAuthenticated, wrap(async (req, res) => {
  const data = await svc.listImprovements(req.user!.companyId, {
    status: req.query.status as string,
    divisionId: req.query.divisionId as string,
    problemCategory: req.query.problemCategory as string,
  });
  successResponse(res, data, 'Daftar perbaikan');
}));

router.get('/report', authenticate, kepalaAndAbove, wrap(async (req, res) => {
  const data = await svc.getReport(req.user!.companyId);
  successResponse(res, data, 'Rekap perbaikan');
}));

// Jalankan eskalasi perbaikan terlambat secara manual (selain cron harian 08:30)
router.post('/escalate', authenticate, authorize('SUPERADMIN', 'ADMIN_5S'), wrap(async (_req, res) => {
  const result = await escalateOverdueImprovements();
  successResponse(res, result, `Eskalasi selesai: ${result.escalated} dari ${result.scanned} perbaikan terlambat`);
}));

router.get('/:id', authenticate, allAuthenticated, wrap(async (req, res) => {
  const data = await svc.getImprovementById(req.params.id, req.user!.companyId);
  successResponse(res, data);
}));

router.get('/:id/trail', authenticate, allAuthenticated, wrap(async (req, res) => {
  await svc.getImprovementById(req.params.id, req.user!.companyId);
  const data = await getTrail('Improvement', req.params.id);
  successResponse(res, data, 'Riwayat perbaikan');
}));

// ============ Create / Update ============
router.post('/', authenticate, canInput, wrap(async (req, res) => {
  const input = createImprovementSchema.parse(req.body);
  const data = await svc.createImprovement(req.user!.companyId, input, actorOf(req));
  successResponse(res, data, 'Perbaikan berhasil dibuat', 201);
}));

router.put('/:id', authenticate, canInput, wrap(async (req, res) => {
  const input = updateImprovementSchema.parse(req.body);
  const data = await svc.updateImprovement(req.params.id, req.user!.companyId, input, actorOf(req));
  successResponse(res, data, 'Perbaikan diperbarui');
}));

// ============ Workflow ============
router.post('/:id/start', authenticate, canInput, wrap(async (req, res) => {
  const data = await svc.startProgress(req.params.id, req.user!.companyId, actorOf(req));
  successResponse(res, data, 'Perbaikan dikerjakan');
}));

router.post('/:id/submit', authenticate, canInput, wrap(async (req, res) => {
  const data = await svc.submitVerification(req.params.id, req.user!.companyId, actorOf(req));
  successResponse(res, data, 'Diajukan untuk verifikasi');
}));

router.post('/:id/verify', authenticate, kepalaAndAbove, wrap(async (req, res) => {
  const data = await svc.verifyImprovement(req.params.id, req.user!.companyId, actorOf(req));
  successResponse(res, data, 'Perbaikan terverifikasi & ditutup');
}));

router.post('/:id/request-revision', authenticate, kepalaAndAbove, wrap(async (req, res) => {
  const { reason } = reasonSchema.parse(req.body);
  const data = await svc.requestRevision(req.params.id, req.user!.companyId, reason, actorOf(req));
  successResponse(res, data, 'Dikembalikan untuk revisi');
}));

router.post('/:id/reject', authenticate, kepalaAndAbove, wrap(async (req, res) => {
  const { reason } = reasonSchema.parse(req.body);
  const data = await svc.rejectImprovement(req.params.id, req.user!.companyId, reason, actorOf(req));
  successResponse(res, data, 'Temuan ditolak');
}));

router.post('/:id/escalate-qcc', authenticate, canEscalate, wrap(async (req, res) => {
  const data = await svc.escalateToQCC(req.params.id, req.user!.companyId, actorOf(req));
  successResponse(res, data, 'Berhasil di-escalate ke proyek QCC', 201);
}));

// ============ Foto (before/after) ============
async function handlePhotoUpload(req: Request, res: Response, type: 'BEFORE' | 'AFTER') {
  const files = (req.files as Express.Multer.File[]) || [];
  if (files.length === 0) throw new Error('Tidak ada file gambar diupload');
  const urls = await Promise.all(files.map((f) => uploadImage(f.buffer, `before-after/${req.params.id}`)));
  const data = await svc.addPhotos(req.params.id, req.user!.companyId, type, urls, actorOf(req));
  successResponse(res, data, `${urls.length} foto ${type} ditambahkan`);
}

router.post('/:id/photos/before', authenticate, canInput, upload.array('photos', 5), wrap((req, res) => handlePhotoUpload(req, res, 'BEFORE')));
router.post('/:id/photos/after', authenticate, canInput, upload.array('photos', 5), wrap((req, res) => handlePhotoUpload(req, res, 'AFTER')));

export default router;
