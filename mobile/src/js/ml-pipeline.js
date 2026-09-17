import { detectObjects } from './ml-detector-yolo.js';
import { classifyWithTFLite } from './ml-classifier-tflite.js';

const PAD_FRACTION = 0.10;

function createCanvasFromImage(imageElement) {
  const canvas = document.createElement('canvas');
  canvas.width = imageElement.naturalWidth || imageElement.width || 640;
  canvas.height = imageElement.naturalHeight || imageElement.height || 640;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function cropWithPadding(imageElement, bbox, padFraction = PAD_FRACTION) {
  const width = imageElement.naturalWidth || imageElement.width || 640;
  const height = imageElement.naturalHeight || imageElement.height || 640;

  const x1 = Math.max(0, bbox.x || 0);
  const y1 = Math.max(0, bbox.y || 0);
  const x2 = Math.min(width, (bbox.x || 0) + (bbox.width || 0));
  const y2 = Math.min(height, (bbox.y || 0) + (bbox.height || 0));

  const boxWidth = Math.max(1, x2 - x1);
  const boxHeight = Math.max(1, y2 - y1);
  const padX = boxWidth * padFraction;
  const padY = boxHeight * padFraction;

  const sx = Math.max(0, x1 - padX);
  const sy = Math.max(0, y1 - padY);
  const sw = Math.min(width, x2 + padX) - sx;
  const sh = Math.min(height, y2 + padY) - sy;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw));
  canvas.height = Math.max(1, Math.round(sh));

  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageElement, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  return canvas;
}

function letterboxResizeTo224(canvas) {
  const target = 224;
  const scale = Math.min(target / canvas.width, target / canvas.height);
  const newW = Math.max(1, Math.round(canvas.width * scale));
  const newH = Math.max(1, Math.round(canvas.height * scale));

  const out = document.createElement('canvas');
  out.width = target;
  out.height = target;

  const ctx = out.getContext('2d');
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, target, target);
  ctx.drawImage(canvas, (target - newW) / 2, (target - newH) / 2, newW, newH);

  return out;
}

function normalizeTensorFromCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = new Float32Array(canvas.width * canvas.height * 3);

  for (let i = 0; i < imgData.data.length; i += 4) {
    data[i] = imgData.data[i] / 255;
    data[i + 1] = imgData.data[i + 1] / 255;
    data[i + 2] = imgData.data[i + 2] / 255;
  }

  return data;
}

function aggregateResults(classifications) {
  const scoreMap = new Map();

  for (const item of classifications) {
    if (!item || !item.category) continue;
    const prev = scoreMap.get(item.category) || 0;
    scoreMap.set(item.category, Math.max(prev, item.confidence || 0));
  }

  const entries = [...scoreMap.entries()].sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return { category: 'Mixed Plastic', confidence: 0.38, confidencePercentage: 38, isConfident: false, source: 'pipeline' };
  }

  const [category, confidence] = entries[0];
  return {
    category,
    confidence,
    confidencePercentage: Math.round(confidence * 100),
    isConfident: confidence >= 0.7,
    source: 'pipeline',
    detections: classifications.length,
    categoryBreakdown: Object.fromEntries(entries)
  };
}

export async function detectAndClassify(imageElementOrFile) {
  const img = await (imageElementOrFile instanceof HTMLImageElement || imageElementOrFile instanceof HTMLCanvasElement
    ? Promise.resolve(imageElementOrFile)
    : new Promise((resolve, reject) => {
        const temp = new Image();
        temp.onload = () => resolve(temp);
        temp.onerror = reject;
        temp.src = URL.createObjectURL(imageElementOrFile);
      }));

  const canvas = createCanvasFromImage(img);
  const boxes = await detectObjects(canvas);

  if (!boxes || boxes.length === 0) {
    const fullResult = await classifyWithTFLite(canvas);
    return {
      ...fullResult,
      source: 'pipeline-fallback',
      detections: 0
    };
  }

  const classified = [];

  for (const box of boxes) {
    const cropped = cropWithPadding(canvas, box, PAD_FRACTION);
    const resized = letterboxResizeTo224(cropped);
    const result = await classifyWithTFLite(resized);
    classified.push({ ...result, box });
  }

  const aggregated = aggregateResults(classified);
  return {
    ...aggregated,
    detections: boxes.length,
    perDetection: classified
  };
}
