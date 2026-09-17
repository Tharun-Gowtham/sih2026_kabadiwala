/**
 * Kabadiwala Connect — Operational Dealer Home View
 */

import { apiClient } from '../api.js';
import { getPendingPurchases, getAllLocalPurchases } from '../db.js';
import { syncManager } from '../sync.js';
import { formatCurrency, formatWeight, formatDate } from '../utils.js';

export async function renderDealerHomeView(container, navigateTo) {
  const user = apiClient.getUser();
  const userName = user?.name || 'Ramesh Scrap Traders';

  // Load preliminary data
  let totalStockKg = 0;
  let totalPendingWeight = 0;
  let totalSpent = 0;
  let recentPurchases = [];

  try {
    const [stockData, pendingList, localPurchases] = await Promise.all([
      apiClient.getStock().catch(() => null),
      getPendingPurchases().catch(() => []),
      getAllLocalPurchases().catch(() => [])
    ]);

    if (stockData && stockData.total_available_weight !== undefined) {
      totalStockKg = stockData.total_available_weight;
    } else {
      // Aggregate from local purchases if backend not reachable
      totalStockKg = localPurchases.reduce((acc, p) => acc + Number(p.weight || 0), 0);
    }

    recentPurchases = localPurchases.slice(0, 4);
    totalSpent = localPurchases.reduce((acc, p) => acc + Number(p.price || 0), 0);
  } catch (err) {
    console.warn('Error loading home data:', err);
  }

  const pendingCount = (await getPendingPurchases()).length;

  container.innerHTML = `
    <div class="view-transition">
      <!-- Dealer Profile Banner -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-md);">
        <div>
          <span style="font-size: 0.78rem; font-weight: 700; color: #10b981; text-transform: uppercase;">Operational Hub</span>
          <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main);">${userName}</h2>
          <p style="font-size: 0.78rem; color: var(--text-muted);">Verified E-Waste Aggregator</p>
        </div>
        <button class="btn btn-sm btn-outline" id="logoutBtn" style="color: #f87171; border-color: rgba(239, 68, 68, 0.3);">
          Logout
        </button>
      </div>

      <!-- Key Operational Metrics Grid -->
      <div class="stats-grid">
        <div class="stat-box" style="border-left: 3px solid #10b981;">
          <span class="stat-label">Available Stock</span>
          <span class="stat-val" style="color: #34d399;">${formatWeight(totalStockKg)}</span>
          <span class="stat-sub">Ready for lot creation</span>
        </div>
        <div class="stat-box" style="border-left: 3px solid #f59e0b;">
          <span class="stat-label">Pending Sync</span>
          <span class="stat-val" style="color: ${pendingCount > 0 ? '#fbbf24' : '#94a3b8'};">${pendingCount} items</span>
          <span class="stat-sub" style="color: ${pendingCount > 0 ? '#fbbf24' : 'var(--text-muted)'};">
            ${pendingCount > 0 ? '⚡ Tap to sync' : '✓ All synced'}
          </span>
        </div>
      </div>

      <!-- Quick Operational Actions -->
      <div style="margin-bottom: var(--space-md);">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
          Operational Workflows
        </h3>
        <div class="quick-actions-grid">
          <div class="action-card" data-nav="log-purchase">
            <div class="action-card-icon">➕</div>
            <span class="action-card-title">Log Purchase</span>
            <span class="action-card-desc">Record scrap from field collectors</span>
          </div>
          
          <div class="action-card info" data-nav="my-stock">
            <div class="action-card-icon">📦</div>
            <span class="action-card-title">My Stock</span>
            <span class="action-card-desc">View inventory by category</span>
          </div>

          <div class="action-card accent" data-nav="create-lot">
            <div class="action-card-icon">🏷️</div>
            <span class="action-card-title">Create Lot</span>
            <span class="action-card-desc">Pool stock for recycler sale</span>
          </div>

          <div class="action-card purple" data-nav="find-recycler">
            <div class="action-card-icon">🔍</div>
            <span class="action-card-title">Find Recycler</span>
            <span class="action-card-desc">Ranked rate & distance matching</span>
          </div>

          <div class="action-card" data-nav="qr-handover">
            <div class="action-card-icon">📲</div>
            <span class="action-card-title">QR Handover</span>
            <span class="action-card-desc">Display Lot UUID for transfer</span>
          </div>

          <div class="action-card" data-nav="ledger">
            <div class="action-card-icon">📒</div>
            <span class="action-card-title">Dealer Ledger</span>
            <span class="action-card-desc">Purchases vs confirmed sales</span>
          </div>
        </div>
      </div>

      <!-- Recent Local Activity Stream -->
      <div class="card">
        <div class="card-header">
          <span class="card-title" style="font-size: 0.95rem;">Recent Purchases</span>
          <button class="btn btn-sm btn-outline" id="viewAllPurchasesBtn">View All</button>
        </div>
        ${recentPurchases.length === 0 ? `
          <div style="text-align: center; padding: var(--space-md); color: var(--text-muted);">
            <p>No purchases recorded yet.</p>
            <button class="btn btn-sm btn-primary" id="startFirstPurchaseBtn" style="margin-top: 8px;">
              Log First Purchase
            </button>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${recentPurchases.map(p => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <div>
                  <div style="font-weight: 700; color: var(--text-main); font-size: 0.88rem;">${p.category} — ${formatWeight(p.weight)}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">${formatDate(p.created_at)} • ${p.collector_reference || 'Walk-in'}</div>
                </div>
                <div style="text-align: right;">
                  <div style="font-weight: 700; color: #f87171; font-size: 0.88rem;">-${formatCurrency(p.price)}</div>
                  <span class="badge ${p.sync_status === 'SYNCED' ? 'badge-success' : 'badge-warning'}" style="font-size: 0.65rem;">
                    ${p.sync_status === 'SYNCED' ? 'SYNCED' : 'PENDING'}
                  </span>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

    </div>
  `;

  // Attach navigation listeners
  container.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => {
      const view = el.getAttribute('data-nav');
      navigateTo(view);
    });
  });

  container.querySelector('#logoutBtn')?.addEventListener('click', () => {
    apiClient.logout();
    navigateTo('login');
  });

  container.querySelector('#startFirstPurchaseBtn')?.addEventListener('click', () => {
    navigateTo('log-purchase');
  });

  container.querySelector('#viewAllPurchasesBtn')?.addEventListener('click', () => {
    navigateTo('ledger');
  });
}
