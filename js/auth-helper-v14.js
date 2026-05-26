/**
 * Feishu Auth Helper v14 - Robust auth with OAuth redirect fallback
 * Flow: sessionStorage → URL code → SDK requestAuthCode → OAuth redirect → fallback
 */
const FeishuAuthHelper = {
  _user: null,
  APP_ID: 'cli_a968a864a0f89bdd',
  REDIRECT_URI: 'https://tiktok-shop-awards.github.io/tiktok-awards/',

  async getUser() {
    if (this._user) return this._user;

    // Step 1: Check sessionStorage cache
    try {
      const cached = sessionStorage.getItem('feishu_user');
      if (cached) {
        this._user = JSON.parse(cached);
        return this._user;
      }
    } catch(e) {}

    // Step 2: Check if we have a code in URL (returned from Feishu OAuth redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      // Clean URL to remove code parameter
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
      
      // Exchange code for user info via AIPA backend
      const user = await this._loginWithCode(code);
      if (user && user.userId) return user;
      // If AIPA failed with the code, fall through to try SDK
    }

    // Step 3: Try SDK auth (silent, for Feishu in-app browser)
    var isInFeishu = /Lark|Feishu/i.test(navigator.userAgent);
    if (isInFeishu) {
      try {
        await this._loadJSSDK();
        await new Promise(r => setTimeout(r, 500));
        if (window.h5sdk || window.tt) {
          this._registerErrorHandler();
          const user = await this._trySDKAuth();
          if (user && user.userId) return user;
        }
      } catch (e) {
        console.warn('[Auth] SDK auth failed:', e);
      }

      // Step 4: SDK failed in Feishu → redirect to OAuth
      // This is the KEY fix: if we're in Feishu but SDK didn't work,
      // do a full OAuth redirect instead of falling back to random ID
      this._redirectToOAuth();
      // Return a temporary user while redirect happens
      // (page will reload, so this won't actually be used)
      return { userId: 'redirecting', username: '' };
    }

    // Step 5: Not in Feishu at all → fallback to anonymous
    return this._getFallbackUser();
  },

  _redirectToOAuth() {
    // Build Feishu OAuth URL and redirect
    var oauthUrl = 'https://open.feishu.cn/open-apis/authen/v1/authorize'
      + '?app_id=' + encodeURIComponent(this.APP_ID)
      + '&redirect_uri=' + encodeURIComponent(this.REDIRECT_URI)
      + '&response_type=code'
      + '&state=auth';
    console.log('[Auth] Redirecting to Feishu OAuth:', oauthUrl);
    window.location.href = oauthUrl;
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
        if (data.success && data.data) {
          this._user = { userId: data.data.user_id, username: data.data.username || '' };
          sessionStorage.setItem('feishu_user', JSON.stringify(this._user));
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
    return this._user;
  }
};
