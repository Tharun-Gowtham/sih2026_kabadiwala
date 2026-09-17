/**
 * Kabadiwala Connect — Dealer Login View
 */

import { apiClient } from '../api.js';
import { showToast } from '../utils.js';

export function renderLoginView(container, navigateTo) {
  container.innerHTML = `
    <div class="view-transition" style="padding-top: var(--space-lg);">
      <div style="text-align: center; margin-bottom: var(--space-xl);">
        <div style="font-size: 3.5rem; margin-bottom: 8px;">♻️</div>
        <h1 style="font-size: 1.6rem; font-weight: 800; color: var(--text-main); margin-bottom: 4px;">Dealer Portal</h1>
        <p style="color: var(--text-secondary); font-size: 0.88rem;">Digital traceability for scrap & circular e-waste</p>
      </div>

      <div class="card" style="box-shadow: var(--shadow-md);">
        <form id="dealerLoginForm">
          <div class="form-group">
            <label class="form-label" for="loginEmail">Dealer Email / ID</label>
            <input 
              type="email" 
              id="loginEmail" 
              class="form-input" 
              placeholder="e.g. dealer@kabadiwala.com" 
              value="dealer@kabadiwala.com"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="loginPassword">Password / PIN</label>
            <input 
              type="password" 
              id="loginPassword" 
              class="form-input" 
              placeholder="Enter your password" 
              value="password123"
              required
            />
          </div>

          <button type="submit" class="btn btn-primary" id="loginSubmitBtn" style="margin-top: 8px;">
            <span id="loginBtnText">Sign In to Dashboard</span>
          </button>
        </form>

        <div style="margin-top: var(--space-md); text-align: center;">
          <button type="button" class="btn btn-sm btn-outline" id="demoFillBtn" style="width: 100%;">
            ⚡ Auto-Fill Demo Dealer Credentials
          </button>
        </div>
      </div>

      <div style="text-align: center; margin-top: var(--space-md);">
        <button class="btn btn-sm btn-secondary" id="switchToCollectorBtn" style="color: #38bdf8;">
          Switch to Collector / Kabadiwala Lite ➔
        </button>
      </div>
    </div>
  `;

  const form = container.querySelector('#dealerLoginForm');
  const emailInput = container.querySelector('#loginEmail');
  const passwordInput = container.querySelector('#loginPassword');
  const submitBtn = container.querySelector('#loginSubmitBtn');
  const btnText = container.querySelector('#loginBtnText');
  const demoBtn = container.querySelector('#demoFillBtn');
  const switchBtn = container.querySelector('#switchToCollectorBtn');

  demoBtn?.addEventListener('click', () => {
    emailInput.value = 'dealer@kabadiwala.com';
    passwordInput.value = 'password123';
    showToast('Demo dealer credentials populated', 'info');
  });

  switchBtn?.addEventListener('click', () => {
    window.setAppMode('collector');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      showToast('Please enter both email and password', 'error');
      return;
    }

    submitBtn.disabled = true;
    btnText.textContent = 'Authenticating...';

    try {
      const res = await apiClient.login(email, password);
      showToast(`Welcome back, ${res.name || 'Dealer'}!`, 'success');
      navigateTo('dealer-home');
    } catch (err) {
      showToast(`Login failed: ${err.message}`, 'error');
    } finally {
      submitBtn.disabled = false;
      btnText.textContent = 'Sign In to Dashboard';
    }
  });
}
