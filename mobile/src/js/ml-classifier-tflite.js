import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-wasm';

const MODEL_URL = '/models/ewaste_model/ewaste_model_dynamic.tflite';
const FALLBACK_MODEL_URL = '/models/ewaste_model/ewaste_model_float16.tflite';
const LABELS_URL = '/models/ewaste_model/labels.json';
const CATEGORY_MAP_URL = '/models/ewaste_model/category_map.json';

const CANONICAL_CATEGORIES = [
  'PCB', 'CRT', 'LCD', 'Cable', 'Battery', 'Motor/Magnet', 'Mixed Plastic'
];

const INPUT_SIZE = 240;
const CONFIDENCE_THRESHOLD = 0.70;

let model = null;
let fallbackModel = null;
let labels = null;
let categoryMap = null;
let isLoading = false;
let loadPromise = null;
let fallbackLoadPromise = null;
let tfliteReady = false;

async function loadJSON(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to load ${url}: ${resp.status}`);
  return resp.json();
}

function waitForTFLite() {
  return new Promise((resolve, reject) => {
    if (window.tflite && window.tflite.TFLiteModel) {
      resolve();
      return;
    }
    let attempts = 0;
    const check = setInterval(() => {
      attempts++;
      if (window.tflite && window.tflite.TFLiteModel) {
        clearInterval(check);
        resolve();
      } else if (attempts > 100) {
        clearInterval(check);
        reject(new Error('tflite global not available after 5s'));
      }
    }, 50);
  });
}

async function loadModelAndMetadata() {
  if (model && labels && categoryMap) return;
  if (loadPromise) return loadPromise;

  isLoading = true;
  loadPromise = (async () => {
    try {
      await tf.ready();
      await tf.setBackend('webgl');
      await tf.ready();

      await waitForTFLite();

      [labels, categoryMap] = await Promise.all([
        loadJSON(LABELS_URL),
        loadJSON(CATEGORY_MAP_URL)
      ]);

      model = await window.tflite.TFLiteModel.create(MODEL_URL);
      console.log('[TFLite] Primary model loaded successfully');
    } catch (err) {
      console.error('[TFLite] Failed to load primary model:', err);
      model = null;
      labels = null;
      categoryMap = null;
      throw err;
    } finally {
      isLoading = false;
    }
  })();

  return loadPromise;
}

async function loadFallbackModel() {
  if (fallbackModel) return fallbackModel;
  if (fallbackLoadPromise) return fallbackLoadPromise;

  fallbackLoadPromise = (async () => {
    try {
      await waitForTFLite();
      const loaded = await window.tflite.TFLiteModel.create(FALLBACK_MODEL_URL);
      fallbackModel = loaded;
      console.log('[TFLite] Float16 fallback model loaded successfully');
      return loaded;
    } catch (err) {
      console.warn('[TFLite] Float16 fallback model unavailable:', err);
      fallbackModel = null;
      return null;
    }
  })();

  return fallbackLoadPromise;
}

function preprocessImage(imageElement) {
  return tf.tidy(() => {
    const mean = tf.tensor1d([0.485, 0.456, 0.406]);
    const std = tf.tensor1d([0.229, 0.224, 0.225]);

    return tf.browser.fromPixels(imageElement)
      .resizeBilinear([INPUT_SIZE, INPUT_SIZE])
      .toFloat()
      .div(255.0)
      .sub(mean)
      .div(std)
      .expandDims(0);
  });
}

function aggregateToCanonical(probs) {
  const scores = {};
  CANONICAL_CATEGORIES.forEach(c => scores[c] = 0);

  for (let i = 0; i < probs.length; i++) {
    const canonical = categoryMap[labels[i]];
    if (canonical && scores[canonical] !== undefined) {
      scores[canonical] += probs[i];
    }
  }

  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topCategory, topScore] = entries[0];

  return {
    category: topCategory,
    confidence: topScore,
    confidencePercentage: Math.round(topScore * 100),
    isConfident: topScore >= CONFIDENCE_THRESHOLD,
    threshold: CONFIDENCE_THRESHOLD,
    categoryBreakdown: scores,
    topPredictions: probs.map((p, i) => ({
      label: labels[i],
      canonical: categoryMap[labels[i]],
      probability: p,
      percentage: Math.round(p * 100)
    })).sort((a, b) => b.probability - a.probability).slice(0, 10)
  };
}

export async function classifyWithTFLite(imageElementOrFile, strategy = 'primary') {
  await loadModelAndMetadata();

  let activeModel = model;
  if (strategy === 'fallback') {
    activeModel = await loadFallbackModel();
  }

  if (!activeModel) {
    throw new Error('TFLite model not loaded');
  }

  let img = imageElementOrFile;
  if (imageElementOrFile instanceof Blob || imageElementOrFile instanceof File) {
    img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = URL.createObjectURL(imageElementOrFile);
    });
  }

  const tensor = preprocessImage(img);
  const output = await activeModel.predict(tensor);
  const probs = Array.from(output.dataSync());
  tensor.dispose();
  output.dispose();

  return aggregateToCanonical(probs);
}

export function isModelLoaded() {
  return model !== null && labels !== null && categoryMap !== null;
}

export function isFallbackModelLoaded() {
  return fallbackModel !== null;
}

export function getLoadStatus() {
  return { isLoading, loaded: isModelLoaded() };
}

export async function warmup() {
  try {
    await loadModelAndMetadata();
    if (model) {
      const dummy = tf.zeros([1, INPUT_SIZE, INPUT_SIZE, 3]);
      const out = model.predict(dummy);
      out.dispose();
      dummy.dispose();
      return true;
    }
  } catch (err) {
    console.warn('[TFLite] Primary warmup failed:', err);
  }

  try {
    const fallback = await loadFallbackModel();
    if (!fallback) return false;
    const dummy = tf.zeros([1, INPUT_SIZE, INPUT_SIZE, 3]);
    const out = fallback.predict(dummy);
    out.dispose();
    dummy.dispose();
    return true;
  } catch (fallbackErr) {
    console.warn('[TFLite] Fallback warmup failed:', fallbackErr);
    return false;
  }
}