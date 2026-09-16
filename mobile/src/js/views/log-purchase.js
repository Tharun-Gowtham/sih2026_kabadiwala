/**
 * Kabadiwala Connect — Log Purchase View (Offline-First)
 */

import { CANONICAL_CATEGORIES, generateUUID, formatCurrency, showToast } from '../utils.js';
import { saveLocalPurchase } from '../db.js';
import { syncManager } from '../sync.js';
import { apiClient } from '../api.js';
import { i18n } from '../i18n.js';
import { geoEngine } from '../geo.js';

export function renderLogPurchaseView(container, navigateTo) {
  let selectedCategory = 'PCB';
  let photoDataUrl = null;

  const defaultCategory = CANONICAL_CATEGORIES[0];
  const geo = geoEngine.currentPosition || geoEngine.fallbackCoords;

  container.innerHTML = `
    <div class="view-transition">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-md);">
        <div>
          <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main);">Log Scrap Purchase</h2>
          <p style="font-size: 0.8rem; color: var(--text-secondary);">
            Offline-first scrap entry • 📍 ${geoEngine.formatCoords(geo)}
          </p>
        </div>
        <button class="btn btn-sm btn-outline" id="backHomeBtn">✕ Close</button>
      </div>

      <form id="logPurchaseForm">
        <!-- 1. Category Selection -->
        <div class="form-group">
          <label class="form-label">Select Material Category (1 of 7)</label>
          <div class="category-grid" id="categoryPickerGrid">
            ${CANONICAL_CATEGORIES.map(cat => `
              <div class="category-option ${cat.id === selectedCategory ? 'selected' : ''}" data-cat="${cat.id}">
                <span class="cat-icon">${cat.icon}</span>
                <div>
                  <div class="cat-name">${i18n.getCategoryName(cat.id)}</div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">₹${cat.baseRate}/kg ref</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 2. Weight & Price -->
        <div class="stats-grid" style="margin-bottom: 0;">
          <div class="form-group">
            <label class="form-label" for="scrapWeight">Weight (kg) *</label>
            <div class="input-with-affix input-with-suffix">
              <input 
                type="number" 
                id="scrapWeight" 
                class="form-input" 
                placeholder="0.00" 
                step="0.01" 
                min="0.01"
                required
              />
              <span class="input-suffix">kg</span>
            </div>
            <div class="form-error" id="weightError" style="display: none;">Weight must be greater than 0 kg</div>
          </div>

          <div class="form-group">
            <label class="form-label" for="scrapPrice">Total Price (₹) *</label>
            <div class="input-with-affix input-with-prefix">
              <span class="input-prefix">₹</span>
              <input 
                type="number" 
                id="scrapPrice" 
                class="form-input" 
                placeholder="0.00" 
                step="1" 
                min="0"
                required
              />
            </div>
          </div>
        </div>

        <!-- Price Rate Indicator -->
        <div style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: var(--space-md); display: flex; justify-content: space-between;">
          <span>Effective Rate: <strong id="effectiveRateText" style="color: #38bdf8;">₹0.00 / kg</strong></span>
          <span id="suggestedPricePrompt" style="color: var(--color-primary); cursor: pointer;">Use standard rate</span>
        </div>

        <!-- 3. Optional Collector Reference & Photo -->
        <div class="form-group">
          <label class="form-label" for="collectorRef">
            <span>Collector / Supplier Name</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">(Optional)</span>
          </label>
          <input 
            type="text" 
            id="collectorRef" 
            class="form-input" 
            placeholder="e.g. Collector Raju / Walk-in" 
          />
        </div>

        <div class="form-group">
          <label class="form-label">
            <span>Scrap Photo Receipt</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">(Optional)</span>
          </label>
          <input type="file" id="purchasePhotoInput" accept="image/*" style="display: none;" />
          <button type="button" class="btn btn-outline" id="photoSelectBtn" style="justify-content: flex-start; gap: 10px;">
            <span>📷</span>
            <span id="photoBtnLabel">Attach Scrap Photo</span>
          </button>
          <div id="photoPreviewContainer" style="display: none; margin-top: 8px;">
            <img id="photoPreviewImg" style="width: 100%; max-height: 140px; object-fit: cover; border-radius: var(--radius-md); border: 1px solid var(--border-glass);" />
          </div>
        </div>

        <!-- Submit Button -->
        <button type="submit" class="btn btn-primary" id="savePurchaseBtn" style="margin-top: var(--space-sm);">
          <span>💾 Record Purchase</span>
        </button>
      </form>
    </div>
  `;

  // Element Selectors
  const form = container.querySelector('#logPurchaseForm');
  const weightInput = container.querySelector('#scrapWeight');
  const priceInput = container.querySelector('#scrapPrice');
  const weightError = container.querySelector('#weightError');
  const effectiveRateText = container.querySelector('#effectiveRateText');
  const suggestedPricePrompt = container.querySelector('#suggestedPricePrompt');
  const collectorRefInput = container.querySelector('#collectorRef');
  const photoInput = container.querySelector('#purchasePhotoInput');
  const photoBtn = container.querySelector('#photoSelectBtn');
  const photoBtnLabel = container.querySelector('#photoBtnLabel');
  const photoPreviewContainer = container.querySelector('#photoPreviewContainer');
  const photoPreviewImg = container.querySelector('#photoPreviewImg');

  // Category Selection
  container.querySelectorAll('.category-option').forEach(opt => {
    opt.addEventListener('click', () => {
      container.querySelectorAll('.category-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedCategory = opt.getAttribute('data-cat');
      recalcSuggestedPrice();
    });
  });

  function recalcSuggestedPrice() {
    const cat = CANONICAL_CATEGORIES.find(c => c.id === selectedCategory) || defaultCategory;
    const w = parseFloat(weightInput.value) || 0;
    if (w > 0) {
      const calculated = Math.round(w * cat.baseRate);
      priceInput.value = calculated;
    }
    updateEffectiveRate();
  }

  function updateEffectiveRate() {
    const w = parseFloat(weightInput.value) || 0;
    const p = parseFloat(priceInput.value) || 0;
    if (w > 0 && p >= 0) {
      const rate = (p / w).toFixed(1);
      effectiveRateText.textContent = `₹${rate} / kg`;
    } else {
      effectiveRateText.textContent = '₹0.00 / kg';
    }
  }

  weightInput.addEventListener('input', () => {
    const w = parseFloat(weightInput.value);
    if (w <= 0) {
      weightError.style.display = 'block';
    } else {
      weightError.style.display = 'none';
      if (!priceInput.value || priceInput.value === '0') {
        recalcSuggestedPrice();
      } else {
        updateEffectiveRate();
      }
    }
  });

  priceInput.addEventListener('input', updateEffectiveRate);
  suggestedPricePrompt.addEventListener('click', recalcSuggestedPrice);

  // Photo Attachment
  photoBtn.addEventListener('click', () => photoInput.click());
  photoInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        photoDataUrl = reader.result;
        photoPreviewImg.src = photoDataUrl;
        photoPreviewContainer.style.display = 'block';
        photoBtnLabel.textContent = `Photo Attached (${(file.size / 1024).toFixed(0)} KB)`;
      };
      reader.readAsDataURL(file);
    }
  });

  container.querySelector('#backHomeBtn')?.addEventListener('click', () => navigateTo('dealer-home'));

  // Form Submit (Offline-First)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const weight = parseFloat(weightInput.value);
    const price = parseFloat(priceInput.value);
    const collectorRef = collectorRefInput.value.trim();

    // Strict Validation
    if (isNaN(weight) || weight <= 0) {
      weightError.style.display = 'block';
      showToast('Please enter a valid weight greater than 0 kg', 'error');
      return;
    }

    if (isNaN(price) || price < 0) {
      showToast('Please enter a valid purchase price', 'error');
      return;
    }

    const user = apiClient.getUser();
    const purchaseUUID = generateUUID();
    const nowIso = new Date().toISOString();

    const geoNow = geoEngine.currentPosition || geoEngine.fallbackCoords;
    const purchaseRecord = {
      purchase_id: purchaseUUID,
      dealer_id: user?.user_id || '8c0f1234-5678-4abc-9def-0123456789ab',
      category: selectedCategory,
      weight: weight,
      price: price,
      unit_price: Number((price / weight).toFixed(2)),
      collector_reference: collectorRef || null,
      photo_url: photoDataUrl || null,
      latitude: geoNow?.latitude || null,
      longitude: geoNow?.longitude || null,
      location_name: geoNow?.city || 'Field Stamped',
      sync_status: 'PENDING_SYNC',
      created_at: nowIso
    };

    try {
      // 1. Save locally in IndexedDB first (guaranteed offline persistence)
      await saveLocalPurchase(purchaseRecord);
      showToast(`Purchase saved locally (${purchaseRecord.weight} kg ${purchaseRecord.category})`, 'success');

      // 2. If online, trigger background sync
      if (syncManager.isOnline()) {
        syncManager.syncNow(false).catch(err => console.warn('Auto-sync queued:', err));
      } else {
        await syncManager.checkPendingCount();
      }

      // Navigate to My Stock or Home
      navigateTo('my-stock');
    } catch (err) {
      console.error('Error saving purchase:', err);
      showToast(`Failed to record purchase: ${err.message}`, 'error');
    }
  });
}
