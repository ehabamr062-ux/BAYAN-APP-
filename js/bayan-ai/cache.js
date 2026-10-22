// ============================================================
//  bayan-ai/cache.js - Memory Caching for Instant Local Queries
// ============================================================

window.BayanAICache = {
    cacheStore: new Map(),

    set(key, value, ttlMs = 300000) { // 5 دقائق كاش تلقائي
        const expireTime = Date.now() + ttlMs;
        this.cacheStore.set(key, { value, expireTime });
    },

    get(key) {
        if (!this.cacheStore.has(key)) return null;
        const item = this.cacheStore.get(key);
        if (Date.now() > item.expireTime) {
            this.cacheStore.delete(key);
            return null;
        }
        return item.value;
    },

    clear() {
        this.cacheStore.clear();
    }
};
