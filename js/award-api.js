// AWARD-API.JS VERSION: 20250520a
// TikTok Shop Stars Awards - AIPA Backend API Module
// Replaces localStorage for likes and comments with backend API

const AwardAPI = {
  // AIPA backend base URL
  BASE_URL: 'https://da1e5fb0.aipa.bytedance.net',

  // Flag to track if API is available; if false, fallback to localStorage
  _apiAvailable: null,

  // Cache for award data to reduce repeated API calls
  _cache: {},

  // Cache TTL in ms (30 seconds)
  _cacheTTL: 30000,

  /**
   * Check if the AIPA API is reachable
   */
  async checkAvailability() {
    if (this._apiAvailable !== null) return this._apiAvailable;
    try {
      const res = await fetch(`${this.BASE_URL}/api/health`, { signal: AbortSignal.timeout(8000) });
      this._apiAvailable = res.ok;
    } catch (e) {
      this._apiAvailable = false;
    }
    return this._apiAvailable;
  },

  /**
   * Toggle like for an award
   * @returns {Promise<{liked: boolean, like_count: number}>}
   */
  async toggleLike(awardId, userId) {
    try {
      const res = await fetch(`${this.BASE_URL}/api/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ award_id: awardId, user_id: userId })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const resp = await res.json();
      // Invalidate cache for this award
      delete this._cache[awardId];
      // Backend returns: {success, action: "like"/"unlike", message}
      // action="like" means liked, action="unlike" means unliked
      const isLiked = resp.action === 'like';
      // Fetch fresh count from backend
      const freshData = await this.getAwardData(awardId, userId);
      const likeCount = freshData ? freshData.like_count : (isLiked ? 1 : 0);
      return { liked: isLiked, like_count: likeCount };
    } catch (e) {
      console.error('[AwardAPI] toggleLike failed:', e.message);
      return null;
    }
  },

  /**
   * Add a comment to an award
   * @returns {Promise<object>} The created comment object
   */
  async addComment(awardId, userId, username, content) {
    try {
      const displayName = username || ('User ' + userId.substring(userId.length - 4));
      const res = await fetch(`${this.BASE_URL}/api/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          award_id: awardId,
          user_id: userId,
          username: displayName,
          content: content
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const resp = await res.json();
      // Invalidate cache for this award
      delete this._cache[awardId];
      // Backend returns: {success, message, data: {id, award_id, user_id, username, content, createdAt}}
      return resp.data || resp;
    } catch (e) {
      console.error('[AwardAPI] addComment failed:', e.message);
      return null;
    }
  },

  /**
   * Get award data (like count, isLiked, comments)
   * @returns {Promise<{like_count: number, liked: boolean, comments: Array}>}
   */
  async getAwardData(awardId, userId) {
    // Check cache first
    const cacheKey = awardId;
    const cached = this._cache[cacheKey];
    if (cached && (Date.now() - cached._timestamp < this._cacheTTL)) {
      return cached;
    }

    const emptyData = { liked: false, like_count: 0, comments: [] };

    // Primary: GET /api/awards/:award_id?user_id=xxx
    try {
      const res = await fetch(`${this.BASE_URL}/api/awards/${encodeURIComponent(awardId)}?user_id=${encodeURIComponent(userId)}`, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const resp = await res.json();
        const raw = resp.data || resp;
        const data = {
          liked: raw.has_liked !== undefined ? raw.has_liked : !!raw.liked,
          like_count: raw.like_count || 0,
          comments: raw.comments || []
        };
        data._timestamp = Date.now();
        this._cache[cacheKey] = data;
        return data;
      }
      // 404 means no data yet for this award — return empty defaults
      if (res.status === 404) {
        emptyData._timestamp = Date.now();
        this._cache[cacheKey] = emptyData;
        return emptyData;
      }
    } catch (e) {
      // Network error — try fallback
    }

    // Fallback: GET /api/comment/:award_id (comments only, no like data)
    try {
      const res2 = await fetch(`${this.BASE_URL}/api/comments/${encodeURIComponent(awardId)}`, { signal: AbortSignal.timeout(8000) });
      if (res2.ok) {
        const resp2 = await res2.json();
        const raw2 = resp2.data || resp2;
        const comments = Array.isArray(raw2) ? raw2 : (raw2.comments || []);
        const data = { liked: false, like_count: 0, comments };
        data._timestamp = Date.now();
        this._cache[cacheKey] = data;
        return data;
      }
    } catch (e) {
      // Both endpoints failed
    }

    // Return empty defaults instead of null so UI shows zeros
    emptyData._timestamp = Date.now();
    this._cache[cacheKey] = emptyData;
    return emptyData;
  },

  /**
   * Batch load award data for multiple cards
   * @param {string[]} awardIds
   * @param {string} userId
   * @returns {Promise<Object>} Map of awardId -> awardData
   */
  async batchGetAwardData(awardIds, userId) {
    const results = {};
    // Filter out cached items
    const uncached = [];
    for (const id of awardIds) {
      const cached = this._cache[id];
      if (cached && (Date.now() - cached._timestamp < this._cacheTTL)) {
        results[id] = cached;
      } else {
        uncached.push(id);
      }
    }

    // Fetch uncached items (parallel with concurrency limit)
    const CONCURRENCY = 5;
    for (let i = 0; i < uncached.length; i += CONCURRENCY) {
      const batch = uncached.slice(i, i + CONCURRENCY);
      const promises = batch.map(async (id) => {
        const data = await this.getAwardData(id, userId);
        if (data) {
          results[id] = data;
        }
      });
      await Promise.all(promises);
    }

    return results;
  },

  /**
   * Invalidate all cached data
   */
  invalidateCache() {
    this._cache = {};
  },

  /**
   * Reset availability check (e.g., after network change)
   */
  resetAvailabilityCheck() {
    this._apiAvailable = null;
  }
};

// ==================== User Identity ====================

/**
 * Get current user info for API calls
 * - In Feishu: use h5sdk/tt to get open_id and name
 * - In external browser: use dev fallback
 * - Also check FeishuAuth.userInfo if available
 */
const AwardUser = {
  _cachedUser: null,

  async getCurrentUser() {
    if (this._cachedUser) return this._cachedUser;

    // Use FeishuAuthHelper if available, otherwise fallback
    if (typeof FeishuAuthHelper !== 'undefined') {
      this._cachedUser = await FeishuAuthHelper.getUser();
    } else {
      var uid = localStorage.getItem('award_uid');
      if (!uid) {
        uid = 'u_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        localStorage.setItem('award_uid', uid);
      }
      this._cachedUser = { userId: uid, username: '' };
    }
    return this._cachedUser;
  },

  /**
   * Reset cached user (e.g., after login state change)
   */
  resetUser() {
    this._cachedUser = null;
  }
};

// Convenience function
async function getCurrentUser() {
  return AwardUser.getCurrentUser();
}