/**
 * Feishu Auth v10.2 - Warm-up retry + optional internal-only test mode
 * Browser access blocked, only Feishu embedded browser allowed
 * In Feishu: wait for SDK, retry auth/login, then fall back to local user ID (no hard block)
 * Add ?internal_only=1 to test strict ByteDance internal access without affecting normal links
 * In browser: show "Open in Feishu" screen
 */
document.addEventListener('DOMContentLoaded', function() {
  var overlay = document.getElementById('auth-overlay');
  var content = document.getElementById('main-content');
  var titleEl = document.getElementById('auth-title');
  var descEl = document.getElementById('auth-desc');
  var params = new URLSearchParams(window.location.search);
  if (params.get('auth_debug') === '1') {
    console.log('[FeishuAuth] Auth debug mode enabled, skip normal page auth');
    return;
  }
  var internalOnlyMode = params.get('internal_only') === '1';

  // Step 1: Check if already cached (real Feishu user only)
  try {
    var cached = sessionStorage.getItem('feishu_user');
    if (cached) {
      var parsed = JSON.parse(cached);
      if (parsed.userId && parsed.userId.startsWith('ou_') && (!internalOnlyMode || parsed.isInternal === true)) {
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

  // Step 3: In Feishu, try SDK auth with warm-up retries
  console.log('[FeishuAuth] In Feishu, starting SDK auth with retries');
  if (titleEl) titleEl.textContent = '正在验证飞书身份';
  if (descEl) descEl.innerHTML = '首次打开可能需要几秒钟，请稍候...';

  // Safety timeout: after 30 seconds, show content with fallback user in normal mode only
  var safetyTimeout = setTimeout(function() {
    if (internalOnlyMode) {
      console.warn('[FeishuAuth] Safety timeout in internal-only mode, blocking access');
      finishAuth();
      showInternalOnlyBlock('身份验证超时，请关闭页面后从飞书重新打开。');
    } else {
      console.log('[FeishuAuth] Safety timeout: falling back to local user');
      fallbackToLocalUser();
    }
  }, 30000);

  var done = false;
  function finishAuth() {
    if (done) return;
    done = true;
    clearTimeout(safetyTimeout);
  }

  function delay(ms) {
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
  }

  // Load JSSDK
  function loadJSSDKOnce() {
    return new Promise(function(resolve, reject) {
      if (window.h5sdk || window.tt) { resolve(); return; }
      var s = document.createElement('script');
      s.src = 'https://lf-scm-cn.feishucdn.com/lark/op/h5-js-sdk-1.5.48.js';
      s.onload = function() { resolve(); };
      s.onerror = function(e) { reject(e); };
      document.head.appendChild(s);
    });
  }

  async function loadJSSDKWithRetry(maxAttempts) {
    for (var i = 1; i <= maxAttempts; i++) {
      try {
        await loadJSSDKOnce();
        return true;
      } catch (e) {
        console.warn('[FeishuAuth] SDK load attempt failed:', i);
        if (i < maxAttempts) await delay(800 * i);
      }
    }
    return !!(window.h5sdk || window.tt);
  }

  function waitForAuthApi(timeoutMs) {
    return new Promise(function(resolve) {
      var start = Date.now();
      (function check() {
        if (window.tt && window.tt.requestAuthCode) {
          resolve(true);
          return;
        }
        if (Date.now() - start >= timeoutMs) {
          resolve(false);
          return;
        }
        setTimeout(check, 300);
      })();
    });
  }

  async function loginWithCode(code, maxAttempts) {
    for (var i = 1; i <= maxAttempts; i++) {
      try {
        var r = await fetch(FeishuAuthHelper.AIPA_LOGIN, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code }),
          signal: AbortSignal.timeout(12000)
        });
        if (r.ok) return await r.json();
        console.warn('[FeishuAuth] Auth API HTTP error:', r.status, 'attempt:', i);
      } catch (e) {
        console.warn('[FeishuAuth] Auth request failed:', e.message, 'attempt:', i);
      }
      if (i < maxAttempts) await delay(900 * i);
    }
    return null;
  }

  loadJSSDKWithRetry(3).then(function() {
    if (window.h5sdk && window.h5sdk.ready) {
      window.h5sdk.ready(function() {
        doAuth();
      });
    } else {
      doAuth();
    }
  }).catch(function() {
    console.warn('[FeishuAuth] SDK load failed after retries, falling back');
    finishAuth();
    fallbackToLocalUser();
  });

  async function doAuth() {
    var authApiReady = await waitForAuthApi(12000);
    if (!authApiReady) {
      console.warn('[FeishuAuth] tt.requestAuthCode not available after waiting, falling back');
      finishAuth();
      fallbackToLocalUser();
      return;
    }

    requestAuthCodeWithRetry(1);
  }

  function requestAuthCodeWithRetry(attempt) {
    if (done) return;
    var maxAttempts = 3;
    var authTimeout = setTimeout(function() {
      console.warn('[FeishuAuth] requestAuthCode timed out, attempt:', attempt);
      if (attempt < maxAttempts) {
        requestAuthCodeWithRetry(attempt + 1);
      } else {
        finishAuth();
        fallbackToLocalUser();
      }
    }, 12000);
    
    window.tt.requestAuthCode({
      appId: FeishuAuthHelper.APP_ID,
      success: async function(res) {
        clearTimeout(authTimeout);
        if (!res.code) {
          console.warn('[FeishuAuth] No auth code, attempt:', attempt);
          if (attempt < maxAttempts) {
            setTimeout(function() { requestAuthCodeWithRetry(attempt + 1); }, 600);
          } else {
            finishAuth();
            fallbackToLocalUser();
          }
          return;
        }
        var data = await loginWithCode(res.code, 2);
        if (done) return;
        if (data && data.success && data.data) {
          var uid = data.data.user_id || data.data.open_id || data.data.id || data.data.userId || '';
          var name = data.data.username || data.data.name || data.data.en_name || '';
          var internalStatus = getInternalStatus(data);
          if (internalOnlyMode && internalStatus !== true) {
            console.warn('[FeishuAuth] Internal-only mode rejected user. Status:', internalStatus, 'data:', JSON.stringify(data));
            finishAuth();
            showInternalOnlyBlock(internalStatus === 'missing'
              ? '后端暂未返回内部员工校验结果，请联系管理员确认 AIPA /api/auth/login 是否已返回 is_internal=true。'
              : '仅限字节内部员工访问。');
            return;
          }
          if (uid) {
            var user = { userId: uid, username: name, isInternal: internalStatus === true };
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
          console.warn('[FeishuAuth] Auth API returned failure after retries, falling back');
          finishAuth();
          if (internalOnlyMode) {
            showInternalOnlyBlock(getBackendErrorMessage(data));
          } else {
            fallbackToLocalUser();
          }
        }
      },
      fail: function(err) {
        clearTimeout(authTimeout);
        console.warn('[FeishuAuth] requestAuthCode fail:', JSON.stringify(err), 'attempt:', attempt);
        if (attempt < maxAttempts) {
          setTimeout(function() { requestAuthCodeWithRetry(attempt + 1); }, 600);
        } else {
          finishAuth();
          fallbackToLocalUser();
        }
      }
    });
  }

  // --- Helper functions ---

  function getInternalStatus(data) {
    if (!data || !data.data) return false;
    var d = data.data;
    var candidates = [
      d.is_internal,
      d.isInternal,
      d.internal,
      d.is_byte_internal,
      d.isByteInternal,
      d.is_bytdance_internal,
      d.isByteDanceInternal,
      d.byte_internal,
      d.bytedance_internal
    ];
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i] === true || candidates[i] === 'true' || candidates[i] === 1 || candidates[i] === '1') return true;
      if (candidates[i] === false || candidates[i] === 'false' || candidates[i] === 0 || candidates[i] === '0') return false;
    }
    if (data.code === 'FORBIDDEN' || data.code === 'NOT_INTERNAL' || data.code === 'UNAUTHORIZED') return false;
    return 'missing';
  }

  function getBackendErrorMessage(data) {
    if (data && (data.message || data.msg)) return data.message || data.msg;
    if (data && data.code === 'FORBIDDEN') return '仅限字节内部员工访问。';
    return '身份验证失败，请确认已从飞书内部应用打开。';
  }

  function hideOverlay() {
    if (overlay) overlay.style.display = 'none';
    if (content) content.style.display = 'block';
  }

  function showInternalOnlyBlock(message) {
    if (overlay) overlay.style.display = 'flex';
    if (content) content.style.display = 'none';
    if (titleEl) titleEl.textContent = '暂无访问权限';
    if (descEl) descEl.innerHTML = message || '仅限字节内部员工访问。';
  }

  function fallbackToLocalUser() {
    if (internalOnlyMode) {
      showInternalOnlyBlock('身份验证失败，请确认已从飞书内部应用打开。');
      return;
    }
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
        var currentUrl = window.location.href;
        var applink = 'https://applink.feishu.cn/client/web_url/open?mode=appCenter&url=' + encodeURIComponent(currentUrl);
        window.location.href = applink;
      };
      overlay.appendChild(btn);
    }
  }
});
