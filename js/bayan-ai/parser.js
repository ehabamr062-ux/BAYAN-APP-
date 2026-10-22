// ============================================================
//  bayan-ai/parser.js - Range Dates & Item Query Parser Pro
// ============================================================

window.BayanAIParser = {
    extractExplicitDate(text) {
        if (!text) return null;
        
        const matchIso = text.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
        if (matchIso) {
            return `${matchIso[1]}-${String(matchIso[2]).padStart(2, '0')}-${String(matchIso[3]).padStart(2, '0')}`;
        }

        const matchLocal = text.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
        if (matchLocal) {
            return `${matchLocal[3]}-${String(matchLocal[2]).padStart(2, '0')}-${String(matchLocal[1]).padStart(2, '0')}`;
        }

        return null;
    },

    // استخراج فترة مخصصة من تاريخ إلى تاريخ
    parseDateRange(text) {
        const t = text.toLowerCase();
        
        // 1. استخراج جميع التواريخ المكتوبة بالأرقام
        const datesFound = [];
        const isoMatches = text.matchAll(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/g);
        for (const m of isoMatches) {
            datesFound.push(`${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`);
        }

        if (datesFound.length >= 2) {
            const startDate = datesFound[0];
            const endDate = datesFound[1];
            const datesList = [];
            let curr = new Date(startDate);
            const end = new Date(endDate);

            while (curr <= end) {
                datesList.push(curr.toISOString().slice(0, 10));
                curr.setDate(curr.getDate() + 1);
            }
            return { type: 'custom_range', dates: datesList, startDate, endDate };
        } else if (datesFound.length === 1) {
            return { type: 'explicit', dateStr: datesFound[0] };
        }

        // 2. الفترات الزمنية الشائعة والتلقائية
        if (t.includes('الكل') || t.includes('كل الايام') || t.includes('كل الفترات') || t.includes('من الأول') || t.includes('من الاول') || t.includes('كل السجلات')) return { type: 'all_time' };
        if (t.includes('اول امبارح') || t.includes('أول أمس') || t.includes('قبل امس')) return { type: 'before_yesterday' };
        if (t.includes('امبارح') || t.includes('أمس') || t.includes('البارحة')) return { type: 'yesterday' };
        if (t.includes('هذا الاسبوع') || t.includes('الاسبوع ده') || t.includes('هذا الأسبوع') || t.includes('اسبوع') || t.includes('الأسبوع')) return { type: 'week' };
        if (t.includes('الاسبوع اللي فات') || t.includes('الأسبوع الماضي') || t.includes('الاسبوع السابق')) return { type: 'last_week' };
        if (t.includes('الشهر ده') || t.includes('هذا الشهر') || t.includes('الشهر الحالي') || t.includes('الشهر') || t.includes('شهر')) return { type: 'month' };
        if (t.includes('الشهر اللي فات') || t.includes('الشهر الماضي') || t.includes('الشهر السابق')) return { type: 'last_month' };
        if (t.includes('السنة') || t.includes('سنة') || t.includes('العام')) return { type: 'year' };
        
        return { type: 'today' };
    },

    extractSearchTerms(text) {
        return text.replace(/(كم|إجمالي|اجمالي|اخبرني|عن|مبيعات|أرباح|ارباح|مصاريف|ديون|المخزون|اليوم|أمس|امبارح|سجل|طلعلي|هات)/gi, '').trim();
    }
};
