// ============================================================
//  bayan-ai/commands.js - Smart Transaction Entry Engine
// ============================================================

window.BayanAICommands = {
    async executeQuickEntry(query) {
        const q = query.toLowerCase();
        
        // 1. استخراج الأرقام (فوق وتحت) من نص الجملة بشكل فائق الذكاء
        let topAmount = 0;
        let bottomAmount = 0;

        // معالجة الأرقام المكتوبة كحروف أو أرقام عربية وإنجليزية
        let normalizedQuery = q.replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));

        // مطابقة فوق / مبيعات / وارد
        const matchTop = normalizedQuery.match(/(\d+(\.\d+)?)\s*(جنيه|ج)?\s*(فوق|مبيعات|مبيعة|مبيعه|إيراد|ايراد|كاش|وارد|دخل|ارباح|أرباح|بيع|بعت|بيعت)/i) || 
                          normalizedQuery.match(/(فوق|مبيعات|مبيعة|مبيعه|إيراد|ايراد|كاش|وارد|دخل|ارباح|أرباح|بيع|بعت|بيعت)\s*(\d+(\.\d+)?)/i);
        
        // مطابقة تحت / مصروف / صادر
        const matchBottom = normalizedQuery.match(/(\d+(\.\d+)?)\s*(جنيه|ج)?\s*(تحت|مصروف|مصروفات|مصاريف|صرفت|صرف|صرفنا|اشتريت|شراء|دفعت|دفع|دفعنا|خصم|خرج)/i) || 
                             normalizedQuery.match(/(تحت|مصروف|مصروفات|مصاريف|صرفت|صرف|صرفنا|اشتريت|شراء|دفعت|دفع|دفعنا|خصم|خرج)\s*(\d+(\.\d+)?)/i);

        if (matchTop) {
            const num = matchTop[1].match(/\d+/) ? matchTop[1] : matchTop[2];
            topAmount = parseFloat(num) || 0;
        }

        if (matchBottom) {
            const num = matchBottom[1].match(/\d+/) ? matchBottom[1] : matchBottom[2];
            bottomAmount = parseFloat(num) || 0;
        }

        // إذا لم يتم العثور على أرقام بالصيغ المباشرة، فحص الأرقام المكتوبة بالحروف
        if (topAmount === 0 && bottomAmount === 0) {
            const parsedWordNum = window.BayanAIUtils.convertArabicWordsToNumber(normalizedQuery);
            if (parsedWordNum > 0) {
                if (normalizedQuery.match(/(مصروف|مصاريف|صرفت|صرف|صرفنا|تحت|كهرباء|كهربا|إيجار|ايجار|شراء|اشتريت|دفع|دفعت|دفعنا|غاز|مياه|مية|مياة|مرتب|مرتبات|بنزين|سولار|صيانة|فطار|غدا|عشا|طلب|اكل|شاي|سكر)/i)) {
                    bottomAmount = parsedWordNum;
                } else {
                    topAmount = parsedWordNum;
                }
            }
        }

        const allNums = normalizedQuery.match(/\d+(\.\d+)?/g);
        if (topAmount === 0 && bottomAmount === 0 && allNums && allNums.length > 0) {
            const firstNum = parseFloat(allNums[0]);
            if (normalizedQuery.match(/(مصروف|مصاريف|صرفت|صرف|صرفنا|تحت|كهرباء|كهربا|إيجار|ايجار|شراء|اشتريت|دفع|دفعت|دفعنا|غاز|مياه|مية|مياة|مرتب|مرتبات|بنزين|سولار|صيانة|فطار|غدا|عشا|طلب|اكل|شاي|سكر)/i)) {
                bottomAmount = firstNum;
            } else {
                topAmount = firstNum;
            }
        }

        if (topAmount === 0 && bottomAmount === 0) {
            return "⚠️ لم أتمكن من استخراج المبلغ بدقة! يرجى تحديد المبلغ بوضوح (مثال: 'سجل مبيعة 200 كاش' أو 'سجل مصروف كهرباء 150 تحت').";
        }

        // استخراج التاريخ المحدد حالياً في حقل التاريخ بالشاشة
        let activeSelectedDate = window.BayanAIUtils.getFormattedDate(0);
        const dateInputEl = document.getElementById('dateInput');
        if (dateInputEl && dateInputEl.value) {
            activeSelectedDate = dateInputEl.value;
        }

        const timeStr = window.BayanAIUtils.getShortTime();

        // تصفية الكلمات للحصول على الملاحظات والتصنيف بشكل نقي
        let cleanNotes = query.replace(/(سجل|اضف|أضف|ضف|نزل|نزّل|حط|اكتب|عملية|جديدة|جنيه|ج|فوق|تحت|كاش|مصروف|مصاريف|مبيعات|مبيعة|مبيعه|إيراد|ايراد|صرفت|صرف|اشتريت|دفعت)/gi, '').trim();
        
        // استنتاج التصنيف الذكي
        let categoryName = topAmount > 0 ? 'مبيعات' : 'مصروفات';
        if (normalizedQuery.match(/(كهرباء|كهربا)/i)) categoryName = 'كهرباء';
        else if (normalizedQuery.match(/(إيجار|ايجار)/i)) categoryName = 'إيجار';
        else if (normalizedQuery.match(/(مرتب|مرتبات)/i)) categoryName = 'مرتبات';
        else if (normalizedQuery.match(/(مياه|مية|مياة)/i)) categoryName = 'مياه';
        else if (normalizedQuery.match(/(غاز)/i)) categoryName = 'غاز';
        else if (normalizedQuery.match(/(بنزين|سولار)/i)) categoryName = 'وقود ومواصلات';
        else if (normalizedQuery.match(/(صيانة)/i)) categoryName = 'صيانة';
        else if (normalizedQuery.match(/(فطار|غدا|عشا|أكل|اكل|شاي|سكر)/i)) categoryName = 'ضيافة وبوفيه';
        else if (normalizedQuery.match(/(شراء|مشتريات|بضاعة)/i)) categoryName = 'مشتريات بضاعة';
        else {
            let wordsList = cleanNotes.split(/\s+/).filter(w => !w.match(/^\d+(\.\d+)?$/) && w.length > 1);
            if (wordsList.length > 0) categoryName = wordsList[0];
        }

        const safeDeviceId = localStorage.getItem('acc_device_id') || ('BYN-' + Math.random().toString(36).substr(2, 7).toUpperCase());
        const currentUser = localStorage.getItem('acc_current_user_name') || localStorage.getItem('acc_user_name') || 'مساعد بيان الذكي 🤖';

        const newRecord = {
            id: typeof window.uid === 'function' ? window.uid() : ('tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
            category: categoryName,
            top: topAmount,
            bottom: bottomAmount,
            notes: cleanNotes || query,
            timestamp: new Date().toISOString(),
            date: activeSelectedDate,
            device: typeof window.detectDeviceType === 'function' ? window.detectDeviceType() : 'desktop',
            deviceId: safeDeviceId,
            user: currentUser
        };

        // 1. الحفظ الأساسي في IndexedDB
        if (window.BayanDB && typeof window.BayanDB.saveTransaction === 'function') {
            await window.BayanDB.saveTransaction(newRecord);
        }

        // 2. الحفظ عبر DB_API الرئيسي
        if (typeof DB_API !== 'undefined' && typeof DB_API.saveTransaction === 'function') {
            await DB_API.saveTransaction({
                ...newRecord,
                total: (Number(topAmount || 0) + Number(bottomAmount || 0))
            });
        }

        // 3. التحديث المباشر للمصفوفة الحية ومزامنة البرنامج عبر saveToStorage
        const activeDateOnScreen = dateInputEl ? dateInputEl.value : activeSelectedDate;
        if (activeDateOnScreen === activeSelectedDate && typeof window.records !== 'undefined' && Array.isArray(window.records)) {
            window.records.push(newRecord);
        }

        if (typeof window.saveToStorage === 'function') {
            await window.saveToStorage();
        }

        // 4. إعادة رسم الواجهة فورياً وتحديث الإجماليات
        if (typeof window.render === 'function') {
            window.render();
        }

        // 5. تصفير كاش المساعد الذكي لضمان حداثة الاستعلامات القادمة
        if (window.BayanAICache && typeof window.BayanAICache.clear === 'function') {
            window.BayanAICache.clear();
        }

        if (typeof window.showToast === 'function') {
            window.showToast('✅ تم تسجيل العملية بنجاح في الجدول الحي', 'success');
        }

        const fm = window.BayanAIUtils.formatMoney;
        const totalAmountVal = topAmount > 0 ? topAmount : bottomAmount;
        const directionText = topAmount > 0 ? '🔝 فوق (مبيعات / إيراد)' : '🔻 تحت (مصروفات / خصم)';

        return `✅ **تم تسجيل العملية بنجاح في الحسابات!**\n\n` +
               `💵 **المبلغ:** **${fm(totalAmountVal)}** (${directionText})\n` +
               `🏷️ **البند / الفئة:** **${categoryName}**\n` +
               `📝 **البيان والملاحظات:** ${cleanNotes || query}\n` +
               `📅 **التاريخ والوقت:** ${activeSelectedDate} — ${timeStr}`;
    },

    async execute(cmdText) {
        const q = cmdText.toLowerCase();

        if (q.startsWith('سجل') || q.startsWith('اضف') || q.startsWith('أضف') || q.startsWith('ضف') || q.startsWith('نزل') || q.startsWith('نزّل') || q.startsWith('حط') || q.startsWith('اكتب') || q.includes('فوق') || q.includes('تحت')) {
            return await this.executeQuickEntry(cmdText);
        }

        const minimizeForView = () => {
            const win = document.getElementById('bayan-ai-chat');
            if (win && !win.classList.contains('minimized')) {
                window.toggleAiWindowSize();
            }
        };

        if (q.includes('إعدادات') || q.includes('اعدادات')) {
            minimizeForView();
            const fn = window.showSettingsModal || (typeof showSettingsModal === 'function' ? showSettingsModal : null);
            if (fn) fn();
            return '✅ تم تصغير النافذة وفتح الإعدادات.';
        }
        if (q.includes('حسابات') || q.includes('خارجي') || q.includes('ديون')) {
            minimizeForView();
            const fn = window.showExternalBalancesModal || (typeof showExternalBalancesModal === 'function' ? showExternalBalancesModal : null);
            if (fn) fn();
            return '✅ تم تصغير النافذة وفتح الحسابات الخارجية.';
        }
        if (q.includes('مخزون') || q.includes('أرصدة') || q.includes('ارصدة')) {
            minimizeForView();
            const fn = window.openInventoriesSideMenu || (typeof openInventoriesSideMenu === 'function' ? openInventoriesSideMenu : null);
            if (fn) fn();
            return '✅ تم تصغير النافذة وفتح الأرصدة والمخزن.';
        }
        if (q.includes('اطبع') || q.includes('طباعة')) {
            const fn = window.printDailyReport || (typeof printDailyReport === 'function' ? printDailyReport : null);
            if (fn) fn();
            return '🖨️ جاري بدء طباعة التقرير...';
        }
        if (q.includes('تصدير') || q.includes('نسخة')) {
            const fn = window.exportAllData || (typeof exportAllData === 'function' ? exportAllData : null);
            if (fn) fn();
            return '💾 جاري تصدير النسخة الاحتياطية...';
        }

        return await this.executeQuickEntry(cmdText);
    }
};
