/**
 * Kabadiwala Lite — Collector Guided Workflow View
 * Intuitive 4-Step Guided Flow:
 *   Step 1: Identify Material (Camera Photo & On-Device ML or 1-Tap Category Grid)
 *   Step 2: Approximate Weight (Tactile Stepper + Quick Chips)
 *   Step 3: Instant Fair Value & Spoken Voice Output in 8 Indian Languages
 *   Step 4: Save Digital Scrap Slip with Scannable QR & GPS OR Find Nearby Authorized Recyclers
 */

import { classifyScrapImage, ML_CONFIG } from '../ml-classifier.js';
import { CANONICAL_CATEGORIES, getCategoryMeta, formatCurrency, generateUUID, showToast } from '../utils.js';
import { i18n } from '../i18n.js';
import { geoEngine } from '../geo.js';
import { syncManager } from '../sync.js';
import { MARKET_PRICE_DATA } from './price-board.js';
import { saveCollectorSlip, showSlipQrModal } from './collector-ledger.js';
import { renderCollectorRecyclersModal } from './collector-recyclers.js';

export function renderCollectorLiteView(container, navigateTo, playWelcome = false) {
  let activeCategory = 'PCB';
  let currentWeight = 5.0; // Default 5 kg
  let currentStep = 1; // 1 | 2 | 3 | 4
  let capturedImageFile = null;
  let currentPrediction = null;

  const t = (k, p) => i18n.t(k, p);

  // Voice helpers — language-aware spoken phrases
  function speakHindi(hindiText, englishText, onEnd) {
    const lang = i18n.getLang();
    const text = lang === 'hi' ? hindiText : englishText;
    i18n.speak(text, { onEnd });
  }

  container.innerHTML = `
    <div class="view-transition" style="padding-bottom: var(--space-xl);">
      <!-- Offline / Online Status Assurance Pill -->
      <div id="collectorOfflinePill" style="display: flex; align-items: center; justify-content: space-between; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(52, 211, 153, 0.25); border-radius: 9999px; padding: 5px 12px; margin-bottom: 10px; transition: all 0.3s ease;">
        <!-- Populated dynamically via updateOfflinePill -->
      </div>

      <!-- Top Guided Stepper Bar -->
      <div class="stepper-bar-container" style="margin-bottom: var(--space-md);">
        <div class="stepper-track">
          <div class="step-item ${currentStep >= 1 ? 'active' : ''}" id="stepIndicator1">
            <div class="step-circle">1</div>
            <span class="step-title">Identify</span>
          </div>
          <div class="step-line ${currentStep >= 2 ? 'active' : ''}"></div>
          <div class="step-item ${currentStep >= 2 ? 'active' : ''}" id="stepIndicator2">
            <div class="step-circle">2</div>
            <span class="step-title">Weight</span>
          </div>
          <div class="step-line ${currentStep >= 3 ? 'active' : ''}"></div>
          <div class="step-item ${currentStep >= 3 ? 'active' : ''}" id="stepIndicator3">
            <div class="step-circle">3</div>
            <span class="step-title">Value</span>
          </div>
          <div class="step-line ${currentStep >= 4 ? 'active' : ''}"></div>
          <div class="step-item ${currentStep >= 4 ? 'active' : ''}" id="stepIndicator4">
            <div class="step-circle">4</div>
            <span class="step-title">Slip</span>
          </div>
        </div>
      </div>

      <!-- ================= STEP 1: IDENTIFY MATERIAL ================= -->
      <div class="guide-step-card" id="stepCard1">
        <div class="step-header">
          <span class="badge badge-info">Step 1</span>
          <h3 class="step-main-title">Identify Scrap Material</h3>
          <p class="step-subtitle">Snap a photo with camera for AI suggestion or select from the 7 categories</p>
        </div>

        <!-- Camera Viewfinder -->
        <div class="collector-viewfinder-card" id="viewfinderCard" style="margin-bottom: 12px;">
          <div class="viewfinder-overlay" id="viewfinderOverlay">
            <div class="viewfinder-reticle">
              <div class="viewfinder-scan-line"></div>
            </div>
            <p style="margin-top: 14px; font-size: 0.82rem; color: #94a3b8; font-weight: 600;">
              ${t('positionScrap')}
            </p>
          </div>
          <img id="collectorPhotoPreview" class="collector-preview-img" style="display: none;" alt="Scrap preview" />
        </div>

        <!-- Camera & Gallery Triggers -->
        <input type="file" id="collectorCameraInput" accept="image/*" capture="environment" style="display: none;" />
        <input type="file" id="collectorGalleryInput" accept="image/*" style="display: none;" />

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
          <button class="btn btn-primary" id="snapCameraBtn" style="padding: 12px 14px; font-weight: 700; border-radius: 14px;">
            <span>📷 ${t('snapPhoto')}</span>
          </button>
          <button class="btn btn-secondary" id="pickGalleryBtn" style="padding: 12px 14px; font-weight: 700; border-radius: 14px;">
            <span>🖼️ ${t('choosePhoto')}</span>
          </button>
        </div>

        <!-- Quick Test Samples -->
        <div style="margin-bottom: 14px;">
          <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">
            ⚡ Quick Test Samples
          </div>
          <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px;">
            <button class="btn btn-sm btn-outline sample-btn" data-sample="pcb">💻 PCB</button>
            <button class="btn btn-sm btn-outline sample-btn" data-sample="cable">🔌 Cable</button>
            <button class="btn btn-sm btn-outline sample-btn" data-sample="battery">🔋 Battery</button>
            <button class="btn btn-sm btn-outline sample-btn" data-sample="lcd">🖥️ LCD</button>
          </div>
        </div>

        <!-- Dynamic ML Results -->
        <div id="mlResultContainer" style="margin-bottom: 14px;"></div>

        <!-- Or Select Directly -->
        <div>
          <div style="font-size: 0.74rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 8px;">
            Or 1-Tap Category Pick:
          </div>
          <div class="category-grid" id="collectorCatGrid">
            ${CANONICAL_CATEGORIES.map(cat => `
              <div class="category-option ${cat.id === activeCategory ? 'selected' : ''}" data-cat="${cat.id}">
                <span class="cat-icon">${cat.icon}</span>
                <div>
                  <div class="cat-name">${i18n.getCategoryName(cat.id)}</div>
                  <div style="font-size: 0.72rem; color: #38bdf8; font-weight: 600;">₹${cat.baseRate}/kg</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- ================= STEP 2: ENTER WEIGHT ================= -->
      <div class="guide-step-card" id="stepCard2" style="margin-top: var(--space-md);">
        <div class="step-header">
          <span class="badge badge-info">Step 2</span>
          <h3 class="step-main-title">${t('approxWeight')}</h3>
          <p class="step-subtitle">Adjust the weight using plus/minus or tap quick weights</p>
        </div>

        <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 12px;">
          <button class="btn btn-secondary weight-step-btn" id="weightMinusBtn" style="width: 50px; height: 50px; font-size: 1.5rem;">−</button>
          <div class="input-with-affix input-with-suffix" style="flex: 1;">
            <input 
              type="number" 
              id="collectorWeightInput" 
              class="form-input" 
              value="5" 
              step="0.5" 
              min="0.1" 
              max="1000"
              style="font-size: 1.4rem; font-weight: 800; text-align: center; height: 50px; font-family: 'JetBrains Mono', monospace;"
            />
            <span class="input-suffix" style="font-size: 1rem; font-weight: 700;">kg</span>
          </div>
          <button class="btn btn-secondary weight-step-btn" id="weightPlusBtn" style="width: 50px; height: 50px; font-size: 1.5rem;">+</button>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;" id="quickWeightChips">
          <button class="btn btn-sm btn-outline weight-chip" data-weight="1">1 kg</button>
          <button class="btn btn-sm btn-outline weight-chip" data-weight="2">2 kg</button>
          <button class="btn btn-sm btn-outline weight-chip active" data-weight="5">5 kg</button>
          <button class="btn btn-sm btn-outline weight-chip" data-weight="10">10 kg</button>
          <button class="btn btn-sm btn-outline weight-chip" data-weight="25">25 kg</button>
          <button class="btn btn-sm btn-outline weight-chip" data-weight="50">50 kg</button>
        </div>
      </div>

      <!-- ================= STEP 3: INSTANT FAIR VALUE ================= -->
      <div class="guide-step-card" id="stepCard3" style="margin-top: var(--space-md); border-color: rgba(52, 211, 153, 0.4); background: linear-gradient(180deg, rgba(15, 23, 42, 0.9), rgba(16, 185, 129, 0.08));">
        <div class="step-header">
          <span class="badge badge-success">Step 3</span>
          <h3 class="step-main-title">Instant Fair Value Discovery</h3>
          <p class="step-subtitle">Real-time fair price calculation backed by current market data</p>
        </div>

        <!-- Glowing Value Banner -->
        <div style="background: rgba(16, 185, 129, 0.12); border: 1.5px solid rgba(52, 211, 153, 0.4); border-radius: 18px; padding: 16px; margin-bottom: 14px; text-align: center;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span id="valuationCatBadge" class="badge badge-info" style="font-size: 0.8rem;">
              💻 PCB
            </span>
            <span id="unitRateIndicator" style="font-size: 0.8rem; color: #38bdf8; font-weight: 700;">
              @ ₹450 / kg
            </span>
          </div>

          <div id="valuationTotalDisplay" style="font-size: 2.5rem; font-weight: 900; color: #34d399; font-family: 'JetBrains Mono', monospace; line-height: 1.1; margin: 8px 0;">
            ₹2,250
          </div>

          <div id="valuationRangeDisplay" style="font-size: 0.85rem; color: #cbd5e1;">
            ${t('marketRange')}: ₹2,000 – ₹2,750
          </div>
        </div>

        <!-- Spoken Audio Button (Key for low-literacy) -->
        <button class="btn btn-primary" id="speakEstimateBtn" style="width: 100%; border-radius: 14px; padding: 14px; font-size: 1.05rem; font-weight: 800; margin-bottom: 10px;">
          <span>${t('listenEstimate')}</span>
        </button>

        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-muted);">
          <span id="valuationGpsText">📍 GPS: Stamping...</span>
          <span style="color: #34d399;">✓ Fair Price Protected</span>
        </div>
      </div>

      <!-- ================= STEP 4: TAKE ACTION & CONNECT ================= -->
      <div class="guide-step-card" id="stepCard4" style="margin-top: var(--space-md);">
        <div class="step-header">
          <span class="badge badge-info">Step 4</span>
          <h3 class="step-main-title">Save Slip &amp; Connect to Buyers</h3>
          <p class="step-subtitle">Generate a verifiable digital slip or discover authorized nearby recyclers</p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button class="btn btn-primary" id="saveDigitalSlipBtn" style="padding: 14px; border-radius: 14px; font-size: 1rem; font-weight: 800; background: linear-gradient(135deg, #059669, #0284c7);">
            <span>💾 Save Digital Scrap Slip</span>
          </button>

          <button class="btn btn-outline" id="viewNearbyBuyersBtn" style="padding: 14px; border-radius: 14px; font-size: 0.95rem; font-weight: 700;">
            <span>📍 Find Nearby Authorized Buyers</span>
          </button>
        </div>
      </div>
    </div>
  `;

  // Selectors
  const cameraInput = container.querySelector('#collectorCameraInput');
  const galleryInput = container.querySelector('#collectorGalleryInput');
  const snapBtn = container.querySelector('#snapCameraBtn');
  const pickBtn = container.querySelector('#pickGalleryBtn');
  const previewImg = container.querySelector('#collectorPhotoPreview');
  const overlay = container.querySelector('#viewfinderOverlay');
  const mlContainer = container.querySelector('#mlResultContainer');

  const weightInput = container.querySelector('#collectorWeightInput');
  const weightMinusBtn = container.querySelector('#weightMinusBtn');
  const weightPlusBtn = container.querySelector('#weightPlusBtn');
  const totalDisplay = container.querySelector('#valuationTotalDisplay');
  const rangeDisplay = container.querySelector('#valuationRangeDisplay');
  const unitRateDisplay = container.querySelector('#unitRateIndicator');
  const catBadge = container.querySelector('#valuationCatBadge');
  const speakBtn = container.querySelector('#speakEstimateBtn');
  const gpsText = container.querySelector('#valuationGpsText');

  const saveSlipBtn = container.querySelector('#saveDigitalSlipBtn');
  const viewBuyersBtn = container.querySelector('#viewNearbyBuyersBtn');

  // Acquire GPS
  geoEngine.acquireLocation().then(pos => {
    if (gpsText) {
      gpsText.innerHTML = `📍 GPS: ${geoEngine.formatCoords(pos)}`;
    }
  });

  // Voice: speak Namaste only when first entering the app
  if (playWelcome) {
    setTimeout(() => {
      speakHindi('नमस्ते।', 'Namaste.');
    }, 600);
  }

  // Calculate & update valuation
  function recalculateValuation() {
    const w = Math.max(0.1, parseFloat(weightInput.value) || 1.0);
    currentWeight = w;

    const priceInfo = MARKET_PRICE_DATA.find(p => p.id === activeCategory) || {
      currentRate: 450,
      minRate: 400,
      maxRate: 550
    };

    const estTotal = Math.round(w * priceInfo.currentRate);
    const minTotal = Math.round(w * priceInfo.minRate);
    const maxTotal = Math.round(w * priceInfo.maxRate);

    totalDisplay.innerText = formatCurrency(estTotal);
    rangeDisplay.innerText = `${t('marketRange')}: ₹${minTotal.toLocaleString('en-IN')} – ₹${maxTotal.toLocaleString('en-IN')}`;
    unitRateDisplay.innerText = `@ ₹${priceInfo.currentRate} / kg`;

    const catMeta = getCategoryMeta(activeCategory);
    catBadge.innerHTML = `${catMeta.icon} ${i18n.getCategoryName(activeCategory)}`;

    // Update active state on chips
    container.querySelectorAll('.weight-chip').forEach(chip => {
      const chipWeight = parseFloat(chip.getAttribute('data-weight'));
      if (Math.abs(chipWeight - w) < 0.01) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });

    return { estTotal, minTotal, maxTotal, w, priceInfo };
  }

  // Bind Steppers
  weightMinusBtn?.addEventListener('click', () => {
    if ('vibrate' in navigator) navigator.vibrate(20);
    const val = Math.max(0.5, (parseFloat(weightInput.value) || 1.0) - 1.0);
    weightInput.value = val;
    recalculateValuation();
  });

  weightPlusBtn?.addEventListener('click', () => {
    if ('vibrate' in navigator) navigator.vibrate(20);
    const val = (parseFloat(weightInput.value) || 1.0) + 1.0;
    weightInput.value = val;
    recalculateValuation();
  });

  weightInput?.addEventListener('input', recalculateValuation);

  // Bind Chips
  container.querySelectorAll('.weight-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if ('vibrate' in navigator) navigator.vibrate(25);
      const w = parseFloat(chip.getAttribute('data-weight'));
      weightInput.value = w;
      recalculateValuation();
    });
  });

  // Bind Speech Audio Readout
  speakBtn?.addEventListener('click', () => {
    const { estTotal, minTotal, maxTotal, w } = recalculateValuation();
    const catName = i18n.getCategoryName(activeCategory);

    const speechText = i18n.t('speech.valuation', {
      weight: w,
      category: catName,
      value: estTotal,
      min: minTotal,
      max: maxTotal
    });

    speakBtn.classList.add('pulse-anim');
    speakBtn.innerHTML = `<span>⏳ ${t('speaking')}</span>`;

    i18n.speak(speechText, {
      onEnd: () => {
        speakBtn.classList.remove('pulse-anim');
        speakBtn.innerHTML = `<span>${t('listenEstimate')}</span>`;
      },
      onError: () => {
        speakBtn.classList.remove('pulse-anim');
        speakBtn.innerHTML = `<span>${t('listenEstimate')}</span>`;
      }
    });
  });

  // Save Digital Scrap Slip
  saveSlipBtn?.addEventListener('click', () => {
    if ('vibrate' in navigator) navigator.vibrate([30, 50, 30]);
    const { estTotal, priceInfo, w } = recalculateValuation();
    const catMeta = getCategoryMeta(activeCategory);
    const pos = geoEngine.currentPosition || geoEngine.fallbackCoords;

    const slip = {
      id: generateUUID(),
      category: activeCategory,
      icon: catMeta.icon || '📦',
      weight: w,
      rate: priceInfo.currentRate,
      estimatedValue: estTotal,
      gpsText: geoEngine.formatCoords(pos),
      latitude: pos?.latitude,
      longitude: pos?.longitude,
      createdAt: new Date().toISOString()
    };

    saveCollectorSlip(slip);
    showToast(`✓ Scrap Slip Saved: ₹${estTotal}`, 'success');
    showSlipQrModal(slip);
  });

  // View Nearby Buyers Modal
  viewBuyersBtn?.addEventListener('click', () => {
    renderCollectorRecyclersModal(activeCategory);
  });

  // Photo handlers — speak prompt when user taps snap or pick
  snapBtn?.addEventListener('click', () => {
    speakHindi('कृपया कबाड़ की साफ़ फोटो लें।', 'Please take a clear photo of the scrap.');
    cameraInput.click();
  });
  pickBtn?.addEventListener('click', () => {
    speakHindi('कृपया कबाड़ की साफ़ फोटो लें।', 'Please take a clear photo of the scrap.');
    galleryInput.click();
  });

  cameraInput?.addEventListener('change', handleImageSelection);
  galleryInput?.addEventListener('change', handleImageSelection);

  // Quick test samples
  container.querySelectorAll('.sample-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-sample');
      runSampleTest(type);
    });
  });

  function runSampleTest(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');

    if (type === 'pcb') {
      ctx.fillStyle = '#065f46';
      ctx.fillRect(0, 0, 120, 120);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(20, 20, 30, 30);
      ctx.fillRect(70, 40, 25, 25);
    } else if (type === 'cable') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 120, 120);
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(10, 20);
      ctx.lineTo(110, 100);
      ctx.stroke();
    } else if (type === 'battery') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 120, 120);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(30, 30, 60, 60);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 120, 120);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(10, 10, 100, 100);
    }

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      previewImg.src = url;
      previewImg.style.display = 'block';
      overlay.style.display = 'none';
      processInference(blob);
    });
  }

  async function handleImageSelection(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    capturedImageFile = file;
    const url = URL.createObjectURL(file);
    previewImg.src = url;
    previewImg.style.display = 'block';
    overlay.style.display = 'none';

    await processInference(file);
  }

  async function processInference(imgSource) {
    mlContainer.innerHTML = `
      <div class="card" style="text-align: center; padding: var(--space-md);">
        <div class="spinner" style="margin: 0 auto 10px;"></div>
        <p style="font-size: 0.88rem; color: var(--text-secondary);">Running on-device ML classifier...</p>
      </div>
    `;

    try {
      const pred = await classifyScrapImage(imgSource);
      currentPrediction = pred;
      activeCategory = pred.category;
      renderMlResult(pred);
      highlightSelectedCategory(pred.category);
      recalculateValuation();
    } catch (err) {
      console.error('Inference error:', err);
      mlContainer.innerHTML = `
        <div class="card" style="border-color: #ef4444; padding: var(--space-md);">
          <div style="font-weight: 700; color: #f87171; margin-bottom: 4px;">Inference Offline</div>
          <p style="font-size: 0.82rem; color: var(--text-muted);">Please select the category manually using the grid below.</p>
        </div>
      `;
    }
  }

  function renderMlResult(pred) {
    const meta = getCategoryMeta(pred.category);
    const catName = i18n.getCategoryName(pred.category);

    mlContainer.innerHTML = `
      <div class="ml-result-card ${pred.isConfident ? 'confident' : 'low-confidence'}">
        <div class="ml-header">
          <div class="ml-category-title">
            <span>${meta.icon}</span>
            <span>${pred.isConfident ? `${t('detectedCategory')}: ${catName}` : 'Uncertain Classification'}</span>
          </div>
          <span class="badge ${pred.isConfident ? 'badge-success' : 'badge-warning'}">
            ${pred.confidencePercentage}% ${t('confidence')}
          </span>
        </div>

        <div class="confidence-bar-wrapper">
          <div class="confidence-labels">
            <span>${t('confidence')}</span>
            <span>Threshold: ${Math.round(pred.threshold * 100)}%</span>
          </div>
          <div class="confidence-progress-bg">
            <div 
              class="confidence-progress-fill ${pred.isConfident ? '' : 'warning'}" 
              style="width: ${pred.confidencePercentage}%;"
            ></div>
          </div>
        </div>

        ${pred.isConfident ? `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
            <button class="btn btn-primary btn-sm" id="confirmMlBtn">
              <span>${t('confirmCategory')}</span>
            </button>
            <button class="btn btn-outline btn-sm" id="correctMlBtn">
              <span>${t('changeCategory')}</span>
            </button>
          </div>
        ` : `
          <div style="font-size: 0.82rem; color: #fde68a; margin-top: 4px;">
            ⚠️ Confidence below threshold. Please select correct category manually below.
          </div>
        `}
      </div>
    `;

    // Voice: ask user to confirm the detected category
    if (pred.isConfident) {
      setTimeout(() => {
        speakHindi(
          `${catName} पहचाना गया। क्या यह सही है?`,
          `${catName} detected. Is this correct?`
        );
      }, 300);
    }

    // Confirm button
    mlContainer.querySelector('#confirmMlBtn')?.addEventListener('click', () => {
      activeCategory = pred.category;
      showToast(`${t('confirmCategory')}: ${catName}`, 'success');
      highlightSelectedCategory(activeCategory);
      recalculateValuation();
      document.getElementById('stepCard2')?.scrollIntoView({ behavior: 'smooth' });
    });

    // Correct button
    mlContainer.querySelector('#correctMlBtn')?.addEventListener('click', () => {
      document.getElementById('collectorCatGrid')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  function highlightSelectedCategory(catId) {
    container.querySelectorAll('#collectorCatGrid .category-option').forEach(opt => {
      if (opt.getAttribute('data-cat') === catId) {
        opt.classList.add('selected');
      } else {
        opt.classList.remove('selected');
      }
    });
  }

  // Manual category selector
  container.querySelectorAll('#collectorCatGrid .category-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const cat = opt.getAttribute('data-cat');
      activeCategory = cat;
      highlightSelectedCategory(cat);
      recalculateValuation();
      showToast(`${t('detectedCategory')}: ${i18n.getCategoryName(cat)}`, 'info');
    });
  });

  // Offline status pill sync
  function updateOfflinePill() {
    const pill = container.querySelector('#collectorOfflinePill');
    if (!pill) return;
    const isOnline = syncManager.isOnline();
    if (isOnline) {
      pill.style.background = 'rgba(59, 130, 246, 0.1)';
      pill.style.borderColor = 'rgba(96, 165, 250, 0.3)';
      pill.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: #3b82f6; box-shadow: 0 0 6px #3b82f6; display: inline-block;"></span>
          <span style="font-size: 0.72rem; font-weight: 700; color: #93c5fd; text-transform: uppercase; letter-spacing: 0.4px;">Online Mode</span>
        </div>
        <span style="font-size: 0.68rem; color: #bfdbfe; font-weight: 600;">Tap 'Online' to test Offline Mode</span>
      `;
    } else {
      pill.style.background = 'rgba(16, 185, 129, 0.1)';
      pill.style.borderColor = 'rgba(52, 211, 153, 0.25)';
      pill.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: #10b981; box-shadow: 0 0 6px #10b981; display: inline-block;"></span>
          <span style="font-size: 0.72rem; font-weight: 700; color: #a7f3d0; text-transform: uppercase; letter-spacing: 0.4px;">100% Offline Active</span>
        </div>
        <span style="font-size: 0.68rem; color: #6ee7b7; font-weight: 600;">Zero Internet Needed</span>
      `;
    }
  }

  updateOfflinePill();
  const unsubscribeSync = syncManager.subscribe(() => updateOfflinePill());

  // Initial calculation
  recalculateValuation();
}
