// ============================================================
//  bayan-ai/favorites.js & history.js - Persistent Storage
// ============================================================

window.BayanAIFavorites = {
    async getFavorites() {
        return (await window.BayanDB.getSetting('bayan_ai_favorites')) || [
            '⭐ كم مبيعات اليوم؟',
            '⭐ ما هي الأرباح والصافي؟',
            '⭐ كم الديون الخارجية؟'
        ];
    },

    async toggleFavorite(query) {
        let favs = await this.getFavorites();
        if (favs.includes(query)) favs = favs.filter(f => f !== query);
        else favs.push(query);
        await window.BayanDB.setSetting('bayan_ai_favorites', favs);
        return favs;
    }
};

window.BayanAIHistory = {
    async getHistory() {
        return await window.BayanDB.getAiChatHistory(100);
    },

    async saveMessage(text, sender) {
        await window.BayanDB.saveAiMessage(text, sender);
    },

    async clear() {
        await window.BayanDB.clearAiChatHistory();
    }
};
