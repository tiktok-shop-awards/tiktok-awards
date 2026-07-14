/**
 * Feishu Auth v4 - No gate, always show content
 * Deep links work in any browser (system browser or Feishu built-in)
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('[FeishuAuth] Loading content');
  var overlay = document.getElementById('auth-overlay');
  if (overlay) overlay.style.display = 'none';
  var content = document.getElementById('main-content');
  if (content) content.style.display = 'block';
});
