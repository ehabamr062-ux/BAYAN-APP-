// ============================================================
//  bayan-ai/intents.js - Advanced Intent Recognition Engine v2
// ============================================================

window.BayanAIIntents = {
    appKeywords: [
        'مبيعات', 'مبيعاتي', 'مبيعة', 'بيع', 'بعت', 'بيعت', 'بعنا', 'بيعنا', 'إيراد', 'ايراد', 'إيرادات', 'ايرادات', 'دخل', 'دخلنا', 'فوق', 'مبلغ فوق', 'اللي فوق',
        'أرباح', 'ارباح', 'ربح', 'ربحي', 'أرباحي', 'صافي', 'الصافي', 'مكسب', 'كسبت', 'كسبنا', 'كسبت كام', 'كسبنا كام',
        'مصاريف', 'مصروفات', 'صرفت', 'صرفنا', 'تكلفة', 'تكاليف', 'خسارة', 'خسرت', 'مصروف', 'تحت', 'مبلغ تحت', 'اللي تحت', 'خرج كام', 'دفعنا كام',
        'كاش', 'خزينة', 'صندوق', 'انستا', 'انستاباي', 'instapay', 'شبكة', 'فيزا', 'تحويل', 'فلوس', 'نقدي',
        'دين', 'ديون', 'له', 'عليه', 'حساب خارجي', 'آجل', 'اجل', 'عميل', 'مورد', 'باقي', 'الباقي', 'فلوسنا', 'اللي لينا', 'اللي علينا',
        'مخزون', 'بضاعة', 'رصيد', 'جرد', 'بيض', 'أطباق', 'اطباق', 'طبق', 'كرتونة', 'كراتين', 'قطع', 'حبة', 'عدد', 'ناقص', 'نواقص', 'المنتهي',
        'عمليات', 'عملية', 'عدد العمليات', 'سجل', 'فواتير', 'فاتورة', 'تقرير', 'تقارير', 'إحصائيات', 'احصائيات', 'بيان', 'شغل', 'شغلنا', 'تقفيل',
        'اليوم', 'النهارده', 'النهاردة', 'أمس', 'امبارح', 'البارحة', 'الشهر', 'شهر', 'الأسبوع', 'اسبوع', 'تاريخ',
        'افتح', 'اطبع', 'صدر', 'نسخة', 'سجل', 'اضف', 'إضافة', 'متوسط', 'أعلى', 'اقل', 'أقل', 'ذروة', 'اكثر', 'أكثر'
    ],

    isAppScope(query) {
        if (!query || typeof query !== 'string') return false;
        return true;
    },

    parse(query) {
        const q = query.trim().toLowerCase();
        const dateFilter = window.BayanAIParser.parseDateRange(q);

        let category = 'summary';

        // 1. فحص أوامر التسجيل المباشرة
        if (q.startsWith('سجل') || q.startsWith('اضف') || q.startsWith('أضف') || q.startsWith('ضف') || q.startsWith('نزل') || q.startsWith('نزّل') || q.startsWith('حط') || q.startsWith('اكتب') || ((q.includes('فوق') || q.includes('تحت')) && q.match(/\d+/))) {
            category = 'quick_entry';
        } 
        // 2. فحص النواقص والمخزون الحرج
        else if (q.includes('نواقص') || q.includes('ناقص') || q.includes('المنتهي') || q.includes('فحص النواقص') || q.includes('قريب يخلص') || q.includes('خلص') || q.includes('بضاعة ناقصة') || q.includes('شراء بضاعة')) {
            category = 'low_stock';
        }
        // 3. فحص الأرباح وصافي المكسب
        else if (q.includes('صافي الأرباح') || q.includes('صافي الارباح') || q.includes('الأرباح') || q.includes('ارباح') || q.includes('أرباح') || q.includes('ربح') || q.includes('ربحي') || q.includes('صافي') || q.includes('الصافي') || q.includes('مكسب') || q.includes('كسبنا') || q.includes('كسبت') || q.includes('صفى معانا') || q.includes('صافي الدخل')) {
            category = 'profit';
        }
        // 4. فحص ساعات الذروة وأوقات الضغط
        else if (q.includes('ذروة') || q.includes('ساعة الذروة') || q.includes('اكتر وقت') || q.includes('أكثر وقت') || q.includes('اكتر ساعة') || q.includes('أفضل وقت') || q.includes('ضغط الشغل') || q.includes('زحمة')) {
            category = 'peak_hour';
        }
        // 5. فحص أعلى وأقل فاتورة أو متوسط العمليات
        else if (q.includes('متوسط') || q.includes('أعلى فاتورة') || q.includes('اعلى فاتورة') || q.includes('أكبر مبيعة') || q.includes('اكبر مبيعة') || q.includes('اقل فاتورة') || q.includes('أقل فاتورة') || q.includes('اصغر فاتورة')) {
            category = 'stats_extremes';
        }
        // 6. فحص المبيعات والإيرادات (شامل كل العامية المصرية)
        else if (q.includes('مبيعات') || q.includes('مبيعة') || q.includes('إيراد') || q.includes('ايراد') || q.includes('إيرادات') || q.includes('ايرادات') || q.includes('بيع') || q.includes('بعت') || q.includes('بيعنا') || q.includes('بعنا') || q.includes('دخل كام') || q.includes('دخلنا كام') || q.includes('دخل المحل') || q.includes('عملنا كام') || q.includes('عملت كام') || q.includes('طلعنا بكام') || q.includes('جمعنا كام') || q.includes('فوق') || q.includes('اللي فوق') || q.includes('مبلغ فوق')) {
            category = 'sales';
        }
        // 7. فحص المصروفات والتكاليف
        else if (q.includes('مصاريف') || q.includes('مصروفات') || q.includes('مصروف') || q.includes('صرفت') || q.includes('صرفنا') || q.includes('صرف') || q.includes('تحت') || q.includes('اللي تحت') || q.includes('مبلغ تحت') || q.includes('تكاليف') || q.includes('خسارة') || q.includes('خرج كام') || q.includes('دفعنا كام')) {
            category = 'expenses';
        }
        // 8. فحص الكاش وطرق الدفع والتحويل
        else if (q.includes('الكاش وانستا') || q.includes('كاش وانستا') || q.includes('انستا باي') || q.includes('انستاباي') || q.includes('instapay') || q.includes('كاش') || q.includes('انستا') || q.includes('فيزا') || q.includes('تحويلات') || q.includes('نقدي') || q.includes('خزينة') || q.includes('صندوق')) {
            category = 'payments';
        }
        // 9. فحص الديون والحسابات الخارجية
        else if (q.includes('الديون والحسابات') || q.includes('ديون') || q.includes('دين') || q.includes('حسابات خارجية') || q.includes('خارجية') || q.includes('له') || q.includes('عليه') || q.includes('عميل') || q.includes('مورد') || q.includes('فلوسنا بره') || q.includes('اللي لينا') || q.includes('اللي علينا') || q.includes('آجل') || q.includes('اجل')) {
            category = 'debts';
        }
        // 10. فحص المخزون والأرصدة العامة
        else if (q.includes('رصيد البيض والمخزون') || q.includes('رصيد البيض') || q.includes('مخزون') || q.includes('بيض') || q.includes('أطباق') || q.includes('اطباق') || q.includes('طبق') || q.includes('بضاعة') || q.includes('كم طبق') || q.includes('كام طبق') || q.includes('كرتونة') || q.includes('كراتين')) {
            category = 'inventory';
        }
        // 11. فحص الفواتير والعدد
        else if (q.includes('عدد الفواتير') || q.includes('فواتير') || q.includes('عمليات') || q.includes('عدد العمليات') || q.includes('عملنا كام حركة') || q.includes('كام فاتورة') || q.includes('كم فاتورة') || q.includes('حركات')) {
            category = 'operations';
        }
        // 12. التقرير الشامل / الملخص المالي العام
        else if (q.includes('تقرير') || q.includes('ملخص') || q.includes('اجمالي') || q.includes('إجمالي') || q.includes('شغل') || q.includes('شغلنا') || q.includes('حسابات') || q.includes('تقفيل') || q.includes('الموقف المالي') || q.includes('الوضع') || q.includes('الدنيا')) {
            category = 'summary';
        }
        // 13. استعلام أو بحث مخصص عن صنف/بند/اسم
        else {
            category = 'search_filter';
        }

        return { category, dateFilter, rawQuery: query };
    }
};
