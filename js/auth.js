/**
 * Feishu Auth v10.0 - Relaxed mobile auth
 * Browser access blocked, only Feishu embedded browser allowed
 * In Feishu: try SDK auth; if fails, fall back to local user ID (no hard block)
 * In browser: show "Open in Feishu" screen
 */
document.addEventListener('DOMContentLoaded', function() {
  var overlay = document.getElementById('auth-overlay');
  var content = document.getElementById('main-content');
  var titleEl = document.getElementById('auth-title');
  var descEl = document.getElementById('auth-desc');

  // Step 1: Check if already cached (real Feishu user only)
  try {
    var cached = sessionStorage.getItem('feishu_user');
    if (cached) {
      var parsed = JSON.parse(cached);
      if (parsed.userId && parsed.userId.startsWith('ou_')) {
        console.log('[FeishuAuth] Cached Feishu user, showing content');
        hideOverlay();
        return;
      }
      sessionStorage.removeItem('feishu_user');
    }
  } catch(e) { sessionStorage.removeItem('feishu_user'); }

  // Step 2: Check if in Feishu
  var isInFeishu = /Lark|Feishu/i.test(navigator.userAgent);
  if (!isInFeishu) {
    console.log('[FeishuAuth] Not in Feishu, access denied');
    showFeishuOnlyBlock();
    return;
  }

  // Step 3: In Feishu, try SDK auth with fallback
  console.log('[FeishuAuth] In Feishu, starting SDK auth with fallback');

  // Safety timeout: after 6 seconds, always show content with fallback user
  var safetyTimeout = setTimeout(function() {
    console.log('[FeishuAuth] Safety timeout: falling back to local user');
    fallbackToLocalUser();
  }, 6000);

  var done = false;
  function finishAuth() {
    if (done) return;
    done = true;
    clearTimeout(safetyTimeout);
  }

  // Load JSSDK
  function loadJSSDK() {
    return new Promise(function(resolve, reject) {
      if (window.h5sdk || window.tt) { resolve(); return; }
      var s = document.createElement('script');
      s.src = 'https://lf-scm-cn.feishucdn.com/lark/op/h5-js-sdk-1.5.48.js';
      s.onload = function() { resolve(); };
      s.onerror = function(e) { reject(e); };
      document.head.appendChild(s);
    });
  }

  loadJSSDK().then(function() {
    if (window.h5sdk && window.h5sdk.ready) {
      window.h5sdk.ready(function() {
        doAuth();
      });
    } else {
      doAuth();
    }
  }).catch(function() {
    console.warn('[FeishuAuth] SDK load failed, falling back');
    finishAuth();
    fallbackToLocalUser();
  });

  function doAuth() {
    if (!window.tt || !window.tt.requestAuthCode) {
      console.warn('[FeishuAuth] tt.requestAuthCode not available, falling back');
      finishAuth();
      fallbackToLocalUser();
      return;
    }

    // Set a 10s timeout for the auth request itself
    var authTimeout = setTimeout(function() {
      console.warn('[FeishuAuth] requestAuthCode timed out, falling back');
      finishAuth();
      fallbackToLocalUser();
    }, 10000);

    window.tt.requestAuthCode({
      appId: FeishuAuthHelper.APP_ID,
      success: function(res) {
        clearTimeout(authTimeout);
        if (!res.code) {
          console.warn('[FeishuAuth] No auth code, falling back');
          finishAuth();
          fallbackToLocalUser();
          return;
        }
        fetch(FeishuAuthHelper.AIPA_LOGIN, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: res.code }),
          signal: AbortSignal.timeout(8000)
        }).then(function(r) {
          if (r.ok) return r.json();
          throw new Error('HTTP ' + r.status);
        }).then(function(data) {
          if (data.success && data.data) {
            var uid = data.data.user_id || data.data.open_id || data.data.id || data.data.userId || '';
            var name = data.data.username || data.data.name || data.data.en_name || '';
            if (uid) {
              var user = { userId: uid, username: name };
              sessionStorage.setItem('feishu_user', JSON.stringify(user));
              console.log('[FeishuAuth] Auth success:', uid);
              finishAuth();
              hideOverlay();
            } else {
              console.warn('[FeishuAuth] No user ID in response, falling back');
              finishAuth();
              fallbackToLocalUser();
            }
          } else {
            console.warn('[FeishuAuth] Auth API returned failure, falling back');
            finishAuth();
            fallbackToLocalUser();
          }
        }).catch(function(e) {
          console.warn('[FeishuAuth] Auth request failed:', e.message, ', falling back');
          finishAuth();
          fallbackToLocalUser();
        });
      },
      fail: function(err) {
        clearTimeout(authTimeout);
        console.warn('[FeishuAuth] requestAuthCode fail:', JSON.stringify(err), ', falling back');
        finishAuth();
        fallbackToLocalUser();
      }
    });
  }

  // --- Helper functions ---

  function hideOverlay() {
    if (overlay) overlay.style.display = 'none';
    if (content) content.style.display = 'block';
  }

  function fallbackToLocalUser() {
    // Generate a local user ID for fallback (same as auth-helper-v21.js)
    var uid = localStorage.getItem('award_uid');
    if (!uid) {
      uid = 'u_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      localStorage.setItem('award_uid', uid);
    }
    var user = { userId: uid, username: '' };
    sessionStorage.setItem('feishu_user', JSON.stringify(user));
    console.log('[FeishuAuth] Using fallback local user:', uid);
    hideOverlay();
  }

  function showFeishuOnlyBlock() {
    if (overlay) overlay.style.display = 'flex';
    if (content) content.style.display = 'none';
    if (titleEl) titleEl.textContent = '请从飞书内打开';
    if (descEl) {
      descEl.innerHTML = '本页面仅支持飞书客户端内访问，请点击下方按钮在飞书中打开';
    }
    if (overlay) {
      var btn = document.createElement('button');
      btn.textContent = '在飞书中打开';
      btn.style.marginTop = '20px';
      btn.style.padding = '10px 24px';
      btn.style.borderRadius = '8px';
      btn.style.border = 'none';
      btn.style.background = '#3370ff';
      btn.style.color = '#fff';
      btn.style.fontSize = '14px';
      btn.style.fontWeight = '600';
      btn.style.cursor = 'pointer';
      btn.onclick = function() {
        var currentUrl = window.location.origin + window.location.pathname;
        var applink = 'https://applink.feishu.cn/client/web_url/open?mode=appCenter&url=' + encodeURIComponent(currentUrl);
        window.location.href = applink;
      };
      overlay.appendChild(btn);
    }
  }
});
