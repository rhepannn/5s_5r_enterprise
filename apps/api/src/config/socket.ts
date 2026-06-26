import type { Server } from 'socket.io';

let io: Server | null = null;

export function setIO(instance: Server): void {
  io = instance;
}

export function getIO(): Server | null {
  return io;
}

/** Kirim update leaderboard ke semua klien perusahaan terkait. */
export function emitLeaderboard(companyId: string, periodId: string, data: unknown): void {
  io?.to(`company:${companyId}`).emit('leaderboard:update', { periodId, data });
}
