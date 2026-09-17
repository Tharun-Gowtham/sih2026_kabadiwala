/**
 * Kabadiwala Connect — IndexedDB Persistent Local Storage
 * Ensures purchases and operations survive app close/restart when offline.
 */

const DB_NAME = 'kabadiwala_offline_db';
const DB_VERSION = 1;

let dbInstance = null;

export function openDatabase() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Purchases Store
      if (!db.objectStoreNames.contains('purchases')) {
        const purchaseStore = db.createObjectStore('purchases', { keyPath: 'purchase_id' });
        purchaseStore.createIndex('sync_status', 'sync_status', { unique: false });
        purchaseStore.createIndex('category', 'category', { unique: false });
        purchaseStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // 2. Lots Cache Store
      if (!db.objectStoreNames.contains('lots')) {
        const lotStore = db.createObjectStore('lots', { keyPath: 'lot_id' });
        lotStore.createIndex('status', 'status', { unique: false });
      }

      // 3. App Settings / Meta
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Save a purchase locally (Offline-First)
 * Preserves the purchase_id (UUID)
 */
export async function saveLocalPurchase(purchase) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('purchases', 'readwrite');
    const store = tx.objectStore('purchases');
    
    // Ensure sync_status defaults to PENDING_SYNC if not specified
    const record = {
      ...purchase,
      sync_status: purchase.sync_status || 'PENDING_SYNC',
      updated_at: new Date().toISOString()
    };

    const request = store.put(record);

    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve all purchases with sync_status === 'PENDING_SYNC'
 */
export async function getPendingPurchases() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('purchases', 'readonly');
    const store = tx.objectStore('purchases');
    const index = store.index('sync_status');
    const request = index.getAll('PENDING_SYNC');

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve all local purchases
 */
export async function getAllLocalPurchases() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('purchases', 'readonly');
    const store = tx.objectStore('purchases');
    const request = store.getAll();

    request.onsuccess = () => {
      const list = request.result || [];
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      resolve(list);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Mark a list of purchase IDs as SYNCED
 */
export async function markPurchasesSynced(purchaseIds) {
  if (!purchaseIds || purchaseIds.length === 0) return;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('purchases', 'readwrite');
    const store = tx.objectStore('purchases');

    let completed = 0;
    purchaseIds.forEach(id => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        if (getReq.result) {
          const updated = {
            ...getReq.result,
            sync_status: 'SYNCED',
            synced_at: new Date().toISOString()
          };
          store.put(updated);
        }
        completed++;
        if (completed === purchaseIds.length) {
          resolve();
        }
      };
    });

    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Save lot locally
 */
export async function saveLocalLot(lot) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('lots', 'readwrite');
    const store = tx.objectStore('lots');
    const request = store.put(lot);
    request.onsuccess = () => resolve(lot);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all local lots
 */
export async function getLocalLots() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('lots', 'readonly');
    const store = tx.objectStore('lots');
    const request = store.getAll();
    request.onsuccess = () => {
      const list = request.result || [];
      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      resolve(list);
    };
    request.onerror = () => reject(request.error);
  });
}
