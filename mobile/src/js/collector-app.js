/**
 * Kabadiwala Lite — Collector App Controller
 * Handles the Kabadiwala Lite / Collector-only workflow:
 *   1. 4-Step Guided Scrap Photo & On-Device ML Identification
 *   2. Instant Value Calculator with Spoken Audio
 *   3. Price Board & 30-Day Trends
 *   4. My Slips & Daily Earnings Ledger
 *   5. Material Guide & Spoken Safety Advice
 *   6. 8-Language Vernacular Switcher & Geolocation GPS Stamping
 */

import { showToast, CANONICAL_CATEGORIES } from './utils.js';
import { i18n } from './i18n.js';
import { geoEngine } from './geo.js';
import { syncManager } from './sync.js';
import { renderCollectorLiteView } from './views/collector-lite.js';
import { renderPriceBoardView } from './views/price-board.js';
import { renderCollectorLedgerView } from './views/collector-ledger.js';

class CollectorApp {
  constructor() {
    this.currentView = 'collector-lite';
    this.contentEl = document.getElementById('appContent');
    this.collectorNav = document.getElementById('collectorBottomNav');
    this.topBarRight = document.querySelector('#appTopBar .app-topbar-right');
  }

  async init() {
    try {
      // 1. Initialize GPS acquisition
      geoEngine.acquireLocation();

      // 2. Setup Header Controls (Network Toggle, Language Picker & GPS Badge)
      this.setupHeaderControls();

      // 3. Bind bottom nav events
      this.bindEvents();

      // 4. Re-render on language change
      i18n.onLanguageChange(() => {
        this.updateHeaderLabels();
        this.updateNavLabels();
        this.navigateTo(this.currentView);
      });

      this.updateNavLabels();

      // 5. Open directly to Collector Lite
      this.navigateTo('collector-lite');
    } catch (err) {
      console.error('Kabadiwala Lite init failed:', err);
      showToast('Failed to load app. Please refresh.', 'error');
    }
  }

  setupHeaderControls() {
    if (!this.topBarRight) return;

    const isOnline = syncManager.isOnline();
    this.topBarRight.innerHTML = `
      <button class="network-badge ${isOnline ? 'online' : 'offline'}" id="networkBadge" title="Network status. Click to toggle simulated offline/airplane mode.">
        <span class="network-dot"></span>
        <span class="network-text" id="networkStatusText">${isOnline ? 'Online' : 'Offline'}</span>
      </button>
      ${geoEngine.renderGpsBadge()}
      ${i18n.renderLanguagePickerButton()}
    `;

    // Bind Network Toggle
    this.topBarRight.querySelector('#networkBadge')?.addEventListener('click', () => {
      const nowOnline = syncManager.toggleSimulatedOffline();
      showToast(
        nowOnline ? '🟢 Online: Connected to network' : '🔴 Offline Mode: Zero internet needed — all features work 100% locally',
        nowOnline ? 'success' : 'warning'
      );
    });

    // Bind Language Modal opener
    this.topBarRight.querySelector('#kwLangPickerBtn')?.addEventListener('click', () => {
      i18n.openLanguageModal();
    });

    // Update GPS badge on location change
    geoEngine.onLocationChange(() => {
      const badge = document.getElementById('kwGpsBadge');
      if (badge) {
        const isLocked = geoEngine.status === 'locked';
        badge.className = `gps-badge ${isLocked ? 'gps-locked' : 'gps-fallback'}`;
        const label = isLocked ? 'GPS Active' : 'Offline GPS';
        const textEl = badge.querySelector('.gps-text');
        if (textEl) textEl.innerText = label;
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
    const roleBadge = document.getElementById('appRoleBadge');
    if (roleBadge) {
      roleBadge.innerText = 'Lite';
    }
  }

  updateNavLabels() {
    const navItems = this.collectorNav?.querySelectorAll('.nav-item');
    if (!navItems) return;

    navItems.forEach(item => {
      const view = item.getAttribute('data-view');
      const labelEl = item.querySelector('.nav-label');
      if (!labelEl) return;

      if (view === 'collector-lite') labelEl.innerText = i18n.t('scannerTab');
      if (view === 'price-board') labelEl.innerText = i18n.t('priceBoardTab');
      if (view === 'collector-ledger') labelEl.innerText = i18n.t('ledgerTab');
      if (view === 'collector-info') labelEl.innerText = i18n.t('materialGuideTab');
    });
  }

  bindEvents() {
    this.collectorNav?.querySelectorAll('.nav-item[data-view]').forEach(item => {
      item.addEventListener('click', () => {
        if ('vibrate' in navigator) navigator.vibrate(15);
        const view = item.getAttribute('data-view');
        if (view) this.navigateTo(view);
      });
    });
  }

  updateNavActiveState(viewName) {
    this.collectorNav?.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  navigateTo(viewName) {
    this.currentView = viewName;
    this.updateNavActiveState(viewName);

    // Scroll to top
    this.contentEl.scrollTop = 0;

    const navigate = (v) => this.navigateTo(v);

    switch (viewName) {
      case 'collector-lite':
        renderCollectorLiteView(this.contentEl, navigate);
        break;

      case 'price-board':
        renderPriceBoardView(this.contentEl, navigate);
        break;

      case 'collector-ledger':
        renderCollectorLedgerView(this.contentEl, navigate);
        break;

      case 'collector-info':
        this._renderMaterialGuide();
        break;

      default:
        renderCollectorLiteView(this.contentEl, navigate);
        break;
    }
  }

  _renderMaterialGuide() {
    const t = (k, p) => i18n.t(k, p);

    this.contentEl.innerHTML = `
      <div class="view-transition">
        <div style="margin-bottom: var(--space-md);">
          <span style="font-size: 0.75rem; font-weight: 700; color: #38bdf8; text-transform: uppercase;">
            ℹ️ ${t('materialGuideTab')}
          </span>
          <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main); margin-top: 2px;">
            Material &amp; Safety Guide
          </h2>
          <p style="font-size: 0.8rem; color: var(--text-secondary);">
            Hazardous safety rules, sorting guidelines &amp; spoken advice for all 7 e-waste categories
          </p>
        </div>

        ${CANONICAL_CATEGORIES.map(cat => {
          const info = {
            'PCB': { recyclability: 'High (Precious Metals: Gold, Silver, Copper)', safetyNote: '⚠️ Contains solder alloys and trace lead/brominated flame retardants. Handle with dry gloves.', indicativeRate: '₹400 - ₹550 / kg', sortingTips: 'Separate motherboards from low-grade power supply boards.' },
            'CRT': { recyclability: 'Moderate (Lead Glass, Copper Yoke)', safetyNote: '⚠️ High vacuum hazard and toxic leaded funnel glass. Do NOT crush or puncture screen.', indicativeRate: '₹35 - ₹50 / kg', sortingTips: 'Keep vacuum funnel intact to prevent hazardous implosion.' },
            'LCD': { recyclability: 'Moderate (Indium Tin Oxide, Backlight CCFL/LED)', safetyNote: '⚠️ Older models contain CCFL mercury backlights. Avoid flexing panel.', indicativeRate: '₹150 - ₹210 / kg', sortingTips: 'Store flat to prevent glass breakage.' },
            'Cable': { recyclability: 'Very High (High-purity Copper / Aluminum Wire)', safetyNote: '⚠️ Do NOT open-burn insulation. Use mechanical stripping only.', indicativeRate: '₹280 - ₹380 / kg', sortingTips: 'Bundle ribbon cables and high-voltage cords separately.' },
            'Battery': { recyclability: 'Critical Circularity (Lithium, Cobalt, Nickel, Lead)', safetyNote: '🚨 Severe fire and chemical burn hazard! Insulate terminals with non-conductive tape.', indicativeRate: '₹80 - ₹120 / kg', sortingTips: 'Never mix swollen Li-ion pouches with heavy lead-acid units.' },
            'Motor/Magnet': { recyclability: 'High (Copper windings, Rare Earth Neodymium, Steel core)', safetyNote: '⚠️ Strong pinch hazard from permanent rare-earth magnets.', indicativeRate: '₹80 - ₹110 / kg', sortingTips: 'Heavy steel housing can be separated from inner copper stator.' },
            'Mixed Plastic': { recyclability: 'Moderate (Polymer Pelletization)', safetyNote: 'ℹ️ Non-hazardous but ensure no chemical residue.', indicativeRate: '₹25 - ₹40 / kg', sortingTips: 'Remove rubber gaskets and metal screws before processing.' }
          }[cat.id] || {};

          const catName = i18n.getCategoryName(cat.id);

          return `
            <div class="material-info-card" style="margin-bottom: var(--space-md);">
              <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                <span class="card-title" style="font-size: 0.95rem;">${cat.icon} ${catName}</span>
                <button class="btn btn-sm btn-outline guide-speak-btn" data-cat="${cat.id}" data-text="${info.safetyNote}" title="Listen / सुनें">
                  <span>🔊 ${t('listenSafety')}</span>
                </button>
              </div>

              <div class="material-fact-row">
                <span class="material-fact-label">${t('recyclability')}</span>
                <span class="material-fact-value">${info.recyclability || '—'}</span>
              </div>

              <div class="material-fact-row">
                <span class="material-fact-label">${t('fieldTip')}</span>
                <span class="material-fact-value" style="font-size: 0.8rem;">${info.sortingTips || '—'}</span>
              </div>

              <div class="material-safety-note" style="margin-top: 8px;">
                ${info.safetyNote || ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Bind Safety Audio playback
    this.contentEl.querySelectorAll('.guide-speak-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const catId = btn.getAttribute('data-cat');
        const text = btn.getAttribute('data-text');
        const catName = i18n.getCategoryName(catId);
        const cleanText = `${catName}: ${text.replace(/[⚠️🚨ℹ️]/g, '')}`;

        btn.classList.add('pulse-anim');
        i18n.speak(cleanText, {
          onEnd: () => btn.classList.remove('pulse-anim'),
          onError: () => btn.classList.remove('pulse-anim')
        });
      });
    });
  }
}

// Initialize Kabadiwala Lite Application on DOM Ready
const app = new CollectorApp();
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
