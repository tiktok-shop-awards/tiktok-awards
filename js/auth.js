/**
 * Feishu Auth v5 - Gate with lk_target_url deep link
 * 1. External browser: gate + redirect to Feishu app with lk_target_url
 * 2. In Feishu: show content (Feishu opens the exact target URL directly)
 */
document.addEventListener('DOMContentLoaded', function() {
  var ua = navigator.userAgent;
  var isInFeishu = /Lark|Feishu/i.test(ua);

  if (!isInFeishu) {
    // External browser → gate
    var APP_ID = 'cli_a968a864a0f89bdd';
    var currentUrl = window.location.href;
    var applink = 'https://applink.feishu.cn/client/web_app/open?appId=' + APP_ID + '&lk_target_url=' + encodeURIComponent(currentUrl);

    var overlay = document.getElementById('auth-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'auth-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:#0a0a0a;display:flex;align-items:center;justify-content:center;z-index:99999';
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = '<div style="text-align:center;color:#fff;font-family:sans-serif"><div style="font-size:48px;margin-bottom:20px">🔐</div><h2 style="color:#F6214A">请在飞书中打开</h2><p style="color:#999;margin:16px 0">Please open in Feishu</p><a href="' + applink + '" style="display:inline-block;padding:12px 32px;background:#F6214A;color:#fff;border-radius:8px;text-decoration:none;font-size:16px">在飞书中打开</a><p style="color:#666;margin-top:16px;font-size:12px">如果未自动跳转，请点击上方按钮</p></div>';

    setTimeout(function() { window.location.href = applink; }, 1500);
    return;
  }

  // In Feishu → show content
  console.log('[FeishuAuth] In Feishu, showing content');
  var overlay = document.getElementById('auth-overlay');
  if (overlay) overlay.style.display = 'none';
  var content = document.getElementById('main-content');
  if (content) content.style.display = 'block';
});
