# E-Waste Detection Project — Plan & Implementation Log (PWA Architecture)

## Context & Background

### Project Goal
Build a **mobile PWA** e-waste classifier that identifies e-waste items from phone camera images, running fully offline in the browser using TensorFlow.js + TFLite.

### Original Approach (Flawed)
- Train EfficientNetB1 classifier on **bbox crops** from Roboflow CSV (69k samples, 50 classes)
- Export to TFLite for mobile
- Inference: full phone image → letterbox → classify

### Root Cause of Failure
**Training/inference mismatch**: Model trained on **object-centered bbox crops** but inferred on **full phone images** with background clutter.

```
Training:    [bbox crop + pad + letterbox] → EfficientNetB1
Inference:   [full image + letterbox]     → EfficientNetB1  ← WRONG
```

---

## Current State (PWA Architecture)

### Deployed Model
- **Classifier**: EfficientNetB1, 224×224 input, 50 classes, exported to **TFLite INT8** (8.7 MB)
- **Runtime**: TensorFlow.js TFLite (`@tensorflow/tfjs-tflite`) via pre-built `tf-tflite.min.js` (1.2 MB)
- **Deployment**: PWA at `mobile/` — `kabadiwala-lite.html` (Collector) + `dealer.html` (Dealer)
- **Offline**: Service Worker caches model + runtime + app shell

### Class Configuration
| Source | Classes | Notes |
|--------|---------|-------|
| Roboflow CSV | 45 raw → 52 canonical after merges | 8 merge rules applied |
| Min train samples | ≥100 crops | 30 classes dropped, 50 kept |
| Class merges | 8 rules | e.g., Bar-Phone→Mobile-Phone, CRT-Monitor/TV→CRT-Display |

### Model Artifacts (in `mobile/public/models/ewaste_model/`)
- `ewaste_model_int8.tflite` — Classifier (8.7 MB, INT8 quantized)
- `labels.json` — 50 class names
- `category_map.json` — 50 → 7 canonical category mapping

---

## Issues Identified

### 1. Domain Gap (Critical)
- **Training**: Roboflow/web images (clean backgrounds, centered objects)
- **Inference**: Phone camera photos (cluttered backgrounds, hands, shadows, odd angles)
- **Result**: High accuracy on Roboflow test split, but **poor on real phone photos**

### 2. Train/Inference Preprocessing Mismatch
| Stage | Training | Current Inference |
|-------|----------|-------------------|
| Input | Bbox crop from CSV | Full image |
| Padding | 10% around bbox | None |
| Resize | Letterbox to 240×240 | Resize to 224×224 (bilinear) |
| Normalization | EfficientNet `preprocess_input` ([-1, 1]) | Simple `/255` ([0, 1]) |
| Background | Minimal (cropped) | Full scene clutter |

### 3. Weak Classes
| Class | Train Crops | Val Crops | Issue |
|-------|-------------|-----------|-------|
| Laptop | 317 | 0 | Never validated |
| Battery | 341 | 0 | Never validated |
| 28 others | Various | 0 | 28 classes with 0 val coverage |

### 4. PWA Constraints
- **Bundle size budget**: ~10-15 MB for reliable install on 3G
- **Current bundle**: 1.07 MB JS (gzipped 181 KB) + 1.2 MB TFLite runtime + 8.7 MB model = **~21 MB total cache**
- **Latency budget**: <300ms for acceptable UX
- **Current**: ~150-250ms classifier only (no detection)

---

## Solution: Detection + Classification Pipeline in PWA

### Architecture
```
Phone Image (captured)
       │
       ▼
onnxruntime-web YOLO (640×640, WASM/WebGL) → Detect COCO objects (laptop, keyboard, mouse, phone, etc.)
       │
       ├─► For each detection with confidence > 0.5:
       │       Crop bbox + 10% padding (matches training)
       │       Letterbox resize to 224×224
       │       Normalize /255
       │       ▼
       │   TF.js TFLite Classifier (EfficientNetB1) → 50-class probs
       │       │
       │       ▼
       │   Aggregate to 7 canonical categories
       │
       ▼
If no detections OR fallback: Full-image classification (current behavior)
```

### Why This Works in PWA
1. **Matches training distribution**: Classifier sees bbox crops exactly as trained
2. **No retraining**: Both models pre-trained; classifier already knows cropped objects
3. **Handles multiple objects**: YOLO finds all objects; classifier identifies each
4. **Graceful degradation**: Falls back to full-image classification if YOLO fails
5. **Offline**: Both models cached by Service Worker
6. **No conversion risk**: onnxruntime-web runs ONNX directly, avoiding TF.js converter issues

### Models Required on Mobile (PWA)
| Model | Format | Size | Role |
|-------|--------|------|------|
| YOLOv8m | **ONNX** (run via onnxruntime-web) | ~50 MB | Detection (COCO classes: laptop, keyboard, mouse, phone, tv, microwave, oven, refrigerator, etc.) |
| EfficientNetB1 | TFLite INT8 (existing) | 8.7 MB | Classification (50 e-waste classes) |
| TFLite Runtime | `tf-tflite.min.js` | 1.2 MB | TF.js TFLite backend |
| onnxruntime-web | WASM/WebGL bundle | ~2 MB | ONNX inference runtime |

**Total cached assets: ~62 MB** — exceeds PWA best practice; mitigation: lazy-load YOLO only when Collector view opens, consider YOLOv8n for smaller size if latency allows.

---

## Implementation Plan

### Phase 1: Model Preparation ✅ DONE (Classifier)
- [x] EfficientNetB1 → `ewaste_model_int8.tflite` (8.7 MB, INT8)
- [x] `labels.json` + `category_map.json`
- [x] TF.js TFLite runtime (`tf-tflite.min.js`)
- [x] Classifier integration in `ml-classifier-tflite.js`

### Phase 2: YOLO Model Export & onnxruntime-web Setup (Current)
- [x] Export YOLOv8m to ONNX: `yolo export model=yolov8m.pt format=onnx opset=12 imgsz=640` ✅ (`yolov8m.onnx` created)
- [ ] Install `onnxruntime-web` in mobile app: `npm install onnxruntime-web`
- [ ] Place `yolov8m.onnx` in `mobile/public/models/yolo/`
- [ ] Verify ONNX model loads/runs in browser via onnxruntime-web

### Phase 3: PWA Pipeline Integration
- [ ] Create `ml-detector-yolo.js` — YOLO inference wrapper (onnxruntime-web)
  - Load ONNX model via `ort.InferenceSession`
  - Preprocess: resize to 640×640, letterbox, normalize [0,1]
  - Run inference → parse boxes, scores, classes (YOLOv8 output format: [1, 84, 8400])
  - Filter COCO classes relevant to e-waste (laptop:63, keyboard:66, mouse:64, cell phone:67, tv:62, microwave:68, oven:69, refrigerator:72)
- [ ] Create `ml-pipeline.js` — orchestrates detection → crop → classify
  - Coordinate mapping: YOLO 640×640 letterboxed output → original image dimensions
  - Crop with 10% padding (match training)
  - Batch classify crops via existing `classifyWithTFLite()`
  - Merge results: group by canonical category, take max confidence
- [ ] Update `collector-lite.js` UI
  - Show "Detecting objects..." state
  - Display detection overlay boxes on preview
  - Show per-object classification results
  - Fallback message if no detections
- [ ] Lazy-load YOLO model (dynamic import) when Collector view opens
- [ ] Update Service Worker to cache YOLO ONNX model + onnxruntime-web WASM

### Phase 4: Real-World Validation
- [ ] Collect 20-50 phone photos per problematic class (laptop, battery, etc.)
- [ ] Test pipeline end-to-end on device (Chrome Android)
- [ ] Measure per-class accuracy on real phone photos
- [ ] Measure latency: YOLO + N crops × Classifier
- [ ] Iterate: if pipeline fails, consider retraining classifier with real phone photos mixed in

### Phase 5: Optimization (If Needed)
- [ ] Quantize YOLO to INT8 via TF.js quantization (if accuracy holds)
- [ ] Add test-time augmentation (TTA) for classifier robustness
- [ ] Implement simple NMS for overlapping YOLO detections
- [ ] Profile memory usage on low-end devices (2-3 GB RAM)

---

## Technical Details

### Crop Logic (Must Match Training)
```javascript
function cropWithPadding(imageElement, bbox, padFraction = 0.1) {
  // bbox: {x1, y1, x2, y2} in ORIGINAL image coordinates
  const bw = bbox.x2 - bbox.x1;
  const bh = bbox.y2 - bbox.y1;
  const padX = bw * padFraction;
  const padY = bh * padFraction;
  
  const sx = Math.max(0, bbox.x1 - padX);
  const sy = Math.max(0, bbox.y1 - padY);
  const sw = Math.min(imageElement.width, bbox.x2 + padX) - sx;
  const sh = Math.min(imageElement.height, bbox.y2 + padY) - sy;
  
  // Draw to offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageElement, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas;
}
```

### Letterbox Resize (Classifier Input)
```javascript
function letterboxResize(canvas, targetSize = 224) {
  const scale = Math.min(targetSize / canvas.width, targetSize / canvas.height);
  const newW = Math.round(canvas.width * scale);
  const newH = Math.round(canvas.height * scale);
  
  const out = document.createElement('canvas');
  out.width = targetSize;
  out.height = targetSize;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, targetSize, targetSize);
  ctx.drawImage(canvas, (targetSize - newW) / 2, (targetSize - newH) / 2, newW, newH);
  return out;
}
```

### YOLO COCO Classes Relevant to E-Waste
| COCO Class ID | Name | Maps To |
|---------------|------|---------|
| 63 | laptop | Laptop |
| 66 | keyboard | Keyboard |
| 64 | mouse | Computer-Mouse |
| 67 | cell phone | Mobile-Phone |
| 62 | tv | LCD/CRT |
| 68 | microwave | Mixed Plastic |
| 69 | oven | Mixed Plastic |
| 70 | toaster | Mixed Plastic |
| 71 | sink | — |
| 72 | refrigerator | Refrigerator |
| 73 | book | — (false positive risk) |
| 74 | clock | — (false positive risk) |

---

## Key Metrics to Track

| Metric | Target | Current (Single Model) | Projected (Pipeline) |
|--------|--------|------------------------|----------------------|
| Laptop accuracy (real photos) | >85% | ~0% | >70% |
| End-to-end latency (mid-range phone) | <500ms | ~200ms | ~400-800ms |
| Model size (cached) | <25 MB | ~21 MB | ~30 MB (lazy-loaded) |
| Offline capability | Full | ✅ | ✅ |
| Bundle size (initial load) | <15 MB | ~1.2 MB JS + 8.7 MB model | ~1.2 MB JS + 8.7 MB model (YOLO lazy) |

---

## Files to Create/Modify

| File | Change |
|------|--------|
| `mobile/public/models/yolo/yolov8m.onnx` | **New** — YOLO ONNX model (copied from export) |
| `mobile/src/js/ml-detector-yolo.js` | **New** — YOLO inference wrapper (onnxruntime-web) |
| `mobile/src/js/ml-pipeline.js` | **New** — Detection → crop → classify orchestrator |
| `mobile/src/js/ml-classifier-tflite.js` | Minor — export `preprocessCrop()` for pipeline reuse |
| `mobile/src/js/views/collector-lite.js` | Update — detection overlay, per-object results, lazy-load |
| `mobile/public/sw.js` | Update — cache YOLO ONNX + onnxruntime-web WASM |
| `mobile/kabadiwala-lite.html` | No change (lazy-load via module) |
| `mobile/package.json` | Add `onnxruntime-web` dependency |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-09-17 | Switch to 50-class architecture | Config had 21 names but data had 50+ classes; dynamic discovery added |
| 2026-09-17 | Add detection pipeline | Fundamental train/inference mismatch; no retraining needed |
| 2026-09-17 | Use YOLOv8m (COCO) for detection | Prioritize accuracy over latency; better mAP (50.2 vs 44.9) |
| 2026-09-17 | Export both models to TFLite/LiteRT | Mobile deployment requirement |
| 2026-09-17 | **PWA adaptation**: onnxruntime-web YOLO + TF.js TFLite | Avoid TF.js converter protobuf hell; run ONNX directly |
| 2026-09-17 | **Lazy-load YOLO** | Keep initial bundle <15 MB; load YOLO only for Collector |

---

## Open Questions / Risks

1. **onnxruntime-web performance**: WASM backend ~300-500ms, WebGL backend ~150-300ms on mid-range phone
2. **YOLOv8m size**: 50 MB ONNX + 2 MB runtime = 52 MB cached — may need YOLOv8n (6 MB) if too large
3. **Coordinate mapping**: YOLO 640×640 letterboxed output → original image coords for cropping
4. **Multiple detections**: How to present multiple classified objects to user (list? overlay? primary only?)
5. **Class overlap**: YOLO "cell phone" vs classifier "Mobile-Phone" — deduplication logic needed
6. **Memory**: Two models + image buffers on low-end devices (2-3 GB RAM)
7. **Retraining need**: If pipeline still fails on certain classes, add real phone photos to training

---

## Next Immediate Action

**Install onnxruntime-web and validate YOLOv8m ONNX loads/runs in browser** before committing to full pipeline integration.

```bash
# 1. Install onnxruntime-web in mobile app
cd /home/taruns/sih2026_kabadiwala/mobile
npm install onnxruntime-web

# 2. Copy ONNX model to mobile public models
mkdir -p mobile/public/models/yolo
cp /home/taruns/sih2026_kabadiwala/yolov8m.onnx mobile/public/models/yolo/

# 3. Test load in browser console
const ort = await import('onnxruntime-web');
const session = await ort.InferenceSession.create('/models/yolo/yolov8m.onnx', { executionProviders: ['wasm'] });
console.log('Inputs:', session.inputNames, 'Outputs:', session.outputNames);
```

---

## Approval Required

This updated plan adapts the detection+classification pipeline to the **existing PWA architecture** using **onnxruntime-web for YOLO** (avoiding TF.js converter issues). Key tradeoffs accepted:

- **Larger cache** (~62 MB) with lazy-loading mitigation — consider YOLOv8n if too large
- **Higher latency** (~400-800ms) due to WASM vs native — WebGL backend may help
- **No conversion step** — ONNX runs directly via onnxruntime-web

**Please review and approve before implementation begins.**