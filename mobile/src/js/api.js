/**
 * Kabadiwala Connect — Backend API Client
 * Interfaces with FastAPI Backend adhering to docs/api-contract.md
 */

import { generateUUID } from './utils.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = {
  getToken() {
    return localStorage.getItem('kabadiwala_auth_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('kabadiwala_auth_token', token);
    } else {
      localStorage.removeItem('kabadiwala_auth_token');
    }
  },

  getUser() {
    try {
      const user = localStorage.getItem('kabadiwala_user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  setUser(user) {
    if (user) {
      localStorage.setItem('kabadiwala_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('kabadiwala_user');
    }
  },

  logout() {
    this.setToken(null);
    this.setUser(null);
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
      });

      if (!response.ok) {
        let errorDetail = 'API Request Failed';
        try {
          const errData = await response.json();
          errorDetail = errData.detail || errData.message || response.statusText;
        } catch {
          errorDetail = `${response.status} ${response.statusText}`;
        }
        throw new Error(errorDetail);
      }

      return await response.json();
    } catch (err) {
      console.warn(`[API] Failed to fetch ${endpoint}:`, err.message);
      throw err;
    }
  },

  // Auth Endpoints
  async login(email, password) {
    try {
      const data = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      this.setToken(data.access_token);
      this.setUser({
        user_id: data.user_id,
        role: data.role,
        name: data.name,
        email
      });
      return data;
    } catch (err) {
      // Fallback for offline demo if dealer credentials match seeded default
      if (email === 'dealer@kabadiwala.com' && password === 'password123') {
        const fallbackToken = 'demo-dealer-token-' + Date.now();
        const fallbackUser = {
          user_id: '8c0f1234-5678-4abc-9def-0123456789ab',
          role: 'DEALER',
          name: 'Ramesh Scrap Traders (Offline Mode)',
          email
        };
        this.setToken(fallbackToken);
        this.setUser(fallbackUser);
        return {
          access_token: fallbackToken,
          token_type: 'bearer',
          role: 'DEALER',
          user_id: fallbackUser.user_id,
          name: fallbackUser.name
        };
      }
      throw err;
    }
  },

  // Purchases Endpoints
  async recordPurchase(purchaseData) {
    return await this.request('/purchases', {
      method: 'POST',
      body: JSON.stringify(purchaseData)
    });
  },

  async syncPurchases(purchasesArray) {
    return await this.request('/purchases/sync', {
      method: 'POST',
      body: JSON.stringify({ purchases: purchasesArray })
    });
  },

  async getPurchases(category = null) {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return await this.request(`/purchases${query}`, { method: 'GET' });
  },

  // Stock Endpoints
  async getStock() {
    return await this.request('/stock', { method: 'GET' });
  },

  // Lots Endpoints
  async createLot(lotData) {
    return await this.request('/lots', {
      method: 'POST',
      body: JSON.stringify(lotData)
    });
  },

  async getLot(lotId) {
    return await this.request(`/lots/${encodeURIComponent(lotId)}`, { method: 'GET' });
  },

  async getMyLots() {
    return await this.request('/lots', { method: 'GET' });
  },

  async assignRecycler(lotId, recyclerId) {
    return await this.request(`/lots/${encodeURIComponent(lotId)}/assign-recycler`, {
      method: 'PATCH',
      body: JSON.stringify({ recycler_id: recyclerId })
    });
  },

  async cancelLot(lotId) {
    return await this.request(`/lots/${encodeURIComponent(lotId)}/cancel`, {
      method: 'POST'
    });
  },

  // Recycler Matching Endpoints
  async matchRecyclers(category, lat = null, lon = null) {
    let url = `/recyclers/match?category=${encodeURIComponent(category)}`;
    if (lat !== null && lon !== null) {
      url += `&dealer_lat=${lat}&dealer_lon=${lon}`;
    }
    return await this.request(url, { method: 'GET' });
  },

  // QR Endpoint
  async getQrData(lotId) {
    return await this.request(`/qr/${encodeURIComponent(lotId)}`, { method: 'GET' });
  },

  // Ledger Endpoints
  async getDealerLedger() {
    return await this.request('/dealers/ledger', { method: 'GET' });
  },

  async downloadTransactionPdf(transactionId) {
    const token = this.getToken();
    const res = await fetch(`${this.baseUrl}/transactions/${encodeURIComponent(transactionId)}/pdf`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) {
      throw new Error(`Failed to download certificate: ${res.statusText}`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verified_record_${transactionId.substring(0, 8)}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  },

  async disputeTransaction(transactionId, reason) {
    return await this.request(`/transactions/${encodeURIComponent(transactionId)}/dispute`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  async acceptTransaction(transactionId) {
    return await this.request(`/transactions/${encodeURIComponent(transactionId)}/accept`, {
      method: 'POST'
    });
  }
};
