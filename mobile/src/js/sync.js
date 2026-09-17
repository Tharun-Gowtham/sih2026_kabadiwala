/**
 * Kabadiwala Connect — Offline Synchronization Engine
 * Handles idempotent offline-first sync preserving purchase UUIDs.
 */

import { getPendingPurchases, markPurchasesSynced, getAllLocalPurchases } from './db.js';
import { apiClient } from './api.js';
import { showToast } from './utils.js';

class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.simulatedOffline = false;
    this.listeners = new Set();

    // Listen to browser network changes
    window.addEventListener('online', () => this.handleNetworkChange());
    window.addEventListener('offline', () => this.handleNetworkChange());
  }

  isOnline() {
    return !this.simulatedOffline && navigator.onLine;
  }

  toggleSimulatedOffline() {
    this.simulatedOffline = !this.simulatedOffline;
    this.handleNetworkChange();
    return this.isOnline();
  }

  handleNetworkChange() {
    const online = this.isOnline();
    const badge = document.getElementById('networkBadge');
    const text = document.getElementById('networkStatusText');

    if (badge && text) {
      if (online) {
        badge.className = 'network-badge online';
        text.textContent = 'Online';
      } else {
        badge.className = 'network-badge offline';
        text.textContent = this.simulatedOffline ? 'Airplane Mode' : 'Offline';
      }
    }

    this.notifyListeners({ type: 'network', online });

    if (online) {
      // Auto-trigger sync when back online
      this.syncNow(false);
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners(event) {
    this.listeners.forEach(fn => fn(event));
  }

  async checkPendingCount() {
    const pending = await getPendingPurchases();
    const count = pending.length;
    const banner = document.getElementById('syncBanner');
    const bannerText = document.getElementById('syncBannerText');

    if (banner && bannerText) {
      if (count > 0) {
        banner.style.display = 'flex';
        bannerText.textContent = `${count} purchase${count > 1 ? 's' : ''} pending sync`;
      } else {
        banner.style.display = 'none';
      }
    }

    this.notifyListeners({ type: 'pending_count', count });
    return count;
  }

  /**
   * Sync Now: Sends all local PENDING_SYNC purchases to backend
   * Preserving original purchase_ids
   */
  async syncNow(showFeedback = true) {
    if (this.isSyncing) return;
    if (!this.isOnline()) {
      if (showFeedback) {
        showToast('Device is offline. Connect to network to sync.', 'error');
      }
      return;
    }

    const pending = await getPendingPurchases();
    if (pending.length === 0) {
      if (showFeedback) {
        showToast('All purchases are already synced!', 'success');
      }
      await this.checkPendingCount();
      return;
    }

    this.isSyncing = true;
    this.notifyListeners({ type: 'sync_start' });

    try {
      // Prepare payload for /purchases/sync
      const payload = pending.map(p => ({
        purchase_id: p.purchase_id,
        category: p.category,
        weight: Number(p.weight),
        price: Number(p.price),
        unit_price: Number(p.unit_price) || (p.price / p.weight),
        collector_reference: p.collector_reference || null,
        photo_url: p.photo_url || null,
        created_at: p.created_at
      }));

      // Send to backend
      const result = await apiClient.syncPurchases(payload);

      // Mark local records as synced
      const syncedIds = pending.map(p => p.purchase_id);
      await markPurchasesSynced(syncedIds);

      const syncedCount = result.synced_count ?? syncedIds.length;
      const existingCount = result.existing_count ?? 0;

      if (showFeedback) {
        if (existingCount > 0) {
          showToast(`Synced ${syncedCount} new, acknowledged ${existingCount} existing.`, 'success');
        } else {
          showToast(`Successfully synced ${syncedCount} purchase(s) to server!`, 'success');
        }
      }

      this.notifyListeners({ type: 'sync_success', syncedCount });
    } catch (err) {
      console.error('Sync failed:', err);
      if (showFeedback) {
        showToast(`Sync failed: ${err.message}. Records remain saved safely locally.`, 'error');
      }
      this.notifyListeners({ type: 'sync_error', error: err });
    } finally {
      this.isSyncing = false;
      await this.checkPendingCount();
    }
  }
}

export const syncManager = new SyncManager();
