/**
 * Kabadiwala Lite — Nearby Authorized Recyclers & Aggregators Directory
 * Enables informal collectors to discover authorized buyers, fair rates, and pickup options.
 */

import { CANONICAL_CATEGORIES } from '../utils.js';
import { i18n } from '../i18n.js';

export const AUTHORIZED_BUYERS = [
  {
    id: 'rec-01',
    name: 'GreenCycle E-Waste Recyclers',
    area: 'Mayapuri Industrial Area, Delhi',
    distanceKm: 1.8,
    cpcbNumber: 'CPCB/EW-REG/DL/2023/048',
    status: 'GOVT_AUTHORIZED',
    pickupAvailable: true,
    minWeightPickupKg: 50,
    contactNumber: '+91 98112 34567',
    rates: {
      'PCB': 465,
      'Battery': 105,
      'Cable': 335,
      'Motor/Magnet': 95
    }
  },
  {
    id: 'rec-02',
    name: 'EcoRecover Tech Solutions',
    area: 'Okhla Industrial Area Phase II, Delhi',
    distanceKm: 3.4,
    cpcbNumber: 'CPCB/EW-REG/DL/2022/112',
    status: 'GOVT_AUTHORIZED',
    pickupAvailable: true,
    minWeightPickupKg: 30,
    contactNumber: '+91 98223 45678',
    rates: {
      'PCB': 455,
      'LCD': 190,
      'CRT': 48,
      'Mixed Plastic': 38,
      'Cable': 325
    }
  },
  {
    id: 'rec-03',
    name: 'CleanEarth Recycling Hub',
    area: 'Narela Industrial Zone, Delhi',
    distanceKm: 6.2,
    cpcbNumber: 'SPCB/DEL-EWR/2024/091',
    status: 'SPCB_REGISTERED',
    pickupAvailable: false,
    minWeightPickupKg: 100,
    contactNumber: '+91 98334 56789',
    rates: {
      'PCB': 450,
      'Battery': 98,
      'Mixed Plastic': 36,
      'Motor/Magnet': 92
    }
  }
];

export function renderCollectorRecyclersModal(targetCategory = 'PCB') {
  let modal = document.getElementById('kwRecyclersModal');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'kwRecyclersModal';
  modal.className = 'lang-modal-backdrop';

  let selectedCat = targetCategory;

  function renderContent() {
    const matchingBuyers = AUTHORIZED_BUYERS.filter(b => b.rates[selectedCat]);

    modal.innerHTML = `
      <div class="lang-modal-card" style="max-width: 480px; max-height: 88vh; padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div>
            <span class="badge badge-success" style="margin-bottom: 4px;">🛡️ CPCB / SPCB Verified</span>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: #f8fafc; margin: 0;">
              Nearby Authorized Buyers
            </h3>
            <p style="font-size: 0.78rem; color: #94a3b8; margin-top: 2px;">
              Sell directly to registered recyclers for fair rates &amp; formal traceability
            </p>
          </div>
          <button class="btn btn-sm btn-outline" id="closeRecyclersModal">✕</button>
        </div>

        <!-- Filter Chips by Material -->
        <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 12px;">
          ${CANONICAL_CATEGORIES.map(c => `
            <button class="btn btn-sm ${c.id === selectedCat ? 'btn-primary' : 'btn-outline'} filter-cat-chip" data-cat="${c.id}" style="white-space: nowrap; font-size: 0.75rem; padding: 4px 10px;">
              ${c.icon} ${i18n.getCategoryName(c.id)}
            </button>
          `).join('')}
        </div>

        <!-- Buyers List -->
        <div style="display: flex; flex-direction: column; gap: 10px; max-height: 52vh; overflow-y: auto;">
          ${matchingBuyers.length === 0 ? `
            <div style="text-align: center; padding: 20px; color: #94a3b8;">
              No registered buyer currently buying ${selectedCat} in this immediate radius.
            </div>
          ` : matchingBuyers.map(b => {
            const offeredRate = b.rates[selectedCat];
            return `
              <div class="card buyer-item-card" style="padding: 14px; background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(148, 163, 184, 0.2);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                  <div>
                    <h4 style="font-size: 0.95rem; font-weight: 800; color: #f8fafc; margin: 0;">
                      ${b.name}
                    </h4>
                    <div style="font-size: 0.74rem; color: #38bdf8;">
                      📍 ${b.area} • <strong>${b.distanceKm} km away</strong>
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 1.25rem; font-weight: 900; color: #34d399; font-family: 'JetBrains Mono', monospace;">
                      ₹${offeredRate}<span style="font-size: 0.72rem; color: #94a3b8;">/kg</span>
                    </div>
                    <span class="badge ${b.pickupAvailable ? 'badge-success' : 'badge-warning'}" style="font-size: 0.65rem;">
                      ${b.pickupAvailable ? `🚚 Free Pickup (≥${b.minWeightPickupKg}kg)` : '🏬 Drop-off only'}
                    </span>
                  </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 0.72rem;">
                  <span style="color: #94a3b8; font-family: 'JetBrains Mono', monospace;">
                    Reg: ${b.cpcbNumber.slice(0, 18)}...
                  </span>
                  <a href="tel:${b.contactNumber}" class="btn btn-sm btn-primary" style="padding: 4px 10px; font-size: 0.75rem; text-decoration: none;">
                    📞 Call Buyer
                  </a>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    modal.querySelector('#closeRecyclersModal')?.addEventListener('click', () => modal.remove());

    modal.querySelectorAll('.filter-cat-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedCat = btn.getAttribute('data-cat');
        renderContent();
      });
    });
  }

  renderContent();
  document.body.appendChild(modal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}
