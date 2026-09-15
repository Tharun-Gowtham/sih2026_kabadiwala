/**
 * Kabadiwala Lite — Collector App Controller
 * Handles the Kabadiwala Lite / Collector-only workflow:
 *   Photo Capture → ML Inference → Confirm/Correct → Material Info
 *
 * No Dealer screens, no sync, no IndexedDB.
 */

import { showToast } from './utils.js';

// Collector View only
import { renderCollectorLiteView } from './views/collector-lite.js';

// Collector Info (Material Guide) — rendered by same collector-lite view
// with a flag to show the material guide panel directly
import { CANONICAL_CATEGORIES, getCategoryMeta } from './utils.js';

class CollectorApp {
  constructor() {
    this.currentView = 'collector-lite';
    this.contentEl = document.getElementById('appContent');
    this.collectorNav = document.getElementById('collectorBottomNav');
  }

  init() {
    try {
      // Bind bottom nav events
      this.bindEvents();

      // Open directly to Collector Lite (no login required)
      this.navigateTo('collector-lite');
    } catch (err) {
      console.error('Kabadiwala Lite init failed:', err);
      showToast('Failed to load app. Please refresh.', 'error');
    }
  }

  bindEvents() {
    this.collectorNav?.querySelectorAll('.nav-item[data-view]').forEach(item => {
      item.addEventListener('click', () => {
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

      case 'collector-info':
        // Render the Material Info guide panel directly
        this._renderMaterialGuide();
        break;

      default:
        renderCollectorLiteView(this.contentEl, navigate);
        break;
    }
  }

  _renderMaterialGuide() {
    this.contentEl.innerHTML = `
      <div class="view-transition">
        <div style="margin-bottom: var(--space-md);">
          <span style="font-size: 0.75rem; font-weight: 700; color: #38bdf8; text-transform: uppercase;">Reference Guide</span>
          <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main);">Material Guide</h2>
          <p style="font-size: 0.8rem; color: var(--text-secondary);">Safety, sorting tips & indicative rates for all 7 e-waste categories</p>
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

          return `
            <div class="material-info-card" style="margin-bottom: var(--space-md);">
              <div class="card-header">
                <span class="card-title" style="font-size: 0.95rem;">${cat.icon} ${cat.name}</span>
                <span class="badge badge-info">${info.indicativeRate || ''}</span>
              </div>

              <div class="material-fact-row">
                <span class="material-fact-label">Recyclability</span>
                <span class="material-fact-value">${info.recyclability || '—'}</span>
              </div>

              <div class="material-fact-row">
                <span class="material-fact-label">Field Sorting Tip</span>
                <span class="material-fact-value" style="font-size: 0.8rem;">${info.sortingTips || '—'}</span>
              </div>

              <div class="material-safety-note">
                ${info.safetyNote || ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
}

// Initialize Kabadiwala Lite Application on DOM Ready
const app = new CollectorApp();
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
