/**
 * Kabadiwala Connect — QR Handover View
 * STRICT RULE: QR code encodes ONLY the Lot UUID string.
 * Supports active lots dropdown selector & live refresh.
 */

import { renderLotQrCode, getManualFallbackCode } from '../qr-helper.js';
import { formatWeight, formatDate, showToast } from '../utils.js';
import { apiClient } from '../api.js';

export async function renderQrHandoverView(container, navigateTo) {
  container.innerHTML = `
    <div class="view-loading-spinner">
      <div class="spinner"></div>
      <p>Loading active lots...</p>
    </div>
  `;

  let activeLots = [];
  try {
    const lots = await apiClient.getMyLots().catch(() => []);
    if (Array.isArray(lots)) {
      activeLots = lots.filter(l => l.status === 'PENDING_HANDOVER' || l.status === 'POOLED');
    }
  } catch (err) {
    console.warn('Failed to load lots:', err);
  }

  // Determine currently selected lot
  let currentLot = null;
  if (window.activeLot && activeLots.some(l => l.lot_id === window.activeLot.lot_id)) {
    currentLot = activeLots.find(l => l.lot_id === window.activeLot.lot_id);
  } else if (activeLots.length > 0) {
    currentLot = activeLots[0];
  } else if (window.activeLot) {
    currentLot = window.activeLot;
  }

  // If no lots exist, render empty state
  if (!currentLot) {
    container.innerHTML = `
      <div class="view-transition">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-md);">
          <div>
            <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main);">QR Handover</h2>
            <p style="font-size: 0.8rem; color: var(--text-secondary);">Present QR to recycler for digital verification</p>
          </div>
          <button class="btn btn-sm btn-outline" id="backHomeEmptyBtn">✕ Close</button>
        </div>

        <div class="card" style="text-align: center; padding: var(--space-xl) var(--space-md); margin-top: var(--space-lg);">
          <div style="font-size: 3rem; margin-bottom: var(--space-sm);">📦</div>
          <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin-bottom: 6px;">No Active Lots Pending Handover</h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary); max-width: 320px; margin: 0 auto var(--space-lg) auto;">
            You do not currently have any scrap pooled into active lots awaiting recycler pickup.
          </p>
          <div style="display: flex; gap: 10px; justify-content: center;">
            <button class="btn btn-primary" id="createLotBtn">
              <span>➕ Create New Lot</span>
            </button>
            <button class="btn btn-secondary" id="viewStockBtn">
              <span>📊 View Stock</span>
            </button>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#backHomeEmptyBtn')?.addEventListener('click', () => navigateTo('dealer-home'));
    container.querySelector('#createLotBtn')?.addEventListener('click', () => navigateTo('create-lot'));
    container.querySelector('#viewStockBtn')?.addEventListener('click', () => navigateTo('my-stock'));
    return;
  }

  function renderView() {
    const manualCode = getManualFallbackCode(currentLot.lot_id);

    container.innerHTML = `
      <div class="view-transition">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-md);">
          <div>
            <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main);">QR Handover</h2>
            <p style="font-size: 0.8rem; color: var(--text-secondary);">Present QR to recycler for digital verification</p>
          </div>
          <button class="btn btn-sm btn-outline" id="backHomeBtn">✕ Done</button>
        </div>

        <!-- Lot Selector Dropdown if multiple active lots exist -->
        ${activeLots.length > 1 ? `
          <div class="form-group" style="margin-bottom: var(--space-md);">
            <label class="form-label" style="font-size: 0.8rem; font-weight: 700;">Select Active Lot to Display:</label>
            <select id="lotSelectorDropdown" class="form-control" style="background: var(--bg-card); color: var(--text-main); font-weight: 600;">
              ${activeLots.map(l => `
                <option value="${l.lot_id}" ${l.lot_id === currentLot.lot_id ? 'selected' : ''}>
                  ${l.category} • ${formatWeight(l.declared_weight)} (${l.status})
                </option>
              `).join('')}
            </select>
          </div>
        ` : ''}

        <!-- Live Handover Status Pill -->
        <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-card); padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-glass); margin-bottom: var(--space-md);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="network-dot" style="background-color: ${currentLot.status === 'COMPLETED' ? '#10b981' : '#f59e0b'};"></span>
            <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-main);">
              Status: <span id="lotStatusLabel" style="color: ${currentLot.status === 'COMPLETED' ? '#34d399' : '#fbbf24'};">${currentLot.status}</span>
            </span>
          </div>
          <button class="btn btn-sm btn-outline" id="refreshStatusBtn" style="padding: 4px 8px; font-size: 0.72rem;">
            🔄 Refresh
          </button>
        </div>

        <!-- Pure Lot UUID QR Card -->
        <div class="qr-container-card">
          <div style="font-size: 0.78rem; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">
            Digital Traceability Lot QR
          </div>

          <div class="qr-canvas-wrapper">
            <canvas id="lotQrCanvas"></canvas>
          </div>

          <!-- Strict Contract Notice -->
          <div style="font-size: 0.72rem; color: #94a3b8; margin-bottom: 6px;">
            🔒 Encodes <strong>Lot UUID ONLY</strong> (No sensitive metadata embedded)
          </div>

          <div class="qr-uuid-display">
            UUID: ${currentLot.lot_id}
          </div>

          <!-- Fallback Code -->
          <div class="qr-fallback-box">
            <div class="qr-fallback-label">Manual Verification Code</div>
            <div class="qr-fallback-code">${manualCode}</div>
          </div>
        </div>

        <!-- Lot Authoritative Metadata Breakdown -->
        <div class="card" style="margin-top: var(--space-md);">
          <div class="card-header">
            <span class="card-title" style="font-size: 0.92rem;">Lot Specification</span>
            <span class="badge badge-info">${currentLot.category}</span>
          </div>

          <div class="material-fact-row">
            <span class="material-fact-label">Declared Weight</span>
            <span class="material-fact-value" style="color: #38bdf8;">${formatWeight(currentLot.declared_weight)}</span>
          </div>

          <div class="material-fact-row">
            <span class="material-fact-label">Assigned Recycler</span>
            <span class="material-fact-value">${currentLot.recycler_name || 'Awaiting Recycler Assignment'}</span>
          </div>

          <div class="material-fact-row">
            <span class="material-fact-label">Creation Timestamp</span>
            <span class="material-fact-value">${formatDate(currentLot.created_at)}</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 10px; margin-top: var(--space-md);">
          <button class="btn btn-secondary" id="viewLedgerBtn">
            <span>📒 View Ledger</span>
          </button>
          <button class="btn btn-primary" id="doneHomeBtn">
            <span>🏠 Return Home</span>
          </button>
        </div>
      </div>
    `;

    // Render Canvas
    const canvas = container.querySelector('#lotQrCanvas');
    if (canvas) {
      renderLotQrCode(canvas, currentLot.lot_id);
    }

    // Attach Selector
    container.querySelector('#lotSelectorDropdown')?.addEventListener('change', (e) => {
      const selectedId = e.target.value;
      const found = activeLots.find(l => l.lot_id === selectedId);
      if (found) {
        currentLot = found;
        window.activeLot = found;
        renderView();
      }
    });

    // Status Refresh
    container.querySelector('#refreshStatusBtn')?.addEventListener('click', checkLotStatus);
    container.querySelector('#backHomeBtn')?.addEventListener('click', () => navigateTo('dealer-home'));
    container.querySelector('#doneHomeBtn')?.addEventListener('click', () => navigateTo('dealer-home'));
    container.querySelector('#viewLedgerBtn')?.addEventListener('click', () => navigateTo('ledger'));
  }

  async function checkLotStatus() {
    const statusLabel = container.querySelector('#lotStatusLabel');
    try {
      const updated = await apiClient.getLot(currentLot.lot_id).catch(() => null);
      if (updated && updated.status) {
        currentLot.status = updated.status;
        if (statusLabel) {
          statusLabel.textContent = currentLot.status;
          statusLabel.style.color = currentLot.status === 'COMPLETED' ? '#34d399' : '#fbbf24';
        }
        if (currentLot.status === 'COMPLETED') {
          showToast('Handover confirmed by recycler! Transaction complete.', 'success');
        } else {
          showToast(`Current Lot Status: ${currentLot.status}`, 'info');
        }
      } else {
        showToast('Lot status checked (Awaiting Recycler Scan)', 'info');
      }
    } catch (err) {
      console.warn('Status check failed:', err);
    }
  }

  renderView();
}
