/**
 * Feishu Auth v2 - No gate, just show content
 * Auth identity is handled by auth-helper.js
 * This file only ensures auth-overlay is hidden on load
 */
const FeishuAuth = {
  APP_ID: 'cli_a968a864a0f89bdd',

  async init() {
    // Always show content - auth-helper handles identity
    var overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.style.display = 'none';
    var content = document.getElementById('main-content');
    if (content) content.style.display = 'block';
  },

  isInFeishu() {
    return /Lark|Feishu/i.test(navigator.userAgent) || !!window.h5sdk || !!window.tt;
  }
};

document.addEventListener('DOMContentLoaded', function() {
  FeishuAuth.init();
});
