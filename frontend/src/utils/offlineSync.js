/**
 * IndexedDB Offline Sync Utility for Field Technician Work Orders
 * Enables low-bandwidth / offline operations in Niger Delta remote sites.
 */

const DB_NAME = 'predictive_maintenance_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'offline_work_orders';

export const initOfflineDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
};

export const saveOfflineWorkOrderUpdate = async (workOrderId, updateData) => {
  const db = await initOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record = {
      workOrderId,
      updateData,
      timestamp: new Date().toISOString(),
      status: 'PENDING_SYNC'
    };
    const req = store.add(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e.target.error);
  });
};

export const getPendingOfflineUpdates = async () => {
  const db = await initOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
};

export const clearPendingOfflineUpdate = async (id) => {
  const db = await initOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
};

/**
 * Automatically syncs queued updates to backend API when connection is restored
 */
export const syncPendingWorkOrdersWithBackend = async (apiClient) => {
  if (!navigator.onLine) return { syncedCount: 0, status: 'OFFLINE' };

  const pending = await getPendingOfflineUpdates();
  if (pending.length === 0) return { syncedCount: 0, status: 'IDLE' };

  let syncedCount = 0;
  for (const item of pending) {
    try {
      if (apiClient) {
        await apiClient.patch(`/api/work-orders/${item.workOrderId}`, item.updateData);
      } else {
        await fetch(`/api/work-orders/${item.workOrderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.updateData)
        });
      }
      await clearPendingOfflineUpdate(item.id);
      syncedCount++;
    } catch (err) {
      console.error(`Failed to sync offline item ${item.id}`, err);
    }
  }

  return { syncedCount, status: 'SUCCESS' };
};
