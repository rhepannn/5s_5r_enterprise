import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as svc from './import.service';
import { authenticate, onlyAdminAndAbove } from '@/middlewares/auth';
import { successResponse } from '@/utils/response';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Hanya file Excel (.xlsx) yang diizinkan'));
    }
  },
});

const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

router.get('/template', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const buffer = await svc.generateImportTemplate();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="template-import-5s.xlsx"');
  res.send(buffer);
}));

router.post('/users', authenticate, onlyAdminAndAbove, upload.single('file'), wrap(async (req, res) => {
  if (!req.file) throw new Error('File Excel wajib diupload');
  const result = await svc.importUsers(req.file.buffer, req.user!.companyId);
  successResponse(res, result, `Import selesai: ${result.success} berhasil, ${result.failed} gagal`);
}));

router.post('/divisions', authenticate, onlyAdminAndAbove, upload.single('file'), wrap(async (req, res) => {
  if (!req.file) throw new Error('File Excel wajib diupload');
  const result = await svc.importDivisions(req.file.buffer, req.user!.companyId);
  successResponse(res, result, `Import selesai: ${result.success} berhasil, ${result.failed} gagal`);
}));

router.post('/work-areas', authenticate, onlyAdminAndAbove, upload.single('file'), wrap(async (req, res) => {
  if (!req.file) throw new Error('File Excel wajib diupload');
  const result = await svc.importWorkAreas(req.file.buffer, req.user!.companyId);
  successResponse(res, result, `Import selesai: ${result.success} berhasil, ${result.failed} gagal`);
}));

export default router;
