// ============================================================
//  bayan-ai/utils.js - Utility Functions for Bayan AI Pro
// ============================================================

window.BayanAIUtils = {
    formatMoney(num) {
        return (parseFloat(num) || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ج.م';
    },

    getFormattedDate(offsetDays = 0) {
        const d = new Date();
        d.setDate(d.getDate() - offsetDays);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    getShortTime(timestamp) {
        const d = timestamp ? new Date(timestamp) : new Date();
        return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    },

    cleanText(str) {
        if (!str || typeof str !== 'string') return '';
        return str.trim()
            .toLowerCase()
            .replace(/[أإآ]/g, 'ا')
            .replace(/ة/g, 'ه')
            .replace(/ى/g, 'ي')
            .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
            .replace(/\s+/g, ' ');
    },

    // تحويل الأرقام المكتوبة بالحروف العربية إلى أرقام فعلية
    convertArabicWordsToNumber(text) {
        if (!text) return 0;
        let t = text.replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
        
        // الأرقام المباشرة
        const directNum = t.match(/\d+(\.\d+)?/);
        if (directNum) return parseFloat(directNum[0]);

        const map = {
            'واحد': 1, 'واحدة': 1, 'اتنين': 2, 'اثنين': 2, 'تلاتة': 3, 'ثلاثة': 3, 'اربعة': 4, 'أربعة': 4,
            'خمسة': 5, 'ستة': 6, 'سبعة': 7, 'تمانية': 8, 'ثمانية': 8, 'تسعة': 9, 'عشرة': 10,
            'عشرين': 20, 'تلاتين': 30, 'ثلاثين': 30, 'اربعين': 40, 'أربعين': 40, 'خمسين': 50,
            'ستين': 60, 'سبعين': 70, 'تمانين': 80, 'ثمانين': 80, 'تسعين': 90,
            'مية': 100, 'مائة': 100, 'ميتين': 200, 'مائتان': 200, 'تلتماية': 300, 'ثلاثمائة': 300,
            'خمسمية': 500, 'خمسمائة': 500, 'الف': 1000, 'ألف': 1000, 'الفين': 2000, 'ألفين': 2000,
            'مليون': 1000000, 'نصف': 0.5, 'نص': 0.5, 'ربع': 0.25
        };

        let total = 0;
        let words = t.split(/\s+/);
        for (const w of words) {
            const clean = w.replace(/^و/, '');
            if (map[clean]) total += map[clean];
        }
        return total;
    }
};
