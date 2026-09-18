/**
 * Kabadiwala Connect — Collector / Kabadiwala Lite View
 * Implements Scrap Photo Capture, On-Device ML Inference, Confirm/Correct & Material Guide.
 * 
 * Now with TFLite 50-class model support + heuristic fallback.
 */

import { classifyScrapImage, ML_CONFIG, getModelStatus, initializeModel } from '../ml-classifier.js';
import { detectAndClassify } from '../ml-pipeline.js';
import { CANONICAL_CATEGORIES, getCategoryMeta, showToast } from '../utils.js';

export function renderCollectorLiteView(container, navigateTo) {
  let currentPrediction = null;
  let confirmedCategory = null;
  let capturedImageFile = null;

  container.innerHTML = `
    <div class="view-transition">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-md);">
        <div>
          <span style="font-size: 0.75rem; font-weight: 700; color: #38bdf8; text-transform: uppercase;">Field Assistance</span>
          <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main);">Collector Lite</h2>
          <p style="font-size: 0.8rem; color: var(--text-secondary);">On-device ML material detection & safety guide</p>
        </div>
        <button class="btn btn-sm btn-outline" id="switchToDealerTopBtn" style="color: #34d399; border-color: rgba(52, 211, 153, 0.3);">
          Dealer App ➔
        </button>
      </div>

      <!-- Model Status Pill -->
      <div class="card" id="modelStatusCard" style="background: rgba(52, 211, 153, 0.08); border-color: rgba(52, 211, 153, 0.3); padding: 10px 14px; margin-bottom: var(--space-md);">
        <div style="font-size: 0.78rem; color: #86efac; line-height: 1.4; display: flex; align-items: center; gap: 8px;">
          <span id="modelStatusIndicator" class="status-dot" style="width: 8px; height: 8px; border-radius: 50%; background: #94a3b8;"></span>
          <span id="modelStatusText">Loading ML model...</span>
        </div>
      </div>

      <!-- ML Notice Pill -->
      <div class="card" style="background: rgba(14, 165, 233, 0.08); border-color: rgba(14, 165, 233, 0.3); padding: 10px 14px; margin-bottom: var(--space-md);">
        <div style="font-size: 0.78rem; color: #bae6fd; line-height: 1.4;">
          🤖 <strong>ML Assistance:</strong> The classifier suggests the scrap category. You can confirm or correct the suggestion at any time.
        </div>
      </div>

      <!-- Viewfinder / Scrap Capture Box -->
      <div class="collector-viewfinder-card" id="viewfinderCard">
        <div class="viewfinder-overlay" id="viewfinderOverlay">
          <div class="viewfinder-reticle">
            <div class="viewfinder-scan-line"></div>
          </div>
          <p style="margin-top: 14px; font-size: 0.82rem; color: #94a3b8; font-weight: 600;">
            Position scrap inside frame
          </p>
        </div>
        <img id="collectorPhotoPreview" class="collector-preview-img" style="display: none;" alt="Scrap preview" />
      </div>

      <!-- Capture Actions -->
      <input type="file" id="collectorCameraInput" accept="image/*" capture="environment" style="display: none;" />
      <input type="file" id="collectorGalleryInput" accept="image/*" style="display: none;" />

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: var(--space-md);">
        <button class="btn btn-primary" id="snapCameraBtn">
          <span>📷 Snap Scrap Photo</span>
        </button>
        <button class="btn btn-secondary" id="pickGalleryBtn">
          <span>🖼️ Choose Photo</span>
        </button>
      </div>

      <!-- Sample Scrap Quick Test Buttons for Instant Demo -->
      <div style="margin-bottom: var(--space-md);">
        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">
          ⚡ Quick Test Scrap Samples
        </div>
        <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px;">
          <button class="btn btn-sm btn-outline sample-btn" data-sample="pcb">💻 PCB Sample</button>
          <button class="btn btn-sm btn-outline sample-btn" data-sample="cable">🔌 Cable Sample</button>
          <button class="btn btn-sm btn-outline sample-btn" data-sample="battery">🔋 Battery Sample</button>
          <button class="btn btn-sm btn-outline sample-btn" data-sample="lcd">🖥️ LCD Sample</button>
        </div>
      </div>

      <!-- Dynamic ML Results Container -->
      <div id="mlResultContainer"></div>

      <!-- Manual Category Picker (Always Accessible Fallback) -->
      <div class="card" id="manualPickerCard" style="margin-top: var(--space-md);">
        <div class="card-header">
          <span class="card-title" style="font-size: 0.92rem;">Manual Category Selection</span>
          <span class="badge badge-info">7 Classes</span>
        </div>
        <p style="font-size: 0.78rem; color: var(--text-muted); margin-bottom: 10px;">
          Select manually if the model is unsure or to override the prediction.
        </p>
        <div class="category-grid" id="collectorCatGrid">
          ${CANONICAL_CATEGORIES.map(cat => `
            <div class="category-option" data-cat="${cat.id}">
              <span class="cat-icon">${cat.icon}</span>
              <div>
                <div class="cat-name">${cat.name}</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">ref ₹${cat.baseRate}/kg</div>
              </div>
            </div>
          `).join('')}
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
  const topSwitchBtn = container.querySelector('#switchToDealerTopBtn');
  const statusIndicator = container.querySelector('#modelStatusIndicator');
  const statusText = container.querySelector('#modelStatusText');

  function renderDetectionOverlay(boxes) {
    if (!previewImg || !previewImg.src) return;

    const existing = previewImg.parentElement.querySelector('.detection-overlay');
    if (existing) existing.remove();

    if (!boxes || boxes.length === 0) return;

    const src = previewImg;
    const overlayBox = document.createElement('div');
    overlayBox.className = 'detection-overlay';
    Object.assign(overlayBox.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      width: '100%',
      height: '100%'
    });

    const naturalWidth = src.naturalWidth || src.width || 640;
    const naturalHeight = src.naturalHeight || src.height || 640;
    const displayWidth = src.clientWidth || 320;
    const displayHeight = src.clientHeight || 240;

    const rect = src.getBoundingClientRect();
    const scaleX = displayWidth / naturalWidth;
    const scaleY = displayHeight / naturalHeight;

    for (const box of boxes) {
      const el = document.createElement('div');
      el.style.position = 'absolute';
      el.style.left = `${(box.x / naturalWidth) * displayWidth}px`;
      el.style.top = `${(box.y / naturalHeight) * displayHeight}px`;
      el.style.width = `${(box.width / naturalWidth) * displayWidth}px`;
      el.style.height = `${(box.height / naturalHeight) * displayHeight}px`;
      el.style.border = '2px solid #22c55e';
      el.style.borderRadius = '6px';
      el.style.background = 'rgba(34, 197, 94, 0.08)';
      el.style.boxShadow = '0 0 0 1px rgba(34, 197, 94, 0.35)';
      el.style.fontSize = '10px';
      el.style.color = '#d1fae5';
      el.style.fontWeight = '700';
      el.style.display = 'flex';
      el.style.alignItems = 'flex-start';
      el.style.justifyContent = 'flex-start';
      el.style.padding = '2px 4px';
      el.textContent = `${(box.score * 100).toFixed(0)}%`;
      overlayBox.appendChild(el);
    }

    src.parentElement.style.position = 'relative';
    src.parentElement.appendChild(overlayBox);
  }

  // Initialize model on view load
  initializeModel().then(() => {
    updateModelStatusUI();
  });

  function updateModelStatusUI() {
    const status = getModelStatus();
    if (status.loaded) {
      statusIndicator.style.background = '#34d399';
      statusText.textContent = `✅ TFLite 20-class model ready (${status.usingFallback ? 'float16 fallback active' : 'primary model active'})`;
    } else if (status.isLoading) {
      statusIndicator.style.background = '#fbbf24';
      statusText.textContent = '⏳ Loading TFLite model...';
    } else {
      statusIndicator.style.background = '#ef4444';
      statusText.textContent = '⚠️ TFLite models unavailable; classification deferred';
    }
  }

  topSwitchBtn?.addEventListener('click', () => {
    window.setAppMode('dealer');
  });

  snapBtn.addEventListener('click', () => cameraInput.click());
  pickBtn.addEventListener('click', () => galleryInput.click());

  cameraInput.addEventListener('change', handleImageSelection);
  galleryInput.addEventListener('change', handleImageSelection);

  // Sample quick tests
  container.querySelectorAll('.sample-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-sample');
      runSampleTest(type);
    });
  });

  function runSampleTest(type) {
    // Generate synthetic canvas for realistic visual ML test
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');

    if (type === 'pcb') {
      ctx.fillStyle = '#065f46'; // Green PCB substrate
      ctx.fillRect(0, 0, 120, 120);
      ctx.fillStyle = '#fbbf24'; // Gold / solder pads
      ctx.fillRect(20, 20, 30, 30);
      ctx.fillRect(70, 40, 25, 25);
    } else if (type === 'cable') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 120, 120);
      ctx.strokeStyle = '#ea580c'; // Copper wire
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
      ctx.fillStyle = '#0f172a'; // Dark LCD panel
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
        <p style="font-size: 0.88rem; color: var(--text-secondary);">Running detection + classification pipeline...</p>
      </div>
    `;

    try {
      const pred = await detectAndClassify(imgSource);
      if (pred && pred.perDetection) {
        const highest = pred.perDetection[0];
        const detectedTop = highest && highest.category ? highest.category : pred.category;
        currentPrediction = {
          ...pred,
          category: detectedTop,
          confidence: pred.confidence || highest?.confidence || 0.7,
          confidencePercentage: pred.confidencePercentage || highest?.confidencePercentage || 70,
          isConfident: pred.isConfident || !!highest,
          materialInfo: ML_CONFIG.MATERIAL_INFO[detectedTop] || null,
          source: 'pipeline'
        };
        renderMlResult(currentPrediction);
        renderDetectionOverlay(pred.detectionBoxes || pred.perDetection?.map(item => item.box));
      } else {
        const simplePrediction = await classifyScrapImage(imgSource);
        currentPrediction = simplePrediction;
        renderMlResult(simplePrediction);
      }
      updateModelStatusUI();
    } catch (err) {
      console.error('Inference error:', err);
      try {
        const fallback = await classifyScrapImage(imgSource);
        currentPrediction = fallback;
        renderMlResult(fallback);
      } catch (fallbackErr) {
        console.error('Fallback inference error:', fallbackErr);
        mlContainer.innerHTML = `
          <div class="card" style="border-color: #ef4444; padding: var(--space-md);">
            <div style="font-weight: 700; color: #f87171; margin-bottom: 4px;">Inference Offline</div>
            <p style="font-size: 0.82rem; color: var(--text-muted);">Please select the category manually using the grid below.</p>
          </div>
        `;
      }
      updateModelStatusUI();
    }
  }

  function renderMlResult(pred) {
    const meta = getCategoryMeta(pred.category);
    const info = pred.materialInfo;
    const source = pred.source || 'unknown';
    const isTFLite = source === 'tflite';

    // Build category breakdown display for TFLite results
    let breakdownHtml = '';
    if (isTFLite && pred.categoryBreakdown) {
      const sortedCats = Object.entries(pred.categoryBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7);
      
      breakdownHtml = `
        <div class="category-breakdown" style="margin-top: 10px;">
          <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase;">Category Scores</div>
          <div style="display: grid; gap: 4px;">
            ${sortedCats.map(([cat, score]) => `
              <div style="display: flex; align-items: center; gap: 8px; font-size: 0.75rem;">
                <span style="width: 100px; color: ${cat === pred.category ? '#34d399' : 'var(--text-secondary)'}; font-weight: ${cat === pred.category ? '700' : '500'};">
                  ${getCategoryMeta(cat)?.icon || ''} ${cat}
                </span>
                <div style="flex: 1; height: 6px; background: rgba(148, 163, 184, 0.2); border-radius: 3px; overflow: hidden;">
                  <div style="width: ${Math.round(score * 100)}%; height: 100%; background: ${cat === pred.category ? 'linear-gradient(90deg, #34d399, #22c55e)' : 'linear-gradient(90deg, #64748b, #94a3b8)'}; border-radius: 3px; transition: width 0.3s;"></div>
                </div>
                <span style="width: 40px; text-align: right; color: var(--text-muted);">${Math.round(score * 100)}%</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Top 50 predictions (collapsible)
    let top50Html = '';
    if (isTFLite && pred.topPredictions && pred.topPredictions.length > 0) {
      top50Html = `
        <details class="top50-details" style="margin-top: 10px;">
          <summary style="cursor: pointer; font-size: 0.75rem; color: var(--text-secondary); font-weight: 600;">🔍 View Top 10 of 20 Raw Predictions</summary>
          <div style="margin-top: 8px; display: grid; gap: 3px;">
            ${pred.topPredictions.map(p => `
              <div style="display: flex; align-items: center; gap: 8px; font-size: 0.7rem; padding: 4px 8px; background: rgba(148, 163, 184, 0.1); border-radius: 4px;">
                <span style="width: 140px; color: var(--text-main);">${p.label}</span>
                <span style="width: 80px; color: var(--text-secondary);">→ ${p.canonical}</span>
                <div style="flex: 1; height: 4px; background: rgba(148, 163, 184, 0.2); border-radius: 2px; overflow: hidden;">
                  <div style="width: ${p.percentage}%; height: 100%; background: linear-gradient(90deg, #38bdf8, #0ea5e9); border-radius: 2px;"></div>
                </div>
                <span style="width: 35px; text-align: right; color: var(--text-muted);">${p.percentage}%</span>
              </div>
            `).join('')}
          </div>
        </details>
      `;
    }

    mlContainer.innerHTML = `
      <div class="ml-result-card ${pred.isConfident ? 'confident' : 'low-confidence'}">
        <div class="ml-header">
          <div class="ml-category-title">
            <span>${meta.icon}</span>
            <span>${pred.isConfident ? `Suggested: ${pred.category}` : 'Uncertain Classification'}</span>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
            <span class="badge ${pred.isConfident ? 'badge-success' : 'badge-warning'}">
              ${pred.confidencePercentage}% Confidence
            </span>
            <span style="font-size: 0.65rem; color: ${isTFLite ? '#38bdf8' : '#fbbf24'}; font-weight: 600;">
              ${isTFLite ? '🤖 TFLite Model' : '🧮 Heuristic Fallback'}
            </span>
          </div>
        </div>

        <!-- Confidence Progress Bar -->
        <div class="confidence-bar-wrapper">
          <div class="confidence-labels">
            <span>ML Confidence Score</span>
            <span>Threshold: ${Math.round(pred.threshold * 100)}%</span>
          </div>
          <div class="confidence-progress-bg">
            <div 
              class="confidence-progress-fill ${pred.isConfident ? '' : 'warning'}" 
              style="width: ${pred.confidencePercentage}%;"
            ></div>
          </div>
        </div>

        ${breakdownHtml}
        ${top50Html}

        ${pred.isConfident ? `
          <div style="font-size: 0.82rem; color: #a7f3d0; margin-top: 4px;">
            ✓ High confidence match. Please confirm or correct below:
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px;">
            <button class="btn btn-primary" id="confirmMlBtn">
              <span>✓ Confirm ${pred.category}</span>
            </button>
            <button class="btn btn-outline" id="correctMlBtn">
              <span>✏️ Change Category</span>
            </button>
          </div>
        ` : `
          <div style="font-size: 0.82rem; color: #fde68a; margin-top: 4px;">
            ⚠️ Confidence below 70% threshold. The app will <strong>not</strong> auto-select. Please pick the correct category manually.
          </div>
        `}
      </div>

      <!-- Material Fact & Safety Guide Card -->
      ${info ? `
        <div class="material-info-card" id="materialGuideCard">
          <div class="card-header">
            <span class="card-title" style="font-size: 0.95rem;">${info.title} Guide</span>
            <span class="badge badge-info">${info.indicativeRate}</span>
          </div>

          <div class="material-fact-row">
            <span class="material-fact-label">Recyclability</span>
            <span class="material-fact-value">${info.recyclability}</span>
          </div>

          <div class="material-fact-row">
            <span class="material-fact-label">Field Sorting Tip</span>
            <span class="material-fact-value" style="font-size: 0.8rem;">${info.sortingTips}</span>
          </div>

          <div class="material-safety-note">
            ${info.safetyNote}
          </div>
        </div>
      ` : ''}
    `;

    // Handlers for confirm / correct
    mlContainer.querySelector('#confirmMlBtn')?.addEventListener('click', () => {
      confirmedCategory = pred.category;
      showToast(`Confirmed category: ${confirmedCategory}`, 'success');
      highlightSelectedCategory(confirmedCategory);
    });

    mlContainer.querySelector('#correctMlBtn')?.addEventListener('click', () => {
      showToast('Please select the correct category from the grid below', 'info');
      document.getElementById('manualPickerCard')?.scrollIntoView({ behavior: 'smooth' });
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
      confirmedCategory = cat;
      highlightSelectedCategory(cat);
      showToast(`Selected category: ${cat}`, 'info');

      // Update material guide card
      const info = ML_CONFIG.MATERIAL_INFO[cat];
      if (info) {
        renderMlResult({
          category: cat,
          confidence: 1.0,
          confidencePercentage: 100,
          isConfident: true,
          threshold: 0.7,
          materialInfo: info,
          source: 'manual',
          categoryBreakdown: {},
          topPredictions: []
        });
      }
    });
  });
}