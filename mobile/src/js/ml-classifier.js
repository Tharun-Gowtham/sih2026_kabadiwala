/**
 * Kabadiwala Connect — Collector ML Classifier Engine
 * Strictly handles the 7 Canonical Categories adhering to docs/collector-ml-flow.md
 *
 * Uses the primary TFLite model and a deterministic float16 fallback model.
 */

import { CANONICAL_CATEGORIES } from './utils.js';
import { classifyWithTFLite, isModelLoaded, isFallbackModelLoaded, getLoadStatus, warmup } from './ml-classifier-tflite.js';

export const ML_CONFIG = {
  CONFIDENCE_THRESHOLD: 0.70,
  CATEGORIES: [
    'PCB',
    'CRT',
    'LCD',
    'Cable',
    'Battery',
    'Motor/Magnet',
    'Mixed Plastic'
  ],
  MATERIAL_INFO: {
    'PCB': {
      title: 'Printed Circuit Boards (PCB)',
      recyclability: 'High (Precious Metals: Gold, Silver, Copper, Palladium)',
      safetyNote: '⚠️ Contains solder alloys and trace lead/brominated flame retardants. Handle with dry gloves.',
      indicativeRate: '₹400 - ₹550 / kg',
      sortingTips: 'Separate motherboards from low-grade power supply boards.'
    },
    'CRT': {
      title: 'Cathode Ray Tube (CRT)',
      recyclability: 'Moderate (Lead Glass, Copper Yoke)',
      safetyNote: '⚠️ High vacuum hazard and toxic leaded funnel glass. Do NOT crush or puncture screen.',
      indicativeRate: '₹35 - ₹50 / kg',
      sortingTips: 'Keep vacuum funnel intact to prevent hazardous implosion.'
    },
    'LCD': {
      title: 'Liquid Crystal Display (LCD)',
      recyclability: 'Moderate (Indium Tin Oxide, Polarizing film, Backlight CCFL/LED)',
      safetyNote: '⚠️ Older models contain CCFL mercury backlights. Avoid flexing panel.',
      indicativeRate: '₹150 - ₹210 / kg',
      sortingTips: 'Store flat to prevent glass breakage.'
    },
    'Cable': {
      title: 'Copper & Aluminum Cables',
      recyclability: 'Very High (High-purity Copper / Aluminum Wire)',
      safetyNote: '⚠️ Do NOT open-burn insulation. Use mechanical stripping or certified granulation.',
      indicativeRate: '₹280 - ₹380 / kg',
      sortingTips: 'Bundle ribbon cables and high-voltage cords separately.'
    },
    'Battery': {
      title: 'Lithium-ion & Lead-Acid Batteries',
      recyclability: 'Critical Circularity (Lithium, Cobalt, Nickel, Lead)',
      safetyNote: '🚨 Severe fire and chemical burn hazard! Insulate terminals with non-conductive tape.',
      indicativeRate: '₹80 - ₹120 / kg',
      sortingTips: 'Never mix swollen Li-ion pouches with heavy lead-acid units.'
    },
    'Motor/Magnet': {
      title: 'Electric Motors & Neodymium Magnets',
      recyclability: 'High (Copper windings, Rare Earth Neodymium, Steel core)',
      safetyNote: '⚠️ Strong pinch hazard from permanent rare-earth magnets.',
      indicativeRate: '₹80 - ₹110 / kg',
      sortingTips: 'Heavy steel housing can be separated from inner copper stator.'
    },
    'Mixed Plastic': {
      title: 'Mixed E-Waste Plastics (ABS/HIPS/PC)',
      recyclability: 'Moderate (Polymer Pelletization)',
      safetyNote: 'ℹ️ Non-hazardous but ensure no chemical residue.',
      indicativeRate: '₹25 - ₹40 / kg',
      sortingTips: 'Remove rubber gaskets and metal screws before processing.'
    }
  }
};

let useHeuristicFallback = false;

export async function classifyScrapImage(imageElementOrFile) {
  try {
    if (isModelLoaded()) {
      const result = await classifyWithTFLite(imageElementOrFile);
      return {
        ...result,
        source: 'tflite',
        materialInfo: ML_CONFIG.MATERIAL_INFO[result.category] || null
      };
    }

    if (isFallbackModelLoaded()) {
      const result = await classifyWithTFLite(imageElementOrFile, 'fallback');
      return {
        ...result,
        source: 'tflite-float16',
        materialInfo: ML_CONFIG.MATERIAL_INFO[result.category] || null
      };
    }

    throw new Error('No TFLite model available');
  } catch (err) {
    console.warn('[ML] TFLite classification failed, returning deterministic unavailable state:', err);
    useHeuristicFallback = false;
    return {
      category: 'Mixed Plastic',
      confidence: 0.0,
      confidencePercentage: 0,
      isConfident: false,
      threshold: ML_CONFIG.CONFIDENCE_THRESHOLD,
      materialInfo: ML_CONFIG.MATERIAL_INFO['Mixed Plastic'],
      source: 'unavailable',
      categoryBreakdown: {},
      topPredictions: []
    };
  }
}

export function getModelStatus() {
  return {
    ...getLoadStatus(),
    usingFallback: useHeuristicFallback || isFallbackModelLoaded()
  };
}

export async function initializeModel() {
  try {
    await warmup();
    useHeuristicFallback = false;
    return true;
  } catch (err) {
    console.warn('[ML] Primary model initialization failed; trying float16 fallback:', err);
    try {
      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.width = 240;
      fallbackCanvas.height = 240;
      const fallbackCtx = fallbackCanvas.getContext('2d');
      fallbackCtx.fillStyle = '#000000';
      fallbackCtx.fillRect(0, 0, 240, 240);
      await classifyWithTFLite(fallbackCanvas, 'fallback');
      useHeuristicFallback = false;
      return true;
    } catch (fallbackErr) {
      console.warn('[ML] Float16 fallback unavailable; using deterministic unavailable state.', fallbackErr);
      useHeuristicFallback = false;
      return false;
    }
  }
}

export function forceHeuristicFallback(force = true) {
  useHeuristicFallback = force;
}