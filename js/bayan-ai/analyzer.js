// ============================================================
//  bayan-ai/analyzer.js - Item Search & Custom Period Analyzer
// ============================================================

window.BayanAIAnalyzer = {
    async analyze(parsedIntent) {
        const { category, dateFilter, rawQuery } = parsedIntent;
        const cacheKey = `metrics_${category}_${JSON.stringify(dateFilter)}_${rawQuery}`;
        
        const cached = window.BayanAICache.get(cacheKey);
        if (cached) return cached;

        let activeSelectedDate = window.BayanAIUtils.getFormattedDate(0);
        const dateInputEl = document.getElementById('dateInput');
        if (dateInputEl && dateInputEl.value) {
            activeSelectedDate = dateInputEl.value;
        }

        let targetDates = [activeSelectedDate];
        let isCustomRange = false;

        // 1. تحديد نطاق التواريخ والسنوات بدقة تقويمية واقعية
        const realTodayStr = window.BayanAIUtils.getFormattedDate(0);
        const realTodayDate = new Date();

        if (dateFilter && dateFilter.type === 'explicit') {
            activeSelectedDate = dateFilter.dateStr;
            targetDates = [dateFilter.dateStr];
        } else if (dateFilter && dateFilter.type === 'custom_range') {
            targetDates = dateFilter.dates;
            isCustomRange = true;
        } else if (dateFilter === 'before_yesterday' || (dateFilter && dateFilter.type === 'before_yesterday')) {
            targetDates = [window.BayanAIUtils.getFormattedDate(2)];
        } else if (dateFilter === 'yesterday' || (dateFilter && dateFilter.type === 'yesterday')) {
            targetDates = [window.BayanAIUtils.getFormattedDate(1)];
        } else if (dateFilter === 'week' || (dateFilter && dateFilter.type === 'week')) {
            targetDates = Array.from({length: 7}, (_, i) => {
                const d = new Date(realTodayDate);
                d.setDate(d.getDate() - (6 - i));
                return d.toISOString().slice(0, 10);
            });
        } else if (dateFilter === 'last_week' || (dateFilter && dateFilter.type === 'last_week')) {
            targetDates = Array.from({length: 7}, (_, i) => {
                const d = new Date(realTodayDate);
                d.setDate(d.getDate() - 7 - (6 - i));
                return d.toISOString().slice(0, 10);
            });
        } else if (dateFilter === 'month' || (dateFilter && dateFilter.type === 'month')) {
            const startOfMonth = new Date(realTodayDate.getFullYear(), realTodayDate.getMonth(), 1);
            targetDates = [];
            for (let d = new Date(startOfMonth); d <= realTodayDate; d.setDate(d.getDate() + 1)) {
                targetDates.push(d.toISOString().slice(0, 10));
            }
        } else if (dateFilter === 'last_month' || (dateFilter && dateFilter.type === 'last_month')) {
            const startOfPrevMonth = new Date(realTodayDate.getFullYear(), realTodayDate.getMonth() - 1, 1);
            const endOfPrevMonth = new Date(realTodayDate.getFullYear(), realTodayDate.getMonth(), 0);
            targetDates = [];
            for (let d = new Date(startOfPrevMonth); d <= endOfPrevMonth; d.setDate(d.getDate() + 1)) {
                targetDates.push(d.toISOString().slice(0, 10));
            }
        } else if (dateFilter === 'all_time' || (dateFilter && dateFilter.type === 'all_time')) {
            const allTxs = await window.BayanAIDatabase.getAllTransactions();
            const uniqueDates = [...new Set(allTxs.map(t => t.date))].filter(Boolean);
            if (uniqueDates.length > 0) targetDates = uniqueDates;
        }

        // 2. تصفية الكلمات العامة والبحث الذكي الموحد
        let searchKeyword = '';
        const lowerQ = rawQuery.toLowerCase();
        
        if (category === 'search_filter') {
            const cleanQuery = lowerQ.replace(/(ابحث عن|ابحث|بحث عن|شوفلي|شوف|هاتلي|هات|استعلم عن|استعلم|طلعلي|كام حساب|تقرير)/gi, '').trim();
            searchKeyword = window.BayanAIUtils.cleanText(cleanQuery);
        }

        let totalTop = 0, totalBottom = 0, count = 0, cash = 0, insta = 0;
        let maxInvoice = 0, minInvoice = Infinity;
        let peakHour = 'غير محدد';
        const hourlyMap = {};
        const categoryBreakdown = {};
        const matchedItemRecords = [];

        let allRecordsToProcess = [];
        if (dateFilter === 'all_time' || (dateFilter && dateFilter.type === 'all_time')) {
            allRecordsToProcess = await window.BayanAIDatabase.getAllTransactions();
        } else if (targetDates.length > 1) {
            const sortedDates = [...targetDates].sort();
            allRecordsToProcess = await window.BayanAIDatabase.getTransactionsByDateRange(sortedDates[0], sortedDates[sortedDates.length - 1]);
        } else if (targetDates.length === 1) {
            allRecordsToProcess = await window.BayanAIDatabase.getTransactionsByDate(targetDates[0]);
        }

        allRecordsToProcess.forEach(r => {
            const date = r.date || activeSelectedDate;
                const cat = (r.category || 'عام').toLowerCase();
                const notes = (r.notes || '').toLowerCase();
                const topVal = (r.top || 0).toString();
                const bottomVal = (r.bottom || 0).toString();
                const fullSearchable = `${cat} ${notes} ${topVal} ${bottomVal}`;

                // البحث والاستعلام الذكي الموحد (بأي كلمة، بند، أو مبلغ)
                if (searchKeyword && !fullSearchable.includes(searchKeyword)) {
                    return;
                }

                count++;
                const top = parseFloat(r.top) || 0;
                const bottom = parseFloat(r.bottom) || 0;
                totalTop += top;
                totalBottom += bottom;

                if (top > maxInvoice) maxInvoice = top;
                if (top > 0 && top < minInvoice) minInvoice = top;

                matchedItemRecords.push({ ...r, date });

                if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { top: 0, bottom: 0, count: 0 };
                categoryBreakdown[cat].top += top;
                categoryBreakdown[cat].bottom += bottom;
                categoryBreakdown[cat].count++;

                if (r.timestamp) {
                    const hour = new Date(r.timestamp).getHours();
                    const hourLabel = `${hour}:00 - ${hour + 1}:00`;
                    hourlyMap[hourLabel] = (hourlyMap[hourLabel] || 0) + top;
                }

                if (notes.includes('انستا') || notes.includes('instapay')) insta += top;
                else cash += top;
            });

        if (minInvoice === Infinity) minInvoice = 0;

        let maxHourVal = 0;
        Object.keys(hourlyMap).forEach(h => {
            if (hourlyMap[h] > maxHourVal) {
                maxHourVal = hourlyMap[h];
                peakHour = h;
            }
        });

        const ext = await window.BayanAIDatabase.getExternalBalances();
        let owedToMe = 0, owedByMe = 0;
        let topDebtor = { name: 'لا يوجد', amount: 0 };
        let topCreditor = { name: 'لا يوجد', amount: 0 };

        ext.forEach(i => {
            const val = parseFloat(i.amount) || 0;
            if (i.type === 'to') {
                owedToMe += val;
                if (val > topDebtor.amount) topDebtor = { name: i.name || 'عميل', amount: val };
            } else if (i.type === 'from') {
                owedByMe += val;
                if (val > topCreditor.amount) topCreditor = { name: i.name || 'مورد', amount: val };
            }
        });

        const inventories = await window.BayanAIDatabase.getInventoriesConfig();
        const inventoryStock = [];
        for (const inv of inventories) {
            const stock = await window.BayanAIDatabase.getInventoryStock(inv.id, activeSelectedDate);
            inventoryStock.push({
                name: inv.name,
                icon: inv.icon || '📦',
                unit1Name: inv.unit1 || 'طبق',
                unit2Name: inv.unit2 || 'قطعة',
                unit1: stock.unit1 || stock.plates || 0,
                unit2: stock.unit2 || stock.pieces || 0
            });
        }

        let healthGrade = 'ممتاز 🟢';
        let healthTip = 'أداء مالي متوازن وممتاز جداً!';
        const margin = totalTop > 0 ? ((totalTop - totalBottom) / totalTop) * 100 : 0;

        if (totalTop === 0 && totalBottom > 0) {
            healthGrade = 'تنبيه 🔴';
            healthTip = 'يوجد مصاريف بدون تسجيل مبيعات حتى الآن.';
        } else if (margin < 15) {
            healthGrade = 'مقبول 🟡';
            healthTip = 'هامش الربح منخفض نسبياً، حاول تقليل المصروفات.';
        }

        const result = {
            category,
            dateFilter,
            searchKeyword,
            activeSelectedDate,
            totalTop,
            totalBottom,
            netProfit: totalTop - totalBottom,
            count,
            cash,
            insta,
            maxInvoice,
            minInvoice,
            avgInvoice: count > 0 ? (totalTop / count) : 0,
            peakHour,
            categoryBreakdown,
            matchedItemRecords,
            owedToMe,
            owedByMe,
            topDebtor,
            topCreditor,
            inventoryStock,
            margin: margin.toFixed(1),
            healthGrade,
            healthTip
        };

        window.BayanAICache.set(cacheKey, result, 30000);
        return result;
    }
};
