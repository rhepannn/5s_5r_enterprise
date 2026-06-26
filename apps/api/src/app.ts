import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';

import { env } from './config/env';
import { prisma } from './config/prisma';
import { redis } from './config/redis';
import { connectMongoDB } from './config/mongodb';
import { setIO } from './config/socket';
import { errorHandler, notFound } from './middlewares/errorHandler';

import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import organizationsRoutes from './modules/organizations/organizations.routes';
import auditRoutes from './modules/audit/audit.routes';
import sessionRoutes from './modules/audit/session.routes';
import scheduleRoutes from './modules/audit/schedule.routes';
import improvementRoutes from './modules/before-after/improvement.routes';
import competitionRoutes from './modules/competition/competition.routes';
import kpiOkrRoutes from './modules/kpi-okr/kpiOkr.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import reportsRoutes from './modules/reports/reports.routes';
import qccRoutes from './modules/qcc/qcc.routes';
import kaizenRoutes from './modules/kaizen/kaizen.routes';
import isoRoutes from './modules/iso/iso.routes';
import properRoutes from './modules/proper/proper.routes';
import gamificationRoutes from './modules/gamification/gamification.routes';
import importRoutes from './modules/import/import.routes';
import { initScheduler } from './jobs/scheduler';

const app = express();
const httpServer = createServer(app);

// ============================================================
// Socket.io
// ============================================================
export const io = new SocketServer(httpServer, {
  cors: { origin: env.FRONTEND_URL, credentials: true },
});
setIO(io);

io.on('connection', (socket) => {
  const userId = socket.handshake.auth?.userId;
  const companyId = socket.handshake.auth?.companyId;
  if (userId) socket.join(`user:${userId}`);
  if (companyId) socket.join(`company:${companyId}`); // untuk leaderboard realtime
});

// ============================================================
// Middleware
// ============================================================
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const skipInTest = () => env.NODE_ENV === 'test';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Terlalu banyak request, coba lagi nanti' },
  skip: skipInTest,
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Terlalu banyak percobaan login' },
  skip: skipInTest,
});

// ============================================================
// Routes
// ============================================================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api', organizationsRoutes);
app.use('/api/audit/sessions', sessionRoutes);
app.use('/api/audit/schedules', scheduleRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/improvements', improvementRoutes);
app.use('/api/competition', competitionRoutes);
app.use('/api/kpi-okr', kpiOkrRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/qcc', qccRoutes);
app.use('/api/kaizen', kaizenRoutes);
app.use('/api/iso', isoRoutes);
app.use('/api/proper', properRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/import', importRoutes);

// ============================================================
// Error Handling
// ============================================================
app.use(notFound);
app.use(errorHandler);

// ============================================================
// Start Server
// ============================================================
async function bootstrap(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('[PostgreSQL] Connected');

    await redis.connect();

    await connectMongoDB();

    httpServer.listen(env.API_PORT, () => {
      console.log(`[Server] Running on http://localhost:${env.API_PORT}`);
      console.log(`[Env] ${env.NODE_ENV}`);
      initScheduler();
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log('[Server] Shutting down gracefully...');
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
});

// Hanya auto-start saat dijalankan langsung (bukan saat di-import oleh test)
if (require.main === module) {
  bootstrap();
}

export default app;
