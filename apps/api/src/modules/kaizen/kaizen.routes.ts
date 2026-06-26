import { Router, Request, Response, NextFunction } from 'express';
import * as svc from './kaizen.service';
import { createIdeaSchema } from './kaizen.service';
import { authenticate, authorize, allAuthenticated } from '@/middlewares/auth';
import { successResponse } from '@/utils/response';

const router = Router();
const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

// Adopsi/reject ide: Super/Admin/Kepala
const canCurate = authorize('SUPERADMIN', 'ADMIN_5S', 'KEPALA_DIVISI');

// Semua user boleh lihat & submit ide & vote
router.get('/', authenticate, allAuthenticated, wrap(async (req, res) => {
  const data = await svc.listIdeas(req.user!.companyId, req.user!.id, { status: req.query.status as string, divisionId: req.query.divisionId as string });
  successResponse(res, data, 'Bank ide Kaizen');
}));

router.post('/', authenticate, allAuthenticated, wrap(async (req, res) => {
  const input = createIdeaSchema.parse(req.body);
  successResponse(res, await svc.createIdea(req.user!.companyId, req.user!.id, input), 'Ide Kaizen dikirim', 201);
}));

router.post('/:id/vote', authenticate, allAuthenticated, wrap(async (req, res) => {
  const data = await svc.toggleVote(req.params.id, req.user!.companyId, req.user!.id);
  successResponse(res, data, data.voted ? 'Vote ditambahkan' : 'Vote dibatalkan');
}));

router.post('/:id/adopt', authenticate, canCurate, wrap(async (req, res) => {
  successResponse(res, await svc.adoptIdea(req.params.id, req.user!.companyId), 'Ide diadopsi jadi proyek QCC', 201);
}));

router.post('/:id/reject', authenticate, canCurate, wrap(async (req, res) => {
  successResponse(res, await svc.rejectIdea(req.params.id, req.user!.companyId), 'Ide ditolak');
}));

router.delete('/:id', authenticate, canCurate, wrap(async (req, res) => {
  await svc.deleteIdea(req.params.id, req.user!.companyId);
  successResponse(res, null, 'Ide dihapus');
}));

export default router;
