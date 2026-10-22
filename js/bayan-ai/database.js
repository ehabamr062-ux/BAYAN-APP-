// ============================================================
//  bayan-ai/database.js - Bayan POS IndexedDB Data Access Layer
// ============================================================

window.BayanAIDatabase = {
    async getTransactionsByDate(dateStr) {
        // 1. الأولوية القصوى: مصفوفة window.records الحية المعروضة على الشاشة لحظياً لضمان التطابق 100% بالمليم
        const dateInputEl = document.getElementById('dateInput');
        const activeScreenDate = dateInputEl ? dateInputEl.value : (typeof currentDate !== 'undefined' ? currentDate : null);
        
        if (activeScreenDate === dateStr && typeof window.records !== 'undefined' && Array.isArray(window.records)) {
            return window.records;
        }

        // 2. القراءة من محرك IndexedDB v6 المفهرس لضمان جلب أحدث وأدق بيانات
        if (window.BayanDB && typeof window.BayanDB.getTransactionsByDate === 'function') {
            try {
                const dbRecords = await window.BayanDB.getTransactionsByDate(dateStr);
                if (Array.isArray(dbRecords) && dbRecords.length > 0) return dbRecords;
            } catch (e) {
                console.warn('BayanAIDatabase: BayanDB.getTransactionsByDate error', e);
            }
        }

        // 3. مسار الأمان الاحتياطي (Fallback) من localStorage
        const key = 'acc_' + dateStr;
        const rawLocalStorage = localStorage.getItem(key);
        if (rawLocalStorage) {
            try {
                const parsed = JSON.parse(rawLocalStorage);
                const localRecords = Array.isArray(parsed) ? parsed : (parsed.records || []);
                if (localRecords.length > 0) return localRecords;
            } catch(e) {}
        }

        return [];
    },

    // استعلام النطاق الزمني بالفهارس السريعة
    async getTransactionsByDateRange(startDate, endDate, category = null) {
        if (window.BayanDB && typeof window.BayanDB.getTransactionsByDateRange === 'function') {
            try {
                return await window.BayanDB.getTransactionsByDateRange(startDate, endDate, category);
            } catch(e) {
                console.warn('BayanAIDatabase range query error', e);
            }
        }
        if (typeof DB_API !== 'undefined' && typeof DB_API.getTransactionsByDateRange === 'function') {
            try {
                return await DB_API.getTransactionsByDateRange(startDate, endDate, category);
            } catch(e) {}
        }
        
        // مسار بديل إذا لم يتوفر الفهرس
        const results = [];
        let curr = new Date(startDate);
        const end = new Date(endDate);
        while (curr <= end) {
            const d = curr.toISOString().slice(0, 10);
            const dayRecs = await this.getTransactionsByDate(d);
            if (Array.isArray(dayRecs)) {
                dayRecs.forEach(r => {
                    if (!category || r.category === category) {
                        results.push({ ...r, date: r.date || d });
                    }
                });
            }
            curr.setDate(curr.getDate() + 1);
        }
        return results;
    },

    async getAllTransactions() {
        if (window.BayanDB && typeof window.BayanDB.getAllTransactions === 'function') {
            try {
                const txs = await window.BayanDB.getAllTransactions();
                if (Array.isArray(txs) && txs.length > 0) return txs;
            } catch(e) {}
        }
        if (typeof DB_API !== 'undefined' && typeof DB_API.getAllTransactions === 'function') {
            try {
                return await DB_API.getAllTransactions();
            } catch(e) {}
        }
        return [];
    },

    async getExternalBalances() {
        if (window.BayanDB && typeof window.BayanDB.getExternalBalances === 'function') {
            try {
                const dbList = await window.BayanDB.getExternalBalances();
                if (dbList && dbList.length > 0) return dbList;
            } catch(e) {}
        }

        const list = [];
        const extToMe = parseFloat(localStorage.getItem('acc_ext_tome')) || 0;
        const extByMe = parseFloat(localStorage.getItem('acc_ext_byme')) || 0;

        if (extToMe > 0) {
            list.push({ type: 'to', name: 'مستحقات خارجية (له)', amount: extToMe });
        }
        if (extByMe > 0) {
            list.push({ type: 'from', name: 'التزامات خارجية (عليه)', amount: extByMe });
        }

        return list;
    },

    async getInventoriesConfig() {
        const raw = localStorage.getItem('acc_inventories_config');
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch (e) {}
        }
        if (window.BayanDB && typeof window.BayanDB.getSetting === 'function') {
            try {
                const dbConf = await window.BayanDB.getSetting('acc_inventories_config');
                if (Array.isArray(dbConf) && dbConf.length > 0) return dbConf;
            } catch (e) {}
        }
        return [
            { id: 'inv_egg', name: 'رصيد البيض', unit1: 'طبق', unit2: 'قطعة', icon: '🥚' }
        ];
    },

    async getInventoryStock(invId, dateStr) {
        const stockKey = `acc_inv_stock_${invId}_${dateStr}`;
        const raw = localStorage.getItem(stockKey);
        if (raw) {
            try {
                const stock = JSON.parse(raw);
                return {
                    unit1: parseFloat(stock.u1 ?? stock.unit1 ?? stock.plates) || 0,
                    unit2: parseFloat(stock.u2 ?? stock.unit2 ?? stock.pieces) || 0
                };
            } catch(e) {}
        }
        if (invId === 'inv_egg') {
            const oldEgg = localStorage.getItem(`acc_egg_stock_${dateStr}`);
            if (oldEgg) {
                try {
                    const parsedEgg = JSON.parse(oldEgg);
                    return {
                        unit1: parseFloat(parsedEgg.plates ?? parsedEgg.u1) || 0,
                        unit2: parseFloat(parsedEgg.pieces ?? parsedEgg.u2) || 0
                    };
                } catch(e) {}
            }
        }
        if (window.BayanDB && typeof window.BayanDB.getInventoryStock === 'function') {
            try {
                return await window.BayanDB.getInventoryStock(invId, dateStr);
            } catch(e) {}
        }
        return { unit1: 0, unit2: 0 };
    }
};
