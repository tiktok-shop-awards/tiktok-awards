/**
 * Feishu Auth v8 - No gate, direct access
 * Removed applink redirect to preserve URL parameters in system browser
 * Feishu doc links → system browser → URL params preserved → content displayed
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('[FeishuAuth] Direct access, showing content');
  var overlay = document.getElementById('auth-overlay');
  if (overlay) overlay.style.display = 'none';
  var content = document.getElementById('main-content');
  if (content) content.style.display = 'block';
});
