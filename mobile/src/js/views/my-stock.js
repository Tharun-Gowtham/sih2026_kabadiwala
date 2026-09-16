/**
 * Kabadiwala Connect — My Stock View
 * Shows authoritative currently available material ready for lot pooling.
 */

import { apiClient } from '../api.js';
import { getAllLocalPurchases } from '../db.js';
import { CANONICAL_CATEGORIES, formatWeight, formatCurrency, getCategoryMeta } from '../utils.js';

export async function renderMyStockView(container, navigateTo) {
  container.innerHTML = `
    <div class="view-loading-spinner">
      <div class="spinner"></div>
      <p>Loading authoritative stock...</p>
    </div>
  `;

  let stockItems = [];
  let totalAvailableWeight = 0;

  try {
    // Attempt to fetch authoritative stock from backend
    const stockData = await apiClient.getStock().catch(() => null);

    const categoriesList = stockData ? (stockData.categories || stockData.items) : null;
    if (categoriesList && Array.isArray(categoriesList)) {
      stockItems = categoriesList;
      totalAvailableWeight = stockData.total_available_weight !== undefined ? stockData.total_available_weight : stockItems.reduce((acc, i) => acc + (i.available_weight || 0), 0);
    } else {
      // Aggregate from local database
      const localPurchases = await getAllLocalPurchases();
      const grouped = {};
      localPurchases.forEach(p => {
        if (!p.lot_id) { // Not pooled into lot yet
          if (!grouped[p.category]) {
            grouped[p.category] = { category: p.category, available_weight: 0, purchase_count: 0, total_price: 0 };
          }
          grouped[p.category].available_weight += Number(p.weight || 0);
          grouped[p.category].purchase_count += 1;
          grouped[p.category].total_price += Number(p.price || 0);
        }
      });

      stockItems = Object.values(grouped).map(g => ({
        category: g.category,
        available_weight: g.available_weight,
        purchase_count: g.purchase_count,
        average_unit_price: g.available_weight > 0 ? (g.total_price / g.available_weight) : 0
      }));

      totalAvailableWeight = stockItems.reduce((acc, i) => acc + i.available_weight, 0);
    }
  } catch (err) {
    console.warn('Error fetching stock:', err);
  }

  container.innerHTML = `
    <div class="view-transition">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-md);">
        <div>
          <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main);">Available Stock</h2>
          <p style="font-size: 0.8rem; color: var(--text-secondary);">Unsold scrap ready for lot aggregation</p>
        </div>
        <button class="btn btn-sm btn-primary" id="quickLogBtn" style="width: auto;">
          ➕ Add Scrap
        </button>
      </div>

      <!-- Stock Total Summary Card -->
      <div class="card" style="background: linear-gradient(135deg, #064e3b 0%, #0f172a 100%); border-color: rgba(16, 185, 129, 0.3);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 0.75rem; color: #a7f3d0; text-transform: uppercase; font-weight: 700;">Total Inventory</div>
            <div style="font-size: 1.8rem; font-weight: 800; color: #ffffff; font-family: var(--font-mono);">
              ${formatWeight(totalAvailableWeight)}
            </div>
          </div>
          <div style="text-align: right;">
            <span class="badge badge-success">${stockItems.length} Categories</span>
          </div>
        </div>
      </div>

      <!-- Category Breakdown List -->
      <div style="margin-bottom: var(--space-md);">
        <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
          Stock by Material Category
        </h3>

        ${stockItems.length === 0 ? `
          <div class="card" style="text-align: center; padding: var(--space-xl) var(--space-md);">
            <div style="font-size: 2.5rem; margin-bottom: 8px;">📦</div>
            <h4 style="color: var(--text-main); font-size: 1.1rem; margin-bottom: 4px;">No Available Stock</h4>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: var(--space-md);">
              Record your scrap purchases to build inventory for recycler lot creation.
            </p>
            <button class="btn btn-primary" id="logFirstScrapBtn" style="max-width: 200px; margin: 0 auto;">
              Log Scrap Purchase
            </button>
          </div>
        ` : `
          <div class="stock-list">
            ${stockItems.map(item => {
              const meta = getCategoryMeta(item.category);
              const estValue = item.available_weight * (item.average_unit_price || meta.baseRate);
              return `
                <div class="stock-item-card" data-cat="${item.category}" data-weight="${item.available_weight}">
                  <div class="stock-item-left">
                    <span class="stock-cat-icon">${meta.icon}</span>
                    <div>
                      <div class="stock-cat-name">${item.category}</div>
                      <div class="stock-cat-sub">${item.purchase_count || 1} batch(es) • ~${formatCurrency(estValue)}</div>
                    </div>
                  </div>
                  <div class="stock-item-right">
                    <div class="stock-qty">${formatWeight(item.available_weight)}</div>
                    <button class="btn btn-sm btn-outline create-lot-btn" style="margin-top: 4px; padding: 4px 8px; font-size: 0.72rem;">
                      Create Lot ➔
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    </div>
  `;

  container.querySelector('#quickLogBtn')?.addEventListener('click', () => navigateTo('log-purchase'));
  container.querySelector('#logFirstScrapBtn')?.addEventListener('click', () => navigateTo('log-purchase'));

  container.querySelectorAll('.stock-item-card').forEach(card => {
    card.addEventListener('click', () => {
      const cat = card.getAttribute('data-cat');
      const w = card.getAttribute('data-weight');
      window.selectedLotCategory = cat;
      window.selectedLotMaxWeight = w;
      navigateTo('create-lot');
    });
  });
}
