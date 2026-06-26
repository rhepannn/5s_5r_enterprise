import { Router, Request, Response, NextFunction } from 'express';
import * as xlsx from './export.service';
import { authenticate, kepalaAndAbove } from '@/middlewares/auth';
import { AppError } from '@/middlewares/errorHandler';

const router = Router();
const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

function sendXlsx(res: Response, buffer: Buffer, filename: string) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

// Ekspor Excel — "Ekspor PDF/Excel": Super/Admin/Kepala
router.get('/export/audits.xlsx', authenticate, kepalaAndAbove, wrap(async (req, res) => {
  sendXlsx(res, await xlsx.exportAudits(req.user!.companyId), 'laporan-audit.xlsx');
}));

router.get('/export/improvements.xlsx', authenticate, kepalaAndAbove, wrap(async (req, res) => {
  sendXlsx(res, await xlsx.exportImprovements(req.user!.companyId), 'laporan-before-after.xlsx');
}));

router.get('/export/kpi.xlsx', authenticate, kepalaAndAbove, wrap(async (req, res) => {
  sendXlsx(res, await xlsx.exportKpi(req.user!.companyId), 'laporan-kpi.xlsx');
}));

router.get('/export/leaderboard.xlsx', authenticate, kepalaAndAbove, wrap(async (req, res) => {
  const periodId = req.query.periodId as string;
  if (!periodId) throw new AppError('periodId wajib', 400);
  sendXlsx(res, await xlsx.exportLeaderboard(req.user!.companyId, periodId), 'laporan-kompetisi.xlsx');
}));

export default router;
