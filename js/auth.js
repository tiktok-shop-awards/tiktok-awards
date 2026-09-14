/**
 * Feishu Auth v11.0 - Strict Feishu auth
 * Browser access blocked, only Feishu embedded browser allowed.
 * In Feishu: content is shown only after cli_a968a864a0f89bdd auth succeeds.
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

  // Step 3: In Feishu, require SDK auth success
  console.log('[FeishuAuth] In Feishu, starting strict SDK auth');

  // Safety timeout: if auth hangs, block access instead of falling back.
  var safetyTimeout = setTimeout(function() {
    console.warn('[FeishuAuth] Safety timeout: auth did not complete');
    finishAuth();
    showAccessDenied('飞书授权超时，请刷新页面后重试。');
  }, 15000);

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
    console.warn('[FeishuAuth] SDK load failed');
    finishAuth();
    showAccessDenied('飞书 SDK 加载失败，请确认在飞书客户端内打开。');
  });

  function doAuth() {
    if (!window.tt || !window.tt.requestAuthCode) {
      console.warn('[FeishuAuth] tt.requestAuthCode not available');
      finishAuth();
      showAccessDenied('无法获取飞书授权能力，请从飞书应用内重新打开。');
      return;
    }

    // Set a 10s timeout for the auth request itself
    var authTimeout = setTimeout(function() {
      console.warn('[FeishuAuth] requestAuthCode timed out');
      finishAuth();
      showAccessDenied('飞书授权超时，请刷新页面后重试。');
    }, 10000);

    window.tt.requestAuthCode({
      appId: FeishuAuthHelper.APP_ID,
      success: function(res) {
        clearTimeout(authTimeout);
        if (!res.code) {
          console.warn('[FeishuAuth] No auth code');
          finishAuth();
          showAccessDenied('未获取到飞书授权码，请从飞书应用内重新打开。');
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
            if (uid && uid.startsWith('ou_')) {
              var user = { userId: uid, username: name };
              sessionStorage.setItem('feishu_user', JSON.stringify(user));
              console.log('[FeishuAuth] Auth success:', uid);
              finishAuth();
              hideOverlay();
            } else {
              console.warn('[FeishuAuth] No valid Feishu open_id in response');
              finishAuth();
              showAccessDenied('未获取到有效的飞书用户身份，请确认你有权限访问该应用。');
            }
          } else {
            console.warn('[FeishuAuth] Auth API returned failure');
            finishAuth();
            showAccessDenied('飞书身份校验未通过，暂无法访问该页面。');
          }
        }).catch(function(e) {
          console.warn('[FeishuAuth] Auth request failed:', e.message);
          finishAuth();
          showAccessDenied('飞书身份校验失败，请稍后重试或联系管理员。');
        });
      },
      fail: function(err) {
        clearTimeout(authTimeout);
        console.warn('[FeishuAuth] requestAuthCode fail:', JSON.stringify(err));
        finishAuth();
        showAccessDenied('飞书授权失败，请确认你正在使用字节内部飞书账号访问。');
      }
    });
  }

  // --- Helper functions ---

  function hideOverlay() {
    if (overlay) overlay.style.display = 'none';
    if (content) content.style.display = 'block';
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

  function showAccessDenied(message) {
    sessionStorage.removeItem('feishu_user');
    if (overlay) overlay.style.display = 'flex';
    if (content) content.style.display = 'none';
    if (titleEl) titleEl.textContent = '暂无访问权限';
    if (descEl) {
      descEl.innerHTML = message || '仅限通过字节内部飞书应用授权后访问。';
    }
  }
});
