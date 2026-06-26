// Minimal IndexedDB wrapper untuk sync queue offline (tanpa dependency tambahan).
const DB_NAME = '5s-offline';
const STORE = 'sync-queue';
const VERSION = 1;

export interface QueuedAction {
  id?: number;
  type: 'SAVE_ITEMS';
  payload: { sessionId: string; items: { id: string; score?: number | null; notes?: string }[] };
  label: string;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

export async function enqueue(action: Omit<QueuedAction, 'id'>): Promise<void> {
  await tx('readwrite', (s) => s.add(action));
}

export async function getAllQueued(): Promise<QueuedAction[]> {
  return tx<QueuedAction[]>('readonly', (s) => s.getAll() as IDBRequest<QueuedAction[]>);
}

export async function removeQueued(id: number): Promise<void> {
  await tx('readwrite', (s) => s.delete(id));
}

export async function countQueued(): Promise<number> {
  return tx<number>('readonly', (s) => s.count());
}
