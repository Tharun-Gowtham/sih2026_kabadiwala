/**
 * Kabadiwala Connect — Utility Helpers
 */

// Generate UUID v4 adhering to standard RFC4122
export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// 7 Canonical Categories
export const CANONICAL_CATEGORIES = [
  { id: 'PCB', name: 'PCB', icon: '💻', desc: 'Printed Circuit Boards & Motherboards', baseRate: 450, unit: 'kg' },
  { id: 'CRT', name: 'CRT', icon: '📺', desc: 'Cathode Ray Tubes & Monitors', baseRate: 45, unit: 'kg' },
  { id: 'LCD', name: 'LCD', icon: '🖥️', desc: 'Liquid Crystal Display Panels', baseRate: 180, unit: 'kg' },
  { id: 'Cable', name: 'Cable', icon: '🔌', desc: 'Copper/Aluminum Wiring & Harnesses', baseRate: 320, unit: 'kg' },
  { id: 'Battery', name: 'Battery', icon: '🔋', desc: 'Li-ion, Lead Acid, NiMH Batteries', baseRate: 95, unit: 'kg' },
  { id: 'Motor/Magnet', name: 'Motor/Magnet', icon: '⚙️', desc: 'Electric Motors & Neodymium Magnets', baseRate: 90, unit: 'kg' },
  { id: 'Mixed Plastic', name: 'Mixed Plastic', icon: '🛢️', desc: 'E-waste Plastic Casings & Shreds', baseRate: 35, unit: 'kg' }
];

export function getCategoryMeta(categoryId) {
  return CANONICAL_CATEGORIES.find(c => c.id === categoryId) || {
    id: categoryId,
    name: categoryId,
    icon: '📦',
    desc: 'Recyclable Material',
    baseRate: 0,
    unit: 'kg'
  };
}

export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
}

export function formatWeight(kg) {
  const num = Number(kg) || 0;
  return `${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kg`;
}

export function formatDate(isoString) {
  if (!isoString) return 'Just now';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Recently';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <span style="cursor:pointer;opacity:0.8;margin-left:8px;" onclick="this.parentElement.remove()">✕</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 200);
    }
  }, duration);
}
