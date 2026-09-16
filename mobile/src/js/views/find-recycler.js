/**
 * Kabadiwala Connect — Find Recycler View
 * Implements recommendation matching based on Distance (50%), Rate (30%), Pickup (20%).
 */

import { apiClient } from '../api.js';
import { formatCurrency, formatWeight, showToast } from '../utils.js';

export async function renderFindRecyclerView(container, navigateTo) {
  const lot = window.activeLot || {
    lot_id: 'lot-8c0f1234-demo',
    category: 'PCB',
    declared_weight: 30,
    status: 'POOLED'
  };

  container.innerHTML = `
    <div class="view-loading-spinner">
      <div class="spinner"></div>
      <p>Running Recycler Matching Algorithm...</p>
    </div>
  `;

  let recyclers = [];

  try {
    recyclers = await apiClient.matchRecyclers(lot.category).catch(() => null);
  } catch (err) {
    console.warn('Matching API failed, using fallback ranking:', err);
  }

  // Fallback demo recyclers if backend matching returned empty or offline
  if (!recyclers || recyclers.length === 0) {
    recyclers = [
      {
        recycler_id: 'r1-greencycle-uuid',
        company_name: 'GreenCycle Recycling Corp',
        address: 'Okhla Phase 1, New Delhi',
        distance_km: 12.4,
        rate_per_kg: 520,
        pickup_available: true,
        match_score: 92.5,
        breakdown: { distance_score: 45.0, rate_score: 28.5, pickup_score: 19.0 }
      },
      {
        recycler_id: 'r2-ecorecover-uuid',
        company_name: 'EcoRecover Technologies',
        address: 'Sector 58, Noida',
        distance_km: 24.8,
        rate_per_kg: 490,
        pickup_available: true,
        match_score: 78.2,
        breakdown: { distance_score: 32.0, rate_score: 27.2, pickup_score: 19.0 }
      },
      {
        recycler_id: 'r3-cleanearth-uuid',
        company_name: 'CleanEarth Recycling',
        address: 'Naraina Industrial Area, New Delhi',
        distance_km: 8.2,
        rate_per_kg: 470,
        pickup_available: false,
        match_score: 74.0,
        breakdown: { distance_score: 48.0, rate_score: 26.0, pickup_score: 0.0 }
      }
    ];
  }

  container.innerHTML = `
    <div class="view-transition">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-md);">
        <div>
          <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main);">Find Recycler</h2>
          <p style="font-size: 0.8rem; color: var(--text-secondary);">Matching for Lot: ${lot.category} (${formatWeight(lot.declared_weight)})</p>
        </div>
        <button class="btn btn-sm btn-outline" id="backHomeBtn">✕ Close</button>
      </div>

      <!-- Algorithm Ranking Weights Info -->
      <div class="card" style="background: var(--bg-input); padding: 12px; border-color: rgba(56, 189, 248, 0.2);">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;">
          <span>🎯 Distance (50%)</span>
          <span>💰 Rate (30%)</span>
          <span>🚚 Pickup (20%)</span>
        </div>
      </div>

      <!-- Ranked Recyclers List -->
      <div class="recycler-list">
        ${recyclers.map((r, index) => {
          const estimatedPayout = (lot.declared_weight || 30) * r.rate_per_kg;
          return `
            <div class="recycler-card">
              <div class="recycler-header">
                <div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span class="badge ${index === 0 ? 'badge-success' : 'badge-info'}" style="font-size: 0.65rem;">
                      #${index + 1} Best Match
                    </span>
                    <span class="recycler-distance">📍 ${r.distance_km} km away</span>
                  </div>
                  <div class="recycler-name" style="margin-top: 4px;">${r.company_name}</div>
                </div>
                <div class="recycler-score-badge">
                  ${(r.score !== undefined ? r.score : (r.match_score !== undefined ? r.match_score : 85)).toFixed(0)}% Match
                </div>
              </div>

              <div class="recycler-metrics-row">
                <div class="metric-item">
                  <span class="metric-label">Offered Rate</span>
                  <span class="metric-value rate">₹${r.rate_per_kg}/kg</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">Est. Lot Payout</span>
                  <span class="metric-value" style="color: #34d399;">${formatCurrency(estimatedPayout)}</span>
                </div>
                <div class="metric-item" style="text-align: right;">
                  <span class="metric-label">Pickup Service</span>
                  <span class="metric-value" style="font-size: 0.85rem; color: ${r.pickup_available ? '#34d399' : '#94a3b8'};">
                    ${r.pickup_available ? '✓ Available' : '✕ Drop-off'}
                  </span>
                </div>
              </div>

              <button class="btn btn-primary select-recycler-btn" data-id="${r.recycler_id}" data-name="${r.company_name}">
                <span>Select & Generate QR ➔</span>
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  container.querySelector('#backHomeBtn')?.addEventListener('click', () => navigateTo('dealer-home'));

  // Handle Recycler Selection
  container.querySelectorAll('.select-recycler-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const recyclerId = btn.getAttribute('data-id');
      const recyclerName = btn.getAttribute('data-name');

      btn.disabled = true;
      btn.innerHTML = '<span>⏳ Assigning Recycler...</span>';

      try {
        if (lot.lot_id) {
          try {
            await apiClient.assignRecycler(lot.lot_id, recyclerId);
          } catch (err) {
            console.warn('Backend recycler assign fallback:', err);
          }
        }

        lot.recycler_id = recyclerId;
        lot.recycler_name = recyclerName;
        lot.status = 'PENDING_HANDOVER';
        window.activeLot = lot;

        showToast(`Assigned to ${recyclerName}!`, 'success');
        navigateTo('qr-handover');
      } catch (err) {
        showToast(`Error assigning recycler: ${err.message}`, 'error');
        btn.disabled = false;
        btn.innerHTML = '<span>Select & Generate QR ➔</span>';
      }
    });
  });
}
