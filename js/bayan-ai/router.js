// ============================================================
//  bayan-ai/router.js - Question & Command Router
// ============================================================

window.BayanAIRouter = {
    route(query) {
        if (!query || typeof query !== 'string') return { type: 'unknown' };
        const q = query.trim().toLowerCase();

        // 1. فحص الأوامر المباشرة والتنفيذية (فتح صفحات، طباعة، تصدير، تسجيل سريع)
        if (q.startsWith('افتح') || q.startsWith('افتحلي') || q.startsWith('اطبع') || q.startsWith('صدر') || q.startsWith('نسخة') || q.startsWith('سجل') || q.startsWith('اضف') || q.startsWith('أضف') || q.startsWith('ضف') || q.startsWith('نزل') || q.startsWith('نزّل') || q.startsWith('حط') || q.startsWith('اكتب')) {
            return { type: 'command', query: q };
        }

        // 2. فحص المقارنات (أيام، أسابيع، شهور)
        if (q.includes('مقارنة') || q.includes('مقارنه') || q.includes('اقارن') || q.includes('قارن') || q.includes('بأمس') || q.includes('بامس') || q.includes('بالأمس') || q.includes('بالاسبوع') || q.includes('بالأسبوع') || q.includes('بالشهر') || q.includes('باللي فات')) {
            return { type: 'compare', query: q };
        }

        // 3. فحص الاستعلامات المحاسبية الإحصائية
        return { type: 'intent', query: q };
    }
};
