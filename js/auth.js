/**
 * Feishu Auth v3 - Gate: must open in Feishu
 * Redirects external browsers to Feishu app
 */
const FeishuAuth = {
  APP_ID: 'cli_a968a864a0f89bdd',

  async init() {
    var ua = navigator.userAgent;
    var isInFeishu = /Lark|Feishu/i.test(ua);

    if (!isInFeishu) {
      // External browser → redirect to open in Feishu app
      var applink = 'https://applink.feishu.cn/client/web_app/open?appId=' + this.APP_ID;
      console.log('[FeishuAuth] External browser, redirecting to Feishu app');
      
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

    // In Feishu - show content
    console.log('[FeishuAuth] In Feishu, showing content');
    var overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.style.display = 'none';
    var content = document.getElementById('main-content');
    if (content) content.style.display = 'block';
  },

  isInFeishu() {
    return /Lark|Feishu/i.test(navigator.userAgent);
  }
};

document.addEventListener('DOMContentLoaded', function() {
  FeishuAuth.init();
});
