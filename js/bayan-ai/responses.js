// ============================================================
//  bayan-ai/responses.js - Advanced Pro Arabic Response Generator
// ============================================================

window.BayanAIResponses = {
    getOutOfScopeResponse() {
        return "🔒 أنا مساعد بيان الذكي المحاسبي 🤖.\nيمكنني مساعدتك في استخراج المبيعات، الأرباح، المصاريف، الديون، وأرصدة المخزون.";
    },

    format(metrics) {
        const {
            category, dateFilter, searchKeyword, activeSelectedDate, totalTop, totalBottom, netProfit,
            count, cash, insta, maxInvoice, minInvoice, avgInvoice, peakHour,
            categoryBreakdown, matchedItemRecords, owedToMe, owedByMe, topDebtor, topCreditor,
            inventoryStock, margin, healthGrade, healthTip
        } = metrics;
        
        const fm = window.BayanAIUtils.formatMoney;

        let dateLabel = `تاريخ: ${activeSelectedDate}`;
        if (dateFilter && dateFilter.type === 'custom_range') {
            dateLabel = `الفترة من ${dateFilter.startDate} إلى ${dateFilter.endDate}`;
        } else if (dateFilter && dateFilter.type === 'all_time') {
            dateLabel = `كافة الفترات والتاريخ كاملاً`;
        } else if (dateFilter === 'yesterday') dateLabel = `قبل تاريخ: ${activeSelectedDate}`;
        else if (dateFilter === 'week') dateLabel = `الأسبوع المنتهي في: ${activeSelectedDate}`;
        else if (dateFilter === 'month') dateLabel = `الشهر المنتهي في: ${activeSelectedDate}`;

        // إذا كان المستخدم يستعلم عن صنف أو اسم محدد (مثل: بيبسي، بيض، زيت، إلخ)
        if (searchKeyword && searchKeyword.trim()) {
            if (!matchedItemRecords || matchedItemRecords.length === 0) {
                return `🔍 **تقرير البحث عن الصنف ("${searchKeyword}") - (${dateLabel}):**\n\n` +
                       `⚠️ لم يتم العثور على أي عمليات مسجلة باسم أو ملاحظات تحتوي على **"${searchKeyword}"** في هذه الفترة.`;
            }

            let itemReport = `🔍 **تقرير جميع عمليات ("${searchKeyword}") - (${dateLabel}):**\n\n` +
                             `📝 إجمالي عدد العمليات: **${count} عملية**\n` +
                             `💰 إجمالي قيمة المبيعات/الوارد (فوق): **${fm(totalTop)}**\n` +
                             `🔻 إجمالي قيمة المصروفات/الصادر (تحت): **${fm(totalBottom)}**\n` +
                             `-----------------------------------\n` +
                             `📋 **سجل العمليات المسجلة بالتفصيل:**\n`;

            matchedItemRecords.slice(0, 15).forEach((rec, idx) => {
                const typeText = (rec.category === 'مبيعات' || rec.category === 'كاش' || (parseFloat(rec.top) > 0)) ? 'وارد/مبيعات' : 'مصروفات/صادر';
                const val = parseFloat(rec.top) || parseFloat(rec.bottom) || 0;
                itemReport += `${idx + 1}. [${rec.date}] ${typeText} | البند: **${rec.category || 'عام'}** | القيمة: **${fm(val)}** | ${rec.notes ? '(' + rec.notes + ')' : ''}\n`;
            });

            if (matchedItemRecords.length > 15) {
                itemReport += `\n*... ويوجد ${matchedItemRecords.length - 15} عملية أخرى مسجلة.*`;
            }

            return itemReport;
        }

        switch (category) {
            case 'low_stock':
                if (!inventoryStock || inventoryStock.length === 0) return `🚨 **تنبيه النواقص:** جميع المنتجات والمخزون في مستوى ممتاز!`;
                let lowItems = inventoryStock.filter(i => (i.unit1 <= 5 || i.unit2 <= 10));
                if (lowItems.length === 0) {
                    return `🚨 **تقرير فحص النواقص والمخزون:**\n\n` +
                           `✅ لا يوجد أي نقص! جميع أرصدة المخزون متوفرة بكميات ممتازة فوق الحد الأدنى.`;
                }
                let lowReport = `⚠️ **تنبيه بالنواقص والأصناف القريبة من النفاد:**\n\n`;
                lowItems.forEach(i => {
                    lowReport += `${i.icon} **${i.name}:** تبقى **${i.unit1}** ${i.unit1Name || 'طبق'} و **${i.unit2}** ${i.unit2Name || 'قطعة'} فقط! (يرجى إعادة الشراء 🛒)\n`;
                });
                return lowReport;

            case 'peak_hour':
                return `⏰ **تقرير أوقات وساعات الذروة (${dateLabel}):**\n\n` +
                       `🔥 ساعة الذروة والأكثر نشاطاً: **${peakHour}**\n` +
                       `💰 إجمالي مبيعات اليوم: **${fm(totalTop)}**\n` +
                       `📝 عدد العمليات المنفذة: **${count} عملية**\n` +
                       `💡 **توصية ذكية:** يُفضل تكثيف تواجد الكاشير والاستعداد للبضائع في نطاق (${peakHour}).`;

            case 'stats_extremes':
                return `📊 **إحصائيات الفواتير والعمليات (${dateLabel}):**\n\n` +
                       `🔝 أعلى وأكبر فاتورة بيع: **${fm(maxInvoice)}**\n` +
                       `🔻 أقل فاتورة مسجلة: **${fm(minInvoice)}**\n` +
                       `📈 متوسط قيمة الفاتورة: **${fm(avgInvoice)}**\n` +
                       `🔢 إجمالي عدد الفواتير: **${count} فاتورة**`;

            case 'sales':
                let catDetails = '';
                if (categoryBreakdown && Object.keys(categoryBreakdown).length > 0) {
                    catDetails = '\n\n📂 **تفاصيل البنود والجهات الأكثر مبيعاً:**\n';
                    const sortedCats = Object.keys(categoryBreakdown).sort((a, b) => categoryBreakdown[b].top - categoryBreakdown[a].top);
                    sortedCats.forEach(c => {
                        const perc = totalTop > 0 ? ((categoryBreakdown[c].top / totalTop) * 100).toFixed(1) : 0;
                        catDetails += `• **${c}**: ${fm(categoryBreakdown[c].top)} (${perc}%) — [${categoryBreakdown[c].count} حركة]\n`;
                    });
                }
                return `📊 **التقرير الشامل للمبيعات والإيرادات (${dateLabel}):**\n\n` +
                       `💰 **إجمالي المبيعات (فوق):** **${fm(totalTop)}**\n` +
                       `💵 النقدي (كاش): **${fm(cash)}**\n` +
                       `🟣 تحويلات انستا باي: **${fm(insta)}**\n` +
                       `📝 عدد الفواتير والعمليات: **${count} فاتورة**\n` +
                       `📈 متوسط الفاتورة الواحدة: **${fm(avgInvoice)}**\n` +
                       `🔝 أعلى فاتورة: **${fm(maxInvoice)}** | 🔻 أقل فاتورة: **${fm(minInvoice)}**\n` +
                       `⏰ ساعة الذروة في المبيعات: **${peakHour}**` + catDetails;

            case 'profit':
                const isProfit = netProfit >= 0;
                return `${isProfit ? '🚀' : '⚠️'} **تحليل الأرباح والمؤشر المالي العام (${dateLabel}):**\n\n` +
                       `🟢 **الإيرادات والمبيعات (فوق):** **${fm(totalTop)}**\n` +
                       `🔴 **المصروفات والتكاليف (تحت):** **${fm(totalBottom)}**\n` +
                       `═══════════════════════════\n` +
                       `✨ **صافي الربح الفعلي:** **${fm(netProfit)}**\n` +
                       `📊 **هامش الربح التشغيلي:** **${margin}%**\n` +
                       `🏥 **تقييم الصحة المالية:** **${healthGrade}**\n` +
                       `💡 **نصيحة بيان المحاسبية:** ${healthTip}`;

            case 'expenses':
                let expCatDetails = '';
                if (categoryBreakdown && Object.keys(categoryBreakdown).length > 0) {
                    expCatDetails = '\n\n📋 **تفاصيل بنود المصروفات:**\n';
                    const sortedExpCats = Object.keys(categoryBreakdown).filter(c => categoryBreakdown[c].bottom > 0).sort((a, b) => categoryBreakdown[b].bottom - categoryBreakdown[a].bottom);
                    sortedExpCats.forEach(c => {
                        expCatDetails += `• **${c}**: ${fm(categoryBreakdown[c].bottom)} (${categoryBreakdown[c].count} حركة)\n`;
                    });
                }
                return `💸 **تقرير المصروفات والتكاليف (${dateLabel}):**\n\n` +
                       `🔻 **إجمالي المصروفات (تحت):** **${fm(totalBottom)}**\n` +
                       `📝 عدد عمليات الخصم: **${count} عملية**` + expCatDetails;

            case 'payments':
                return `💳 **طرق الدفع والتحصيل (${dateLabel}):**\n\n` +
                       `💵 النقدي (كاش): **${fm(cash)}**\n` +
                       `🟣 تحويلات انستا باي: **${fm(insta)}**`;

            case 'debts':
                const netExt = owedToMe - owedByMe;
                const isNetPositive = netExt >= 0;
                
                let debtAdvice = '';
                if (owedToMe === 0 && owedByMe === 0) {
                    debtAdvice = '✨ لا توجد أي مستحقات أو ديون مسجلة حالياً، موقفك المالي الخارجي متوازن تماماً.';
                } else if (netExt > 0) {
                    debtAdvice = `💡 **مؤشر إيجابي:** لك مستحقات فائضة بالخارج بمقدار **${fm(netExt)}**. يُنصح بمتابعة تحصيلها دورياً.`;
                } else if (netExt < 0) {
                    debtAdvice = `⚠️ **تنبيه التزامات:** عليك مديونيات للموردين بقيمة **${fm(Math.abs(netExt))}** تفوق مستحقاتك، رتب أولويات السداد.`;
                } else {
                    debtAdvice = '⚖️ المستحقات الخارجية تتساوى تماماً مع الالتزامات المطلوبة منك.';
                }

                return `💳 **كشف الحسابات الخارجية والديون (له وعليه):**\n\n` +
                       `🟢 **حقوقك ومستحقاتك الخارجية (له - لك ⬆️):**\n` +
                       `• إجمالي المستحقات: **${fm(owedToMe)}**\n` +
                       (topDebtor.amount > 0 && topDebtor.name !== 'مستحقات خارجية (له)' ? `• أكبر جهة/عميل: **${topDebtor.name}** بمبلغ **${fm(topDebtor.amount)}**\n` : '') +
                       `\n🔴 **التزاماتك ومطلوباتك للموردين (عليه - عليك ⬇️):**\n` +
                       `• إجمالي الالتزامات: **${fm(owedByMe)}**\n` +
                       (topCreditor.amount > 0 && topCreditor.name !== 'التزامات خارجية (عليه)' ? `• أكبر مورد/دائن: **${topCreditor.name}** بمبلغ **${fm(topCreditor.amount)}**\n` : '') +
                       `\n═══════════════════════════\n` +
                       `⚖️ **صافي الموقف المالي الخارجي:** **${isNetPositive ? '+' : ''}${fm(netExt)}** ${isNetPositive ? '🟢 (لصالحك)' : '🔴 (التزام عليك)'}\n\n` +
                       `${debtAdvice}`;

            case 'operations':
                return `📝 **تقرير عدد الفواتير وإخصائيات اليوم (${dateLabel}):**\n\n` +
                       `🔢 إجمالي عدد العمليات والفواتير: **${count} عملية**\n` +
                       `💰 إجمالي قيمة المبيعات والوارد: **${fm(totalTop)}**\n` +
                       `📈 متوسط الفاتورة الواحدة: **${fm(avgInvoice)}**\n` +
                       `🔝 أكبر فاتورة: **${fm(maxInvoice)}**\n` +
                       `⏰ وقت ذروة العمليات: **${peakHour}**`;

            case 'inventory':
                if (!inventoryStock || inventoryStock.length === 0) return `📦 **المخزون:** لا توجد عناصر رصيد مسجلة.`;
                let t = `📦 **تقرير رصيد المخزون وحالة البضاعة:**\n\n`;
                inventoryStock.forEach(i => { t += `${i.icon} **${i.name}:** ${i.unit1} ${i.unit1Name || 'طبق'} و ${i.unit2} ${i.unit2Name || 'قطعة'}\n`; });
                return t;

            case 'summary':
            default:
                const isNetProf = netProfit >= 0;
                return `📈 **التقرير المالي التجميعي الشامل (${dateLabel}):**\n\n` +
                       `💰 **إجمالي المبيعات (فوق):** **${fm(totalTop)}**\n` +
                       `• كاش نقدي: **${fm(cash)}** | تحويلات انستا باي: **${fm(insta)}**\n\n` +
                       `🔻 **إجمالي المصروفات (تحت):** **${fm(totalBottom)}**\n` +
                       `═══════════════════════════\n` +
                       `✨ **صافي الربح الفعلي:** **${fm(netProfit)}** ${isNetProf ? '🟢 (أرباح إيجابية)' : '🔴 (عجز/خسارة)'}\n` +
                       `📊 **هامش الربح:** **${margin}%**\n` +
                       `📝 **عدد العمليات المسجلة:** **${count} عملية**\n` +
                       `🔝 **أعلى فاتورة:** **${fm(maxInvoice)}**\n` +
                       `⏰ **ساعة الذروة:** **${peakHour}**\n\n` +
                       `🏥 **تقييم الأداء المالي:** **${healthGrade}**\n` +
                       `💡 **توصية بيان:** ${healthTip}`;
        }
    }
};
