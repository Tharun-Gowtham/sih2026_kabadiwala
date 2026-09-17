/**
 * Kabadiwala Connect — Visual Price Board with Trends & Voice Read-out
 */

import { CANONICAL_CATEGORIES, formatCurrency } from '../utils.js';
import { i18n } from '../i18n.js';

export const MARKET_PRICE_DATA = [
  {
    id: 'PCB',
    currentRate: 450,
    minRate: 400,
    maxRate: 550,
    change: +15,
    changePercent: '+3.4%',
    trend: 'up',
    sparkline: [420, 430, 425, 435, 440, 445, 450],
    marketNote: 'Strong demand from precious metal smelters (gold/copper).'
  },
  {
    id: 'Cable',
    currentRate: 320,
    minRate: 280,
    maxRate: 380,
    change: +10,
    changePercent: '+3.2%',
    trend: 'up',
    sparkline: [300, 305, 310, 312, 315, 318, 320],
    marketNote: 'Domestic copper rod index trending upward.'
  },
  {
    id: 'LCD',
    currentRate: 180,
    minRate: 150,
    maxRate: 210,
    change: 0,
    changePercent: '0.0%',
    trend: 'stable',
    sparkline: [180, 180, 182, 179, 180, 181, 180],
    marketNote: 'Indium tin oxide recovery demand steady.'
  },
  {
    id: 'Battery',
    currentRate: 95,
    minRate: 80,
    maxRate: 120,
    change: +5,
    changePercent: '+5.5%',
    trend: 'up',
    sparkline: [85, 88, 88, 90, 92, 94, 95],
    marketNote: 'Lithium & cobalt recycling demand at 6-month high.'
  },
  {
    id: 'Motor/Magnet',
    currentRate: 90,
    minRate: 80,
    maxRate: 110,
    change: -2,
    changePercent: '-2.1%',
    trend: 'down',
    sparkline: [95, 94, 93, 93, 92, 91, 90],
    marketNote: 'Slight surplus in motor scrap dismantling yards.'
  },
  {
    id: 'CRT',
    currentRate: 45,
    minRate: 35,
    maxRate: 50,
    change: 0,
    changePercent: '0.0%',
    trend: 'stable',
    sparkline: [45, 45, 44, 45, 46, 45, 45],
    marketNote: 'Fixed rate for leaded glass disposal compliance.'
  },
  {
    id: 'Mixed Plastic',
    currentRate: 35,
    minRate: 25,
    maxRate: 40,
    change: -3,
    changePercent: '-7.8%',
    trend: 'down',
    sparkline: [40, 39, 38, 38, 37, 36, 35],
    marketNote: 'Polymer granulator capacity tight in north region.'
  }
];

export function renderPriceBoardView(container, navigateTo) {
  const t = (k, p) => i18n.t(k, p);

  container.innerHTML = `
    <div class="view-transition">
      <!-- Header -->
      <div style="margin-bottom: var(--space-md);">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <span style="font-size: 0.75rem; font-weight: 700; color: #10b981; text-transform: uppercase;">
              📈 ${t('priceBoardTab')}
            </span>
            <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main); margin-top: 2px;">
              ${t('priceBoardTitle')}
            </h2>
            <p style="font-size: 0.8rem; color: var(--text-secondary);">
              ${t('priceBoardSubtitle')}
            </p>
          </div>
        </div>
      </div>

      <!-- Spoken Audio Announcement Button -->
      <div class="card" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(14, 165, 233, 0.08)); border-color: rgba(52, 211, 153, 0.3); margin-bottom: var(--space-md); padding: 14px 16px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
          <div>
            <div style="font-size: 0.9rem; font-weight: 700; color: #ecfdf5;">
              📢 ${t('listenAllRates')}
            </div>
            <div style="font-size: 0.75rem; color: #a7f3d0; margin-top: 2px;">
              Listen to the daily market voice broadcast in your language
            </div>
          </div>
          <button class="btn btn-primary" id="listenAllRatesBtn" style="padding: 10px 16px; white-space: nowrap; border-radius: 20px;">
            <span>🔊 Listen</span>
          </button>
        </div>
      </div>

      <!-- Price Cards List -->
      <div class="price-board-list" style="display: flex; flex-direction: column; gap: 12px;">
        ${MARKET_PRICE_DATA.map(item => {
          const catMeta = CANONICAL_CATEGORIES.find(c => c.id === item.id) || {};
          const catName = i18n.getCategoryName(item.id);

          const trendIcon = item.trend === 'up' ? '▲' : (item.trend === 'down' ? '▼' : '●');
          const trendClass = item.trend === 'up' ? 'trend-up' : (item.trend === 'down' ? 'trend-down' : 'trend-stable');
          const trendLabel = item.trend === 'up' ? t('trendRising') : (item.trend === 'down' ? t('trendFalling') : t('trendStable'));

          // Render a simple SVG sparkline
          const sparklineSvg = generateSparkline(item.sparkline, item.trend);

          return `
            <div class="card price-item-card" data-cat="${item.id}" style="padding: 14px 16px;">
              <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 1.8rem;">${catMeta.icon || '📦'}</span>
                  <div>
                    <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-main); margin: 0;">
                      ${catName}
                    </h3>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">
                      ${t('marketRange')}: ₹${item.minRate} - ₹${item.maxRate} / kg
                    </div>
                  </div>
                </div>

                <!-- Rate & Trend Pill -->
                <div style="text-align: right;">
                  <div style="font-size: 1.25rem; font-weight: 800; color: #f8fafc; font-family: 'JetBrains Mono', monospace;">
                    ₹${item.currentRate}<span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">/kg</span>
                  </div>
                  <span class="trend-badge ${trendClass}">
                    ${trendIcon} ${item.changePercent}
                  </span>
                </div>
              </div>

              <!-- Sparkline & Market Note -->
              <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06); gap: 10px;">
                <div style="flex: 1; font-size: 0.74rem; color: #94a3b8; line-height: 1.3;">
                  ${item.marketNote}
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div style="width: 70px; height: 24px;">
                    ${sparklineSvg}
                  </div>
                  <button class="btn btn-sm btn-outline read-rate-btn" data-cat="${item.id}" data-rate="${item.currentRate}" title="Listen / सुनें">
                    <span>🔊</span>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // Bind Listen to All Rates
  const listenAllBtn = container.querySelector('#listenAllRatesBtn');
  listenAllBtn?.addEventListener('click', () => {
    const summaryText = i18n.t('speech.priceSummary');
    listenAllBtn.classList.add('pulse-anim');
    listenAllBtn.innerHTML = `<span>⏳ ${t('speaking')}</span>`;

    i18n.speak(summaryText, {
      onEnd: () => {
        listenAllBtn.classList.remove('pulse-anim');
        listenAllBtn.innerHTML = `<span>🔊 Listen</span>`;
      },
      onError: () => {
        listenAllBtn.classList.remove('pulse-anim');
        listenAllBtn.innerHTML = `<span>🔊 Listen</span>`;
      }
    });
  });

  // Bind Individual Category Rate Speakers
  container.querySelectorAll('.read-rate-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const catId = btn.getAttribute('data-cat');
      const rate = btn.getAttribute('data-rate');
      const catName = i18n.getCategoryName(catId);
      const lang = i18n.getLang();
      // Use speakable words instead of ₹ symbol which TTS engines cannot pronounce
      const text = lang === 'hi'
        ? `${catName}: ${rate} रुपये प्रति किलो।`
        : `${catName}: ${rate} rupees per kilogram.`;

      btn.classList.add('pulse-anim');
      i18n.speak(text, {
        onEnd: () => btn.classList.remove('pulse-anim'),
        onError: () => btn.classList.remove('pulse-anim')
      });
    });
  });
}

function generateSparkline(data, trend) {
  if (!data || data.length < 2) return '';
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = (max - min) || 1;
  const w = 70;
  const h = 24;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d - min) / range) * (h - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const strokeColor = trend === 'up' ? '#10b981' : (trend === 'down' ? '#ef4444' : '#94a3b8');

  return `
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow: visible;">
      <polyline
        fill="none"
        stroke="${strokeColor}"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        points="${points}"
      />
    </svg>
  `;
}
