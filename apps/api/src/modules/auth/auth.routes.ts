import { Router } from 'express';
import * as authController from './auth.controller';
import { authenticate } from '@/middlewares/auth';

const router = Router();

router.post('/login', authController.loginHandler);
router.post('/register', authController.registerHandler);
router.post('/refresh', authController.refreshHandler);
router.post('/logout', authController.logoutHandler);
router.get('/me', authenticate, authController.getMeHandler);
router.patch('/change-password', authenticate, authController.changePasswordHandler);

export default router;
