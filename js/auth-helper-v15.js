/**
 * Feishu Auth Helper v15 - Universal auth
 * Flow: sessionStorage → URL code → SDK requestAuthCode → OAuth redirect → fallback
 * Works in BOTH Feishu embedded browser AND external Chrome
 */
const FeishuAuthHelper = {
  _user: null,
  APP_ID: 'cli_a968a864a0f89bdd',
  REDIRECT_URI: 'https://tiktok-shop-awards.github.io/tiktok-awards/',
  AIPA_LOGIN: 'https://da1e5fb0.aipa.bytedance.net/api/auth/login',

  async getUser() {
    if (this._user) return this._user;

    // Step 1: Check sessionStorage cache
    try {
      const cached = sessionStorage.getItem('feishu_user');
      if (cached) {
        this._user = JSON.parse(cached);
        console.log('[Auth] Cache hit:', this._user.userId);
        return this._user;
      }
    } catch(e) {}

    // Step 2: Check URL code parameter (returned from OAuth redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code) {
      console.log('[Auth] Got OAuth code from URL');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname + window.location.hash);
      
      const user = await this._loginWithCode(code);
      if (user && user.userId) {
        console.log('[Auth] OAuth login success:', user.userId, user.username);
        // If state contains a redirect path, go there
        if (state && state.startsWith('/') && state !== window.location.pathname) {
          sessionStorage.setItem('feishu_user', JSON.stringify(user));
          window.location.href = state;
          return user;
        }
        return user;
      }
      console.warn('[Auth] Code exchange failed, falling through');
    }

    // Step 3: Try SDK auth (Feishu embedded browser only)
    var isInFeishu = /Lark|Feishu/i.test(navigator.userAgent);
    
    if (isInFeishu) {
      try {
        await this._loadJSSDK();
        await new Promise(r => setTimeout(r, 500));
        if (window.h5sdk || window.tt) {
          if (window.h5sdk && window.h5sdk.error) {
            window.h5sdk.error(function(err) {
              console.warn('[Auth] h5sdk error:', JSON.stringify(err));
            });
          }
          const user = await this._trySDKAuth();
          if (user && user.userId) {
            console.log('[Auth] SDK auth success:', user.userId, user.username);
            return user;
          }
        }
      } catch (e) {
        console.warn('[Auth] SDK auth failed:', e);
      }
      // SDK failed in Feishu → fall through to OAuth redirect
    }

    // Step 4: OAuth redirect (works in ANY browser)
    if (!sessionStorage.getItem('oauth_attempted')) {
      sessionStorage.setItem('oauth_attempted', '1');
      console.log('[Auth] Attempting OAuth redirect...');
      this._redirectToOAuth();
      // Page will redirect, return temp user
      return { userId: 'redirecting', username: '' };
    }

    // Step 5: All methods failed → fallback anonymous
    console.log('[Auth] All auth methods failed, using fallback');
    return this._getFallbackUser();
  },

  _redirectToOAuth() {
    // Pass current page path in state so we can redirect back after auth
    var currentState = window.location.pathname;
    var oauthUrl = 'https://open.feishu.cn/open-apis/authen/v1/authorize'
      + '?app_id=' + encodeURIComponent(this.APP_ID)
      + '&redirect_uri=' + encodeURIComponent(this.REDIRECT_URI)
      + '&response_type=code'
      + '&state=' + encodeURIComponent(currentState);
    console.log('[Auth] Redirecting to:', oauthUrl);
    window.location.href = oauthUrl;
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

      if (window.h5sdk && window.h5sdk.ready) {
        await new Promise(r => window.h5sdk.ready(() => r()));
      }

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
      const res = await fetch(this.AIPA_LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code }),
        signal: AbortSignal.timeout(8000)
      });
      if (res.ok) {
        const data = await res.json();
        console.log('[Auth] AIPA response:', JSON.stringify(data));
        if (data.success && data.data) {
          this._user = { userId: data.data.user_id, username: data.data.username || '' };
          sessionStorage.setItem('feishu_user', JSON.stringify(this._user));
          sessionStorage.removeItem('oauth_attempted');
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
