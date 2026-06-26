import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';

let socket: Socket | null = null;

/** Singleton socket.io client — join room user & company (untuk leaderboard realtime). */
export function getSocket(): Socket {
  if (!socket) {
    const user = useAuthStore.getState().user;
    socket = io('/', {
      auth: { userId: user?.id, companyId: user?.companyId },
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
