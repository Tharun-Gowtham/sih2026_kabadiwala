/**
 * Kabadiwala Connect — Dealer App Controller
 * Handles Dealer-only authentication, navigation, sync, 8-language i18n, and GPS stamping.
 */

import { openDatabase } from './db.js';
import { apiClient } from './api.js';
import { syncManager } from './sync.js';
import { showToast } from './utils.js';
import { i18n } from './i18n.js';
import { geoEngine } from './geo.js';

// Dealer Views
import { renderLoginView } from './views/login.js';
import { renderDealerHomeView } from './views/dealer-home.js';
import { renderLogPurchaseView } from './views/log-purchase.js';
import { renderMyStockView } from './views/my-stock.js';
import { renderCreateLotView } from './views/create-lot.js';
import { renderFindRecyclerView } from './views/find-recycler.js';
import { renderQrHandoverView } from './views/qr-handover.js';
import { renderLedgerView } from './views/ledger.js';
import { renderPriceBoardView } from './views/price-board.js';

class DealerApp {
  constructor() {
    this.currentView = 'login';
    this.contentEl = document.getElementById('appContent');
    this.networkBadge = document.getElementById('networkBadge');
    this.syncBannerBtn = document.getElementById('syncNowBannerBtn');
    this.dealerNav = document.getElementById('appBottomNav');
    this.topBarRight = document.querySelector('#appTopBar .app-topbar-right');
  }

  async init() {
    try {
      // 1. Initialize local IndexedDB
      await openDatabase();

      // 2. Initialize GPS location acquisition
      geoEngine.acquireLocation();

      // 3. Setup Header controls (GPS badge & Language Picker)
      this.setupHeaderControls();

      // 4. Initialize sync manager & network listeners
      syncManager.handleNetworkChange();
      await syncManager.checkPendingCount();

      // 5. Bind global event listeners
      this.bindEvents();

      // 6. Language change event listener
      i18n.onLanguageChange(() => {
        this.updateHeaderLabels();
        this.updateNavLabels();
        this.navigateTo(this.currentView);
      });

      this.updateNavLabels();

      // 7. Determine initial view based on auth token
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

  setupHeaderControls() {
    if (!this.topBarRight) return;

    // Prepend GPS and Language buttons before network badge
    const headerControls = document.createElement('div');
    headerControls.style.display = 'flex';
    headerControls.style.alignItems = 'center';
    headerControls.style.gap = '8px';
    headerControls.innerHTML = `
      ${geoEngine.renderGpsBadge()}
      ${i18n.renderLanguagePickerButton()}
    `;

    this.topBarRight.insertBefore(headerControls, this.topBarRight.firstChild);

    headerControls.querySelector('#kwLangPickerBtn')?.addEventListener('click', () => {
      i18n.openLanguageModal();
    });

    geoEngine.onLocationChange(() => {
      const badge = document.getElementById('kwGpsBadge');
      if (badge) {
        const isLocked = geoEngine.status === 'locked';
        badge.className = `gps-badge ${isLocked ? 'gps-locked' : 'gps-fallback'}`;
        badge.querySelector('.gps-text').innerText = `📍 ${geoEngine.formatCoords()}`;
      }
    });
  }

  updateHeaderLabels() {
    const btn = document.getElementById('kwLangPickerBtn');
    if (btn) {
      const langConfig = i18n.SUPPORTED_LANGUAGES?.find(l => l.code === i18n.getLang()) || { flag: '🇮🇳', nativeName: 'भाषा' };
      btn.querySelector('.lang-flag').innerText = langConfig.flag || '🇮🇳';
      btn.querySelector('.lang-code').innerText = langConfig.nativeName || 'भाषा';
    }
  }

  updateNavLabels() {
    const navItems = this.dealerNav?.querySelectorAll('.nav-item');
    if (!navItems) return;

    navItems.forEach(item => {
      const view = item.getAttribute('data-view');
      const labelEl = item.querySelector('.nav-label');
      if (!labelEl) return;

      if (view === 'dealer-home') labelEl.innerText = i18n.t('homeTab');
      if (view === 'log-purchase') labelEl.innerText = i18n.t('purchaseTab');
      if (view === 'my-stock') labelEl.innerText = i18n.t('stockTab');
      if (view === 'create-lot') labelEl.innerText = i18n.t('lotsTab');
      if (view === 'ledger') labelEl.innerText = i18n.t('ledgerTab');
    });
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
      case 'price-board':
        renderPriceBoardView(this.contentEl, navigate);
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
