/**
 * Feishu Auth Helper v21.1 - Robust user ID extraction + warm-up retry
 * Flow: sessionStorage → URL code → SDK requestAuthCode with retry → fallback
 * Fix: _loginWithCode tries multiple field names for user ID (user_id, open_id, id)
 */
const FeishuAuthHelper = {
  _user: null,
  APP_ID: 'cli_a968a864a0f89bdd',
  AIPA_LOGIN: 'https://da1e5fb0.aipa.bytedance.net/api/auth/login',

  async getUser() {
    if (this._user) return this._user;

    // Step 1: Check sessionStorage cache (only real Feishu users with ou_ ID)
    try {
      const cached = sessionStorage.getItem('feishu_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.userId && parsed.userId.startsWith('ou_')) {
          this._user = parsed;
          return this._user;
        }
        // Clear invalid cache (fallback IDs or empty userId)
        sessionStorage.removeItem('feishu_user');
      }
    } catch(e) { sessionStorage.removeItem('feishu_user'); }

    // Step 2: Check URL code parameter
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      window.history.replaceState({}, '', window.location.pathname + window.location.hash);
      const user = await this._loginWithCode(code);
      if (user && user.userId) return user;
    }

    // Step 3: SDK auth (Feishu embedded browser)
    var isInFeishu = /Lark|Feishu/i.test(navigator.userAgent);
    if (isInFeishu) {
      try {
        await this._loadJSSDKWithRetry(3);
        await this._waitForAuthApi(12000);
        if (window.h5sdk || window.tt) {
          if (window.h5sdk && window.h5sdk.error) {
            window.h5sdk.error(function(err) {
              console.warn('[Auth] h5sdk error:', JSON.stringify(err));
            });
          }
          const user = await this._trySDKAuth();
          if (user && user.userId) return user;
        }
      } catch (e) {
        console.warn('[Auth] SDK auth failed:', e);
      }
    }

    // Step 4: Fallback
    return this._getFallbackUser();
  },

  _loadJSSDK() {
    return new Promise((resolve, reject) => {
      if (window.h5sdk || window.tt) { resolve(); return; }
      var s = document.createElement('script');
      s.src = 'https://lf-scm-cn.feishucdn.com/lark/op/h5-js-sdk-1.5.44.js';
      s.onload = () => resolve();
      s.onerror = (e) => reject(e);
      document.head.appendChild(s);
    });
  },

  async _loadJSSDKWithRetry(maxAttempts) {
    for (let i = 1; i <= maxAttempts; i++) {
      try {
        await this._loadJSSDK();
        return true;
      } catch (e) {
        console.warn('[Auth] SDK load attempt failed:', i);
        if (i < maxAttempts) await new Promise(r => setTimeout(r, 800 * i));
      }
    }
    return !!(window.h5sdk || window.tt);
  },

  _waitForAuthApi(timeoutMs) {
    return new Promise(resolve => {
      const start = Date.now();
      const check = () => {
        if (window.tt && window.tt.requestAuthCode) {
          resolve(true);
          return;
        }
        if (Date.now() - start >= timeoutMs) {
          resolve(false);
          return;
        }
        setTimeout(check, 300);
      };
      check();
    });
  },

  async _trySDKAuth() {
    try {
      if (!window.tt || !window.tt.requestAuthCode) return null;
      if (window.h5sdk && window.h5sdk.ready) {
        await new Promise(r => window.h5sdk.ready(() => r()));
      }
      for (let attempt = 1; attempt <= 3; attempt++) {
        var code = await new Promise(r => {
          var timeout = setTimeout(() => r(null), 12000);
          window.tt.requestAuthCode({
            appId: this.APP_ID,
            success: res => { clearTimeout(timeout); r(res.code); },
            fail: err => { clearTimeout(timeout); console.warn('[Auth] requestAuthCode fail:', JSON.stringify(err), 'attempt:', attempt); r(null); }
          });
        });
        if (code) return await this._loginWithCode(code);
        if (attempt < 3) await new Promise(r => setTimeout(r, 600));
      }
    } catch (e) {
      console.warn('[Auth] SDK auth error:', e.message);
    }
    return null;
  },

  async _loginWithCode(code) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(this.AIPA_LOGIN, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code }),
          signal: AbortSignal.timeout(12000)
        });
        if (res.ok) {
          const data = await res.json();
          console.log('[Auth] AIPA response:', JSON.stringify(data));
          if (data.success && data.data) {
            // Try multiple field names for user ID - AIPA might return different keys
            var uid = data.data.user_id || data.data.open_id || data.data.id || data.data.userId || '';
            var name = data.data.username || data.data.name || data.data.en_name || '';
            if (uid) {
              this._user = { userId: uid, username: name };
              sessionStorage.setItem('feishu_user', JSON.stringify(this._user));
              return this._user;
            }
            console.warn('[Auth] AIPA returned no user ID field. Data:', JSON.stringify(data.data));
          }
        } else {
          console.warn('[Auth] AIPA HTTP error:', res.status, 'attempt:', attempt);
        }
      } catch (e) {
        console.warn('[Auth] Login failed:', e.message, 'attempt:', attempt);
      }
      if (attempt < 2) await new Promise(r => setTimeout(r, 900));
    }
    return null;
  },

  _getFallbackUser() {
    var uid = localStorage.getItem('award_uid');
    if (!uid) {
      uid = 'u_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      localStorage.setItem('award_uid', uid);
    }
    this._user = { userId: uid, username: '' };
    return this._user;
  }
};
