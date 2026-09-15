/**
 * Kabadiwala Connect — Dealer App Controller
 * Handles Dealer-only authentication, navigation, and sync.
 */

import { openDatabase } from './db.js';
import { apiClient } from './api.js';
import { syncManager } from './sync.js';
import { showToast } from './utils.js';

// Dealer Views only
import { renderLoginView } from './views/login.js';
import { renderDealerHomeView } from './views/dealer-home.js';
import { renderLogPurchaseView } from './views/log-purchase.js';
import { renderMyStockView } from './views/my-stock.js';
import { renderCreateLotView } from './views/create-lot.js';
import { renderFindRecyclerView } from './views/find-recycler.js';
import { renderQrHandoverView } from './views/qr-handover.js';
import { renderLedgerView } from './views/ledger.js';

class DealerApp {
  constructor() {
    this.currentView = 'login';
    this.contentEl = document.getElementById('appContent');
    this.networkBadge = document.getElementById('networkBadge');
    this.syncBannerBtn = document.getElementById('syncNowBannerBtn');
    this.dealerNav = document.getElementById('appBottomNav');
  }

  async init() {
    try {
      // 1. Initialize local IndexedDB
      await openDatabase();

      // 2. Initialize sync manager & network listeners
      syncManager.handleNetworkChange();
      await syncManager.checkPendingCount();

      // 3. Bind global event listeners
      this.bindEvents();

      // 4. Determine initial view based on auth token
      const token = apiClient.getToken();
      if (token) {
        this.navigateTo('dealer-home');
      } else {
        this.navigateTo('login');
      }
    } catch (err) {
      console.error('Dealer app init failed:', err);
      showToast('App initialized with local storage', 'info');
      this.navigateTo('login');
    }
  }

  bindEvents() {
    // Network status badge toggle (simulated offline demo)
    this.networkBadge?.addEventListener('click', () => {
      const isOnline = syncManager.toggleSimulatedOffline();
      showToast(
        isOnline ? 'Simulated Online Mode' : 'Simulated Airplane / Offline Mode',
        isOnline ? 'success' : 'info'
      );
    });

    // Sync now from banner
    this.syncBannerBtn?.addEventListener('click', () => {
      syncManager.syncNow(true);
    });

    // Dealer Bottom Navigation tabs
    this.dealerNav?.querySelectorAll('.nav-item[data-view]').forEach(item => {
      item.addEventListener('click', () => {
        const view = item.getAttribute('data-view');
        this.navigateTo(view);
      });
    });
  }

  updateNavActiveState(viewName) {
    this.dealerNav?.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Hide bottom nav on login view, show otherwise
    if (this.dealerNav) {
      this.dealerNav.style.display = viewName === 'login' ? 'none' : 'flex';
    }
  }

  async navigateTo(viewName) {
    this.currentView = viewName;
    this.updateNavActiveState(viewName);

    // Scroll to top
    this.contentEl.scrollTop = 0;

    const navigate = (v) => this.navigateTo(v);

    switch (viewName) {
      case 'login':
        renderLoginView(this.contentEl, navigate);
        break;
      case 'dealer-home':
        await renderDealerHomeView(this.contentEl, navigate);
        break;
      case 'log-purchase':
        renderLogPurchaseView(this.contentEl, navigate);
        break;
      case 'my-stock':
        await renderMyStockView(this.contentEl, navigate);
        break;
      case 'create-lot':
        await renderCreateLotView(this.contentEl, navigate);
        break;
      case 'find-recycler':
        await renderFindRecyclerView(this.contentEl, navigate);
        break;
      case 'qr-handover':
        await renderQrHandoverView(this.contentEl, navigate);
        break;
      case 'ledger':
        await renderLedgerView(this.contentEl, navigate);
        break;
      default:
        await renderDealerHomeView(this.contentEl, navigate);
        break;
    }
  }
}

// Initialize Dealer Application on DOM Ready
const app = new DealerApp();
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});

