import { useEffect, useState, useCallback } from 'react';
import { getAllQueued, removeQueued, countQueued } from '@/lib/offlineDb';
import { auditService } from '@/services/audit.service';

/**
 * Memantau status online dan memproses antrian aksi offline (IndexedDB).
 * Auditor lapangan bisa simpan penilaian saat offline; tersinkron otomatis saat online.
 */
export function useOfflineSync() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    try { setPending(await countQueued()); } catch { /* ignore */ }
  }, []);

  const processQueue = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      const actions = await getAllQueued();
      for (const a of actions) {
        try {
          if (a.type === 'SAVE_ITEMS') {
            await auditService.saveItems(a.payload.sessionId, a.payload.items);
          }
          if (a.id != null) await removeQueued(a.id);
        } catch {
          // biarkan di antrian, coba lagi nanti
        }
      }
    } finally {
      setSyncing(false);
      await refresh();
    }
  }, [refresh]);

  useEffect(() => {
    const onOnline = () => { setOnline(true); void processQueue(); };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    void refresh();
    void processQueue();
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [processQueue, refresh]);

  return { online, pending, syncing, processQueue, refresh };
}
