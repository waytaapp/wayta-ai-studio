const DB_NAME = 'wayta-offline-queue';
const DB_VERSION = 1;
const STORE_NAME = 'mutations';

export interface QueuedMutation {
  id?: number;
  type: 'order:create' | 'order:update' | 'venue:update' | 'payment:submit';
  payload: Record<string, unknown>;
  createdAt: number;
  retries: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueue(mutation: Omit<QueuedMutation, 'id' | 'createdAt' | 'retries'>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.add({ ...mutation, createdAt: Date.now(), retries: 0 } satisfies QueuedMutation);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dequeueAll(): Promise<QueuedMutation[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const items: QueuedMutation[] = [];
    const cursor = store.openCursor();
    cursor.onsuccess = () => {
      const c = cursor.result;
      if (c) {
        items.push(c.value);
        c.continue();
      }
    };
    tx.oncomplete = () => resolve(items);
    tx.onerror = () => reject(tx.error);
  });
}

export async function removeQueued(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function incrementRetry(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const get = store.get(id);
    get.onsuccess = () => {
      const item = get.result as QueuedMutation | undefined;
      if (item) {
        item.retries += 1;
        store.put(item);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearQueue(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function createSyncListener(onSync: (mutations: QueuedMutation[]) => Promise<void>): () => void {
  const handler = async () => {
    if (!navigator.onLine) return;
    const mutations = await dequeueAll();
    if (mutations.length === 0) return;
    try {
      await onSync(mutations);
      await clearQueue();
    } catch {
      for (const m of mutations) {
        if (m.id !== undefined) await incrementRetry(m.id);
      }
    }
  };

  window.addEventListener('online', handler);

  const interval = setInterval(handler, 30_000);

  return () => {
    window.removeEventListener('online', handler);
    clearInterval(interval);
  };
}

export async function getQueueSize(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const count = tx.objectStore(STORE_NAME).count();
    count.onsuccess = () => resolve(count.result);
    count.onerror = () => reject(count.error);
  });
}

export const offlineQueue = {
  enqueue,
  dequeueAll,
  removeQueued,
  incrementRetry,
  clearQueue,
  createSyncListener,
  getQueueSize,
};
