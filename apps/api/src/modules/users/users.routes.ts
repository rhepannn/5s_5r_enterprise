import { Router, Request, Response, NextFunction } from 'express';
import * as svc from './users.service';
import { createUserSchema, updateUserSchema, resetPasswordSchema } from './users.schema';
import { authenticate, onlyAdminAndAbove } from '@/middlewares/auth';
import { successResponse, paginatedResponse } from '@/utils/response';

const router = Router();
const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

router.get('/', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const { users, total, page, limit } = await svc.listUsers(req);
  paginatedResponse(res, users, total, page, limit, 'Daftar user');
}));

router.get('/:id', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const data = await svc.getUserById(req.params.id, req.user!.companyId);
  successResponse(res, data);
}));

router.post('/', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const input = createUserSchema.parse(req.body);
  const data = await svc.createUser(input);
  successResponse(res, data, 'User berhasil dibuat', 201);
}));

router.put('/:id', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const input = updateUserSchema.parse(req.body);
  const data = await svc.updateUser(req.params.id, req.user!.companyId, input);
  successResponse(res, data, 'User berhasil diperbarui');
}));

router.delete('/:id', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  await svc.deleteUser(req.params.id, req.user!.companyId);
  successResponse(res, null, 'User berhasil dinonaktifkan');
}));

router.post('/:id/reset-password', authenticate, onlyAdminAndAbove, wrap(async (req, res) => {
  const { newPassword } = resetPasswordSchema.parse(req.body);
  await svc.resetUserPassword(req.params.id, req.user!.companyId, newPassword);
  successResponse(res, null, 'Password berhasil direset');
}));

export default router;
