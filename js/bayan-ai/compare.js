// ============================================================
//  bayan-ai/compare.js - Period & Data Comparisons
// ============================================================

window.BayanAICompare = {
    async compareTodayWithYesterday() {
        const todayStr = window.BayanAIUtils.getFormattedDate(0);
        const yesterdayStr = window.BayanAIUtils.getFormattedDate(1);

        const todayRecs = await window.BayanAIDatabase.getTransactionsByDate(todayStr);
        const yestRecs = await window.BayanAIDatabase.getTransactionsByDate(yesterdayStr);

        let todayTop = 0, todayBottom = 0, yestTop = 0, yestBottom = 0;
        todayRecs.forEach(r => {
            todayTop += (parseFloat(r.top) || 0);
            todayBottom += (parseFloat(r.bottom) || 0);
        });
        yestRecs.forEach(r => {
            yestTop += (parseFloat(r.top) || 0);
            yestBottom += (parseFloat(r.bottom) || 0);
        });

        const todayNet = todayTop - todayBottom;
        const yestNet = yestTop - yestBottom;

        const salesDiff = todayTop - yestTop;
        const netDiff = todayNet - yestNet;
        const salesPercent = yestTop > 0 ? ((salesDiff / yestTop) * 100).toFixed(1) : 0;
        const fm = window.BayanAIUtils.formatMoney;

        return `⚖️ **مقارنة الأداء الشاملة (اليوم 🆚 الأمس):**\n\n` +
               `💰 **المبيعات (فوق):**\n` +
               `• اليوم: **${fm(todayTop)}** | الأمس: **${fm(yestTop)}**\n` +
               `• التغير: **${fm(salesDiff)}** (${salesDiff >= 0 ? '⬆️ ارتفاع بنسبة' : '⬇️ انخفاض بنسبة'} ${Math.abs(salesPercent)}%)\n\n` +
               `🔻 **المصروفات (تحت):**\n` +
               `• اليوم: **${fm(todayBottom)}** | الأمس: **${fm(yestBottom)}**\n\n` +
               `✨ **صافي الربح الفعلي:**\n` +
               `• اليوم: **${fm(todayNet)}** | الأمس: **${fm(yestNet)}**\n` +
               `• الفرق الفعلي: **${fm(netDiff)}** ${netDiff >= 0 ? '📈 (أداء أفضل)' : '📉 (انخفاض)'}\n\n` +
               `📝 **عدد العمليات:** اليوم (**${todayRecs.length}**) مقابل الأمس (**${yestRecs.length}**)`;
    },

    async compareThisWeekWithLastWeek() {
        const realTodayDate = new Date();
        const thisWeekDates = Array.from({length: 7}, (_, i) => {
            const d = new Date(realTodayDate);
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().slice(0, 10);
        });
        const lastWeekDates = Array.from({length: 7}, (_, i) => {
            const d = new Date(realTodayDate);
            d.setDate(d.getDate() - 7 - (6 - i));
            return d.toISOString().slice(0, 10);
        });

        const thisWeekRecs = await window.BayanAIDatabase.getTransactionsByDateRange(thisWeekDates[0], thisWeekDates[thisWeekDates.length - 1]);
        const lastWeekRecs = await window.BayanAIDatabase.getTransactionsByDateRange(lastWeekDates[0], lastWeekDates[lastWeekDates.length - 1]);

        let twTop = 0, twBottom = 0, lwTop = 0, lwBottom = 0;
        thisWeekRecs.forEach(r => { twTop += (parseFloat(r.top) || 0); twBottom += (parseFloat(r.bottom) || 0); });
        lastWeekRecs.forEach(r => { lwTop += (parseFloat(r.top) || 0); lwBottom += (parseFloat(r.bottom) || 0); });

        const twNet = twTop - twBottom;
        const lwNet = lwTop - lwBottom;
        const salesDiff = twTop - lwTop;
        const netDiff = twNet - lwNet;
        const salesPercent = lwTop > 0 ? ((salesDiff / lwTop) * 100).toFixed(1) : 0;
        const fm = window.BayanAIUtils.formatMoney;

        return `⚖️ **مقارنة الأداء الأسبوعية (هذا الأسبوع 🆚 الأسبوع الماضي):**\n\n` +
               `💰 **إجمالي المبيعات (فوق):**\n` +
               `• هذا الأسبوع: **${fm(twTop)}** | الأسبوع الماضي: **${fm(lwTop)}**\n` +
               `• فارق المبيعات: **${fm(salesDiff)}** (${salesDiff >= 0 ? '⬆️ زيادة بنسبة' : '⬇️ انخفاض بنسبة'} ${Math.abs(salesPercent)}%)\n\n` +
               `🔻 **إجمالي المصروفات (تحت):**\n` +
               `• هذا الأسبوع: **${fm(twBottom)}** | الأسبوع الماضي: **${fm(lwBottom)}**\n\n` +
               `✨ **صافي الأرباح:**\n` +
               `• هذا الأسبوع: **${fm(twNet)}** | الأسبوع الماضي: **${fm(lwNet)}**\n` +
               `• الفارق المالي: **${fm(netDiff)}** ${netDiff >= 0 ? '📈 (نمو إيجابي)' : '📉 (انخفاض)'}\n\n` +
               `📝 **إجمالي العمليات:** هذا الأسبوع (**${thisWeekRecs.length}**) مقابل (**${lastWeekRecs.length}**) حركة بالأسبوع الماضي.`;
    },

    async compareThisMonthWithLastMonth() {
        const realTodayDate = new Date();
        const startOfMonth = new Date(realTodayDate.getFullYear(), realTodayDate.getMonth(), 1).toISOString().slice(0, 10);
        const todayStr = window.BayanAIUtils.getFormattedDate(0);

        const startOfPrevMonth = new Date(realTodayDate.getFullYear(), realTodayDate.getMonth() - 1, 1).toISOString().slice(0, 10);
        const endOfPrevMonth = new Date(realTodayDate.getFullYear(), realTodayDate.getMonth(), 0).toISOString().slice(0, 10);

        const thisMonthRecs = await window.BayanAIDatabase.getTransactionsByDateRange(startOfMonth, todayStr);
        const lastMonthRecs = await window.BayanAIDatabase.getTransactionsByDateRange(startOfPrevMonth, endOfPrevMonth);

        let tmTop = 0, tmBottom = 0, lmTop = 0, lmBottom = 0;
        thisMonthRecs.forEach(r => { tmTop += (parseFloat(r.top) || 0); tmBottom += (parseFloat(r.bottom) || 0); });
        lastMonthRecs.forEach(r => { lmTop += (parseFloat(r.top) || 0); lmBottom += (parseFloat(r.bottom) || 0); });

        const tmNet = tmTop - tmBottom;
        const lmNet = lmTop - lmBottom;
        const salesDiff = tmTop - lmTop;
        const netDiff = tmNet - lmNet;
        const salesPercent = lmTop > 0 ? ((salesDiff / lmTop) * 100).toFixed(1) : 0;
        const fm = window.BayanAIUtils.formatMoney;

        return `⚖️ **مقارنة الأداء الشهرية (الشهر الحالي 🆚 الشهر السابق):**\n\n` +
               `💰 **إجمالي المبيعات (فوق):**\n` +
               `• الشهر الحالي: **${fm(tmTop)}** | الشهر السابق: **${fm(lmTop)}**\n` +
               `• التغير: **${fm(salesDiff)}** (${salesDiff >= 0 ? '⬆️ ارتفاع بنسبة' : '⬇️ انخفاض بنسبة'} ${Math.abs(salesPercent)}%)\n\n` +
               `🔻 **إجمالي المصروفات (تحت):**\n` +
               `• الشهر الحالي: **${fm(tmBottom)}** | الشهر السابق: **${fm(lmBottom)}**\n\n` +
               `✨ **صافي الأرباح المحققة:**\n` +
               `• الشهر الحالي: **${fm(tmNet)}** | الشهر السابق: **${fm(lmNet)}**\n` +
               `• الفارق المالي: **${fm(netDiff)}** ${netDiff >= 0 ? '📈 (أداء أقوى)' : '📉 (انخفاض)'}\n\n` +
               `📝 **عدد العمليات:** الشهر الحالي (**${thisMonthRecs.length}**) مقابل (**${lastMonthRecs.length}**) عملية في الشهر السابق.`;
    },

    async compare(query) {
        const q = (query || '').toLowerCase();
        if (q.includes('اسبوع') || q.includes('الأسبوع') || q.includes('الاسبوع')) {
            return await this.compareThisWeekWithLastWeek();
        }
        if (q.includes('شهر') || q.includes('الشهر')) {
            return await this.compareThisMonthWithLastMonth();
        }
        return await this.compareTodayWithYesterday();
    }
};
