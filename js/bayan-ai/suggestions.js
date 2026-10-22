// ============================================================
//  bayan-ai/suggestions.js - Smart Next Action Suggestions
// ============================================================

window.BayanAISuggestions = {
    getSuggestions(category) {
        switch (category) {
            case 'sales':
                return [
                    { label: '📊 فتح المبيعات', action: 'open_sales' },
                    { label: '🖨️ طباعة التقرير', action: 'print_report' },
                    { label: '📈 مقارنة بأمس', action: 'compare_yesterday' }
                ];
            case 'debts':
                return [
                    { label: '💳 فتح الحسابات الخارجية', action: 'open_debts' },
                    { label: '💬 إرسال واتساب', action: 'send_whatsapp' }
                ];
            case 'inventory':
                return [
                    { label: '📦 فتح المخزن والربط', action: 'open_inventory' }
                ];
            default:
                return [
                    { label: '⚙️ فتح الإعدادات', action: 'open_settings' },
                    { label: '📊 فتح التقرير', action: 'open_reports' }
                ];
        }
    }
};
