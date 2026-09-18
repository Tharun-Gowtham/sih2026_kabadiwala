const API_BASE_URL = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? `http://${window.location.hostname}:8000/api`
    : 'http://localhost:8000/api'
);

class RecyclerApiClient {
  constructor() {
    this.token = localStorage.getItem('recycler_token') || null;
  }

  async login(email = 'greencycle@recycler.com', password = 'password123') {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Login failed');
    }
    const data = await res.json();
    this.token = data.access_token;
    localStorage.setItem('recycler_token', this.token);
    localStorage.setItem('recycler_user', JSON.stringify(data));
    return data;
  }

  async ensureAuth() {
    if (this.token) return this.token;
    const data = await this.login();
    return data.access_token;
  }

  async request(endpoint, options = {}) {
    await this.ensureAuth();
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
      ...options.headers
    };

    let res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (res.status === 401) {
      this.token = null;
      localStorage.removeItem('recycler_token');
      await this.ensureAuth();
      headers['Authorization'] = `Bearer ${this.token}`;
      res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
      });
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || errData.message || `Request failed (${res.status})`);
    }

    return await res.json();
  }

  async getIncomingLots(statusFilter = null) {
    let url = '/recyclers/lots';
    if (statusFilter && statusFilter !== 'all') {
      url += `?status=${encodeURIComponent(statusFilter)}`;
    }
    return await this.request(url);
  }

  async verifyHandover(lotId, verifiedWeight) {
    return await this.request(`/handover/verify/${encodeURIComponent(lotId)}`, {
      method: 'POST',
      body: JSON.stringify({ verified_weight: Number(verifiedWeight) })
    });
  }

  async confirmHandover(lotId, verifiedWeight, notes = null) {
    return await this.request(`/handover/confirm/${encodeURIComponent(lotId)}`, {
      method: 'POST',
      body: JSON.stringify({
        verified_weight: Number(verifiedWeight),
        notes: notes || undefined
      })
    });
  }

  async downloadCertificatePdf(transactionId) {
    const token = await this.ensureAuth();
    const res = await fetch(`${API_BASE_URL}/transactions/${encodeURIComponent(transactionId)}/pdf`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to download certificate');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verified_record_${transactionId.substring(0, 8)}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  }

  async getProfile() {
    return await this.request('/recyclers/profile');
  }

  async updateProfile(profileData) {
    return await this.request('/recyclers/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  async getMe() {
    return await this.request('/auth/me');
  }

  async getTransactions() {
    return await this.request('/transactions');
  }

  // Milk-Run Batch endpoints
  async getAvailableBatches(category = null) {
    let url = '/batches/available';
    if (category) url += `?category=${encodeURIComponent(category)}`;
    return await this.request(url);
  }

  async getMyBatches(statusFilter = null) {
    let url = '/batches/my';
    if (statusFilter) url += `?status=${encodeURIComponent(statusFilter)}`;
    return await this.request(url);
  }

  async triggerBatchFormation() {
    return await this.request('/batches/form', { method: 'POST' });
  }

  async acceptBatch(batchId) {
    return await this.request(`/batches/${encodeURIComponent(batchId)}/accept`, { method: 'POST' });
  }

  async dispatchBatch(batchId) {
    return await this.request(`/batches/${encodeURIComponent(batchId)}/dispatch`, { method: 'POST' });
  }

  async getBatchRoute(batchId) {
    return await this.request(`/batches/${encodeURIComponent(batchId)}/route`);
  }
}

export const recyclerApi = new RecyclerApiClient();
