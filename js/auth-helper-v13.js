/**
 * Feishu Auth Helper v12 - Redirect-based auth + debug panel
 * Uses OAuth redirect flow instead of SDK popup to avoid "授权失败" error
 */
const FeishuAuthHelper = {
  _user: null,
  APP_ID: 'cli_a968a864a0f89bdd',
  REDIRECT_URI: 'https://tiktok-shop-awards.github.io/tiktok-awards/',

  _showDebugPanel(user, source) {
    var existing = document.getElementById('auth-debug-panel');
    if (existing) existing.remove();
    var dbg = document.createElement('div');
    dbg.id = 'auth-debug-panel';
    dbg.style.cssText = 'position:fixed;top:10px;right:10px;background:#222;color:#0f0;padding:12px 16px;border-radius:8px;font:12px/1.6 monospace;z-index:999999;max-width:360px;word-break:break-all;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,.5)';
    dbg.innerHTML = '<b>🔧 Auth Debug v12</b><br>source: ' + source + '<br>userId: ' + (user.userId||'N/A') + '<br>username: ' + (user.username||'N/A') + '<br><br><small>Click to dismiss</small>';
    dbg.onclick = function(){ dbg.remove(); };
    document.body.appendChild(dbg);
  },

  async getUser() {
    if (this._user) return this._user;

    // DEBUG: collect auth flow steps
    var _debugSteps = [];

    // Check sessionStorage cache first
    try {
      const cached = sessionStorage.getItem('feishu_user');
      if (cached) {
        this._user = JSON.parse(cached);
        _debugSteps.push('1.sessionCache: HIT');
        setTimeout(() => this._showDebugPanel(this._user, 'sessionCache'), 500);
        return this._user;
      } else {
        _debugSteps.push('1.sessionCache: MISS');
      }
    } catch(e) { _debugSteps.push('1.sessionCache: ERROR'); }

    // Check if we have a code in URL (returned from Feishu OAuth)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      _debugSteps.push('2.urlCode: YES');
      // Clean URL to remove code parameter
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
      
      // Exchange code for user info
      const user = await this._loginWithCode(code);
      if (user && user.userId) {
        _debugSteps.push('2.loginWithCode: OK');
        return user;
      } else {
        _debugSteps.push('2.loginWithCode: FAILED');
      }
    } else {
      _debugSteps.push('2.urlCode: NO');
    }

    // Try SDK auth as fallback (for Feishu in-app)
    var isInFeishu = /Lark|Feishu/i.test(navigator.userAgent);
    _debugSteps.push('3.isInFeishu: ' + isInFeishu);
    _debugSteps.push('3.UA: ' + navigator.userAgent.substring(0, 80));
    
    if (isInFeishu) {
      try {
        await this._loadJSSDK();
        await new Promise(r => setTimeout(r, 300));
        _debugSteps.push('3.h5sdk: ' + (!!window.h5sdk));
        _debugSteps.push('3.tt: ' + (!!window.tt));
        if (window.h5sdk || window.tt) {
          this._registerErrorHandler();
          const user = await this._trySDKAuth();
          _debugSteps.push('3.sdkAuth: ' + (user ? user.userId : 'null'));
          if (user && user.userId) return user;
        }
      } catch (e) {
        _debugSteps.push('3.SDK: ERROR ' + e.message);
        console.warn('[Auth] SDK auth failed:', e);
      }
    }

    // Show debug before fallback
    _debugSteps.push('4.FALLBACK');
    this._showDebugFlowPanel(_debugSteps);
    return this._getFallbackUser();
  },

  _showDebugFlowPanel(steps) {
    var existing = document.getElementById('auth-debug-panel');
    if (existing) existing.remove();
    var dbg = document.createElement('div');
    dbg.id = 'auth-debug-panel';
    dbg.style.cssText = 'position:fixed;top:10px;right:10px;background:#222;color:#0f0;padding:12px 16px;border-radius:8px;font:11px/1.5 monospace;z-index:999999;max-width:380px;word-break:break-all;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,.5)';
    dbg.innerHTML = '<b>🔧 Auth Flow Debug v13</b><br>' + steps.map(s => '<span style="color:#ff0">' + s + '</span>').join('<br>') + '<br><br><small>Click to dismiss</small>';
    dbg.onclick = function(){ dbg.remove(); };
    document.body.appendChild(dbg);
  },

  _registerErrorHandler() {
    if (window.h5sdk && window.h5sdk.error) {
      window.h5sdk.error(function(err) {
        console.warn('[Auth] h5sdk error:', JSON.stringify(err));
      });
    }
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
      var tt = window.tt;
      if (!tt) return null;

      // Wait for ready
      if (window.h5sdk && window.h5sdk.ready) {
        await new Promise(r => window.h5sdk.ready(() => r()));
      }

      // Try requestAuthCode (silent, no popup)
      var code = await new Promise(r => {
        tt.requestAuthCode({
          appId: this.APP_ID,
          success: res => r(res.code),
          fail: err => { console.warn('[Auth] requestAuthCode fail:', JSON.stringify(err)); r(null); }
        });
      });

      if (code) return await this._loginWithCode(code);
    } catch (e) {
      console.warn('[Auth] SDK auth error:', e.message);
    }
    return null;
  },

  async _loginWithCode(code) {
    try {
      const res = await fetch('https://da1e5fb0.aipa.bytedance.net/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code }),
        signal: AbortSignal.timeout(8000)
      });
      if (res.ok) {
        const data = await res.json();
        // DEBUG: log raw AIPA response
        console.log('[Auth-DEBUG] AIPA raw response:', JSON.stringify(data));
        if (data.success && data.data) {
          this._user = { userId: data.data.user_id, username: data.data.username || '' };
          sessionStorage.setItem('feishu_user', JSON.stringify(this._user));
          this._showDebugPanel(this._user, 'AIPA /api/auth/login');
          return this._user;
        }
      }
    } catch (e) {
      console.warn('[Auth] Login failed:', e.message);
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
    this._showDebugPanel(this._user, 'fallback (no auth)');
    return this._user;
  }
};
