import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as svc from './session.service';
import { getTrail } from './auditTrail.service';
import { uploadImage } from '@/modules/storage/storage.service';
import { createSessionSchema, updateItemsSchema, rejectSchema } from './session.schema';
import { authenticate, onlyAdminAndAbove, auditorAndAbove, kepalaAndAbove, authorize } from '@/middlewares/auth';
import { successResponse } from '@/utils/response';
import type { TrailActor } from './auditTrail.service';

const router = Router();
const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Hanya file gambar yang diizinkan'));
  },
});

const actorOf = (req: Request): TrailActor => ({
  id: req.user!.id,
  email: req.user!.email,
  role: req.user!.role,
});

// Bisa dilihat oleh Super/Admin/Auditor/Kepala Divisi
const canView = authorize('SUPERADMIN', 'ADMIN_5S', 'AUDITOR', 'KEPALA_DIVISI');

const viewerOf = (req: Request) => ({
  id: req.user!.id,
  role: req.user!.role,
  companyId: req.user!.companyId,
  divisionId: req.user!.divisionId,
});

// ============ List / Detail / Trail ============
router.get('/', authenticate, canView, wrap(async (req, res) => {
  const data = await svc.listSessions(viewerOf(req), {
    status: req.query.status as string,
    divisionId: req.query.divisionId as string,
    periodId: req.query.periodId as string,
    auditorId: req.query.auditorId as string,
  });
  successResponse(res, data, 'Daftar sesi audit');
}));

router.get('/:id', authenticate, canView, wrap(async (req, res) => {
  const data = await svc.getSessionById(req.params.id, req.user!.companyId);
  svc.assertCanView(data, viewerOf(req));
  successResponse(res, data);
}));

router.get('/:id/trail', authenticate, canView, wrap(async (req, res) => {
  const session = await svc.getSessionById(req.params.id, req.user!.companyId);
  svc.assertCanView(session, viewerOf(req));
  const data = await getTrail('AuditSession', req.params.id);
  successResponse(res, data, 'Riwayat audit trail');
}));

// ============ Create (schedule) ============
router.post('/', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const input = createSessionSchema.parse(req.body);
  const data = await svc.createSession(req.user!.companyId, input, actorOf(req));
  successResponse(res, data, 'Sesi audit berhasil dijadwalkan', 201);
}));

// ============ Auditor: start / fill / submit / revise ============
router.post('/:id/start', authenticate, auditorAndAbove, wrap(async (req, res) => {
  const data = await svc.startSession(req.params.id, req.user!.companyId, actorOf(req));
  successResponse(res, data, 'Audit dimulai');
}));

router.patch('/:id/items', authenticate, auditorAndAbove, wrap(async (req, res) => {
  const input = updateItemsSchema.parse(req.body);
  const data = await svc.updateItems(req.params.id, req.user!.companyId, input, actorOf(req));
  successResponse(res, data, 'Penilaian tersimpan');
}));

router.post('/:id/submit', authenticate, auditorAndAbove, wrap(async (req, res) => {
  const data = await svc.submitSession(req.params.id, req.user!.companyId, actorOf(req));
  successResponse(res, data, 'Audit disubmit untuk review');
}));

// Upload foto untuk satu item checklist (Multer memory → Sharp compress → Supabase Storage)
router.post('/:id/items/:itemId/photos', authenticate, auditorAndAbove, upload.array('photos', 5), wrap(async (req, res) => {
  const files = (req.files as Express.Multer.File[]) || [];
  if (files.length === 0) throw new Error('Tidak ada file gambar diupload');
  const urls = await Promise.all(files.map((f) => uploadImage(f.buffer, `audit/${req.params.id}`)));
  const data = await svc.addItemPhotos(req.params.id, req.params.itemId, req.user!.companyId, urls, actorOf(req));
  successResponse(res, data, `${urls.length} foto berhasil ditambahkan`);
}));

router.post('/:id/revise', authenticate, auditorAndAbove, wrap(async (req, res) => {
  const data = await svc.reviseSession(req.params.id, req.user!.companyId, actorOf(req));
  successResponse(res, data, 'Audit dibuka kembali untuk revisi');
}));

// ============ Approval workflow ============
router.post('/:id/review', authenticate, kepalaAndAbove, wrap(async (req, res) => {
  const data = await svc.reviewSession(req.params.id, req.user!.companyId, actorOf(req));
  successResponse(res, data, 'Audit direview (disetujui Kepala Divisi)');
}));

router.post('/:id/approve', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const data = await svc.approveSession(req.params.id, req.user!.companyId, actorOf(req));
  successResponse(res, data, 'Audit disetujui (final)');
}));

router.post('/:id/reject', authenticate, kepalaAndAbove, wrap(async (req, res) => {
  const { reason } = rejectSchema.parse(req.body);
  const data = await svc.rejectSession(req.params.id, req.user!.companyId, reason, actorOf(req));
  successResponse(res, data, 'Audit ditolak');
}));

// ============ Delete (hanya SCHEDULED) ============
router.delete('/:id', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  await svc.deleteSession(req.params.id, req.user!.companyId, actorOf(req));
  successResponse(res, null, 'Sesi audit dihapus');
}));

export default router;
