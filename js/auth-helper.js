/**
 * Feishu Auth Helper v18 - SDK auth with visible debug for mobile
 */
const FeishuAuthHelper = {
  _user: null,
  APP_ID: 'cli_a968a864a0f89bdd',
  AIPA_LOGIN: 'https://da1e5fb0.aipa.bytedance.net/api/auth/login',
  _steps: [],

  _log(msg) {
    this._steps.push(msg);
    console.log('[Auth] ' + msg);
  },

  _showDebug() {
    var existing = document.getElementById('auth-debug');
    if (existing) existing.remove();
    var d = document.createElement('div');
    d.id = 'auth-debug';
    d.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#222;color:#0f0;padding:10px 14px;font:11px/1.5 monospace;z-index:999999;max-height:40vh;overflow:auto;cursor:pointer';
    d.innerHTML = '<b>🔍 Auth Debug v18</b><br>' + this._steps.map(s => '<span style="color:#ff0">' + s + '</span>').join('<br>') + '<br><br><small>Click to dismiss</small>';
    d.onclick = function(){ d.remove(); };
    document.body.appendChild(d);
  },

  async getUser() {
    if (this._user) return this._user;

    // Step 1: Cache check
    try {
      const cached = sessionStorage.getItem('feishu_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.userId && parsed.userId.startsWith('ou_')) {
          this._user = parsed;
          this._log('1.Cache HIT: ' + parsed.userId);
          this._showDebug();
          return this._user;
        }
        this._log('1.Cache has fallback, cleared');
        sessionStorage.removeItem('feishu_user');
      } else {
        this._log('1.Cache: empty');
      }
    } catch(e) { this._log('1.Cache: error'); sessionStorage.removeItem('feishu_user'); }

    // Step 2: URL code
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      this._log('2.URL code: YES');
      window.history.replaceState({}, '', window.location.pathname + window.location.hash);
      const user = await this._loginWithCode(code);
      if (user && user.userId) {
        this._log('2.Login OK: ' + user.userId + ' / ' + user.username);
        this._showDebug();
        return user;
      }
      this._log('2.Login FAILED');
    } else {
      this._log('2.URL code: none');
    }

    // Step 3: SDK auth
    var isInFeishu = /Lark|Feishu/i.test(navigator.userAgent);
    this._log('3.isFeishu: ' + isInFeishu);
    this._log('3.UA: ' + navigator.userAgent.substring(0, 60));

    if (isInFeishu) {
      try {
        await this._loadJSSDK();
        await new Promise(r => setTimeout(r, 500));
        this._log('3.h5sdk: ' + !!window.h5sdk + ' tt: ' + !!window.tt);
        if (window.h5sdk || window.tt) {
          if (window.h5sdk && window.h5sdk.error) {
            window.h5sdk.error(err => this._log('3.h5sdk error: ' + JSON.stringify(err)));
          }
          const user = await this._trySDKAuth();
          if (user && user.userId) {
            this._log('3.SDK OK: ' + user.userId + ' / ' + user.username);
            this._showDebug();
            return user;
          }
        }
      } catch (e) {
        this._log('3.SDK error: ' + e.message);
      }
    }

    // Step 4: Fallback
    this._log('4.FALLBACK - auth failed');
    this._showDebug();
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

  async _trySDKAuth() {
    try {
      if (!window.tt) { this._log('3.No tt object'); return null; }
      if (window.h5sdk && window.h5sdk.ready) {
        await new Promise(r => window.h5sdk.ready(() => r()));
        this._log('3.h5sdk ready');
      }
      this._log('3.Calling requestAuthCode...');
      var code = await new Promise(r => {
        window.tt.requestAuthCode({
          appId: this.APP_ID,
          success: res => { this._log('3.rAC OK'); r(res.code); },
          fail: err => { this._log('3.rAC FAIL: ' + err.errCode + ' ' + (err.errMsg || err.errString || '')); r(null); }
        });
      });
      if (code) return await this._loginWithCode(code);
    } catch (e) {
      this._log('3.SDK exception: ' + e.message);
    }
    return null;
  },

  async _loginWithCode(code) {
    try {
      this._log('AIPA POST /api/auth/login...');
      const res = await fetch(this.AIPA_LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code }),
        signal: AbortSignal.timeout(8000)
      });
      this._log('AIPA HTTP ' + res.status);
      if (res.ok) {
        const data = await res.json();
        this._log('AIPA response: ' + JSON.stringify(data));
        if (data.success && data.data) {
          this._user = { userId: data.data.user_id, username: data.data.username || '' };
          sessionStorage.setItem('feishu_user', JSON.stringify(this._user));
          return this._user;
        }
        this._log('AIPA: success=false');
      }
    } catch (e) {
      this._log('AIPA error: ' + e.message);
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
