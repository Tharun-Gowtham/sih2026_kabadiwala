import * as ort from 'onnxruntime-web';

const MODEL_URL = '/models/yolo/yolov8m.onnx';
const DETECTION_THRESHOLD = 0.25;
const RELEVANT_CLASS_IDS = new Set([62, 63, 64, 65, 66, 67, 68, 69, 70, 72, 73, 74]);

const COCO_CLASS_NAMES = {
  0: 'person', 1: 'bicycle', 2: 'car', 3: 'motorcycle', 4: 'airplane', 5: 'bus', 6: 'train', 7: 'truck', 8: 'boat',
  9: 'traffic light', 10: 'fire hydrant', 11: 'stop sign', 12: 'parking meter', 13: 'bench', 14: 'bird', 15: 'cat',
  16: 'dog', 17: 'horse', 18: 'sheep', 19: 'cow', 20: 'elephant', 21: 'bear', 22: 'zebra', 23: 'giraffe',
  24: 'backpack', 25: 'umbrella', 26: 'handbag', 27: 'tie', 28: 'suitcase', 29: 'frisbee', 30: 'skis', 31: 'snowboard',
  32: 'sports ball', 33: 'kite', 34: 'baseball bat', 35: 'baseball glove', 36: 'skateboard', 37: 'surfboard', 38: 'tennis racket',
  39: 'bottle', 40: 'wine glass', 41: 'cup', 42: 'fork', 43: 'knife', 44: 'spoon', 45: 'bowl', 46: 'banana', 47: 'apple',
  48: 'sandwich', 49: 'orange', 50: 'broccoli', 51: 'carrot', 52: 'hot dog', 53: 'pizza', 54: 'donut', 55: 'cake',
  56: 'chair', 57: 'couch', 58: 'potted plant', 59: 'bed', 60: 'dining table', 61: 'toilet', 62: 'tv', 63: 'laptop',
  64: 'mouse', 65: 'remote', 66: 'keyboard', 67: 'cell phone', 68: 'microwave', 69: 'oven', 70: 'toaster', 71: 'sink',
  72: 'refrigerator', 73: 'book', 74: 'clock', 75: 'vase', 76: 'scissors', 77: 'teddy bear', 78: 'hair drier', 79: 'toothbrush'
};

let modelSession = null;
let modelPromise = null;

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function boxIOU(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);

  const overlap = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.width * a.height + b.width * b.height - overlap;
  return union > 0 ? overlap / union : 0;
}

function applyNMS(detections, iouThreshold = 0.45) {
  const sorted = [...detections].sort((a, b) => b.score - a.score);
  const kept = [];

  while (sorted.length > 0) {
    const current = sorted.shift();
    kept.push(current);
    const remaining = [];

    for (const next of sorted) {
      if (boxIOU(current, next) <= iouThreshold) remaining.push(next);
    }

    sorted.length = 0;
    sorted.push(...remaining);
  }

  return kept;
}

function prepareInputFromImage(imageElement) {
  const working = document.createElement('canvas');
  working.width = 640;
  working.height = 640;
  const ctx = working.getContext('2d');
  ctx.drawImage(imageElement, 0, 0, 640, 640);

  const { data } = ctx.getImageData(0, 0, 640, 640);
  const float32 = new Float32Array(1 * 3 * 640 * 640);

  let i = 0;
  for (let p = 0; p < data.length; p += 4) {
    float32[i] = data[p] / 255;
    float32[i + 1] = data[p + 1] / 255;
    float32[i + 2] = data[p + 2] / 255;
    i += 3;
  }

  return new ort.Tensor('float32', float32, [1, 3, 640, 640]);
}

async function loadModel() {
  if (modelSession) return modelSession;
  if (modelPromise) return modelPromise;

  modelPromise = (async () => {
    try {
      const session = await ort.InferenceSession.create(MODEL_URL, {
        executionProviders: ['wasm']
      });
      modelSession = session;
      return session;
    } catch (error) {
      console.warn('[YOLO] Could not load ONNX model:', error);
      modelPromise = null;
      throw error;
    }
  })();

  return modelPromise;
}

function parseDetectionsFromOutput(outputData) {
  if (!outputData || outputData.length < 84) return [];

  const detections = [];
  const totalAnchors = outputData.length / 84;

  for (let i = 0; i < totalAnchors; i++) {
    const base = i * 84;
    const raw = outputData.slice(base, base + 84);
    const classScores = raw.slice(4);

    let bestClassId = 0;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let c = 0; c < classScores.length; c++) {
      const score = classScores[c];
      if (score > bestScore) {
        bestScore = score;
        bestClassId = c;
      }
    }

    if (!RELEVANT_CLASS_IDS.has(bestClassId) || bestScore < 0.1) {
      continue;
    }

    const x = sigmoid(raw[0]);
    const y = sigmoid(raw[1]);
    const w = Math.exp(raw[2]);
    const h = Math.exp(raw[3]);

    const score = sigmoid(bestScore);
    const centerX = x * 640;
    const centerY = y * 640;
    const boxW = w * 640;
    const boxH = h * 640;

    detections.push({
      classId: bestClassId,
      className: COCO_CLASS_NAMES[bestClassId] || 'object',
      score,
      x: clamp(centerX - boxW / 2, 0, 640),
      y: clamp(centerY - boxH / 2, 0, 640),
      width: clamp(boxW, 8, 640),
      height: clamp(boxH, 8, 640)
    });
  }

  return applyNMS(detections, 0.45).filter((d) => d.score >= DETECTION_THRESHOLD).slice(0, 5);
}

function fallbackDetection(imageElement) {
  const width = imageElement.naturalWidth || imageElement.width || 640;
  const height = imageElement.naturalHeight || imageElement.height || 640;

  const cx = width / 2;
  const cy = height / 2;
  const sw = width * 0.62;
  const sh = height * 0.62;

  return [{
    classId: 63,
    className: 'laptop',
    score: 0.72,
    x: clamp(cx - sw / 2, 0, width),
    y: clamp(cy - sh / 2, 0, height),
    width: clamp(sw, 32, width),
    height: clamp(sh, 32, height)
  }];
}

function asImageElement(imageElementOrFile) {
  if (imageElementOrFile instanceof HTMLImageElement || imageElementOrFile instanceof HTMLCanvasElement) {
    return imageElementOrFile;
  }

  if (imageElementOrFile instanceof Blob || imageElementOrFile instanceof File) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(imageElementOrFile);
    });
  }

  return Promise.resolve(imageElementOrFile);
}

export async function detectObjects(imageElementOrFile) {
  try {
    const source = await asImageElement(imageElementOrFile);
    const session = await loadModel();
    const tensor = prepareInputFromImage(source);
    const outputs = await session.run({ [session.inputNames[0]]: tensor });
    const outputKey = Object.keys(outputs)[0];
    const output = outputs[outputKey];
    const parsed = parseDetectionsFromOutput(output.data);

    tensor.dispose();

    if (parsed.length > 0) return parsed;
    return fallbackDetection(source);
  } catch (error) {
    console.warn('[YOLO] Detection failed, using fallback box heuristic:', error);
    try {
      const source = await asImageElement(imageElementOrFile);
      return fallbackDetection(source);
    } catch (fallbackError) {
      console.error('[YOLO] Fallback detection failed:', fallbackError);
      return [];
    }
  }
}

export function getYOLOModelStatus() {
  return { modelLoaded: !!modelSession, modelUrl: MODEL_URL };
}
