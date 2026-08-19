/**
 * Feishu Auth v9.2 - Strict gate, silent auth in Feishu
 * Browser access blocked, only Feishu embedded browser allowed
 * In Feishu: silent auth, no loading overlay shown on success
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
        if (overlay) overlay.style.display = 'none';
        if (content) content.style.display = 'block';
        return;
      }
      sessionStorage.removeItem('feishu_user');
    }
  } catch(e) { sessionStorage.removeItem('feishu_user'); }

  // Step 2: Check if in Feishu
  var isInFeishu = /Lark|Feishu/i.test(navigator.userAgent);
  if (!isInFeishu) {
    console.log('[FeishuAuth] Not in Feishu, access denied');
    if (overlay) overlay.style.display = 'flex';
    if (content) content.style.display = 'none';
    if (titleEl) titleEl.textContent = '请从飞书内打开';
    if (descEl) {
      descEl.innerHTML = '本页面仅支持飞书客户端内访问，请点击下方按钮在飞书中打开';
    }
    // Add "Open in Feishu" button
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
        // Open current page in Feishu WebView, embedded in appCenter tab
        var currentUrl = window.location.origin + window.location.pathname;
        var applink = 'https://applink.feishu.cn/client/web_url/open?mode=appCenter&url=' + encodeURIComponent(currentUrl);
        window.location.href = applink;
      };
      overlay.appendChild(btn);
    }
    return;
  }

  // Step 3: In Feishu, silent auth — no loading overlay, show error only on failure
  console.log('[FeishuAuth] In Feishu, starting silent SDK auth');

  var timedOut = false;
  var timeoutId = setTimeout(function() {
    timedOut = true;
    showError('验证超时，请下拉刷新页面重试');
  }, 20000);

  function showContent() {
    clearTimeout(timeoutId);
    if (timedOut) return;
    if (overlay) overlay.style.display = 'none';
    if (content) content.style.display = 'block';
    console.log('[FeishuAuth] Auth success, showing content');
  }

  function showError(msg) {
    clearTimeout(timeoutId);
    if (timedOut) return;
    if (titleEl) titleEl.textContent = '身份验证失败';
    if (descEl) descEl.textContent = msg || '请下拉刷新页面重试';
    // Show overlay with error message, hide content
    if (overlay) overlay.style.display = 'flex';
    if (content) content.style.display = 'none';
    console.log('[FeishuAuth] Auth failed:', msg);
  }

  // Load JSSDK
  function loadJSSDK() {
    return new Promise(function(resolve, reject) {
      if (window.h5sdk || window.tt) { resolve(); return; }
      var s = document.createElement('script');
      s.src = 'https://lf-scm-cn.feishucdn.com/lark/op/h5-js-sdk-1.5.44.js';
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
    showError('SDK加载失败，请刷新重试');
  });

  function doAuth() {
    if (!window.tt || !window.tt.requestAuthCode) {
      showError('当前环境不支持飞书授权');
      return;
    }
    window.tt.requestAuthCode({
      appId: FeishuAuthHelper.APP_ID,
      success: function(res) {
        if (!res.code) {
          showError('未获取到授权码');
          return;
        }
        fetch(FeishuAuthHelper.AIPA_LOGIN, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: res.code })
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
              showContent();
            } else {
              showError('未获取到用户信息');
            }
          } else {
            showError(data.message || '验证失败');
          }
        }).catch(function(e) {
          showError('服务器验证失败：' + e.message);
        });
      },
      fail: function(err) {
        showError('授权失败，请刷新重试');
      }
    });
  }
});
