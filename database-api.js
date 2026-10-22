// ============================================================
//  Bayan Master Database Engine - Dexie.js (IndexedDB) & Safe Fallback
// ============================================================

let localDB = null;

if (typeof Dexie !== 'undefined') {
    try {
        localDB = new Dexie('BayanPOS_MasterDB');
        localDB.version(3).stores({
            transactions: 'id, date, category, timestamp, user, top, bottom',
            settings: 'key',
            inventory: 'id, date, invId',
            external_balances: 'id, type, date',
            notes: 'date',
            ai_chat_history: '++id, timestamp, sender'
        });
        localDB.version(4).stores({
            transactions: 'id, date, category, timestamp, user, top, bottom',
            settings: 'key',
            inventory: 'id, date, invId',
            external_balances: 'id, type, date',
            notes: 'date',
            notifications: 'id, status, type, date, timestamp, sourceId',
            ai_chat_history: '++id, timestamp, sender'
        });
        localDB.version(5).stores({
            transactions: 'id, date, category, [date+category], timestamp, user, top, bottom',
            settings: 'key',
            inventory: 'id, date, invId, [invId+date]',
            external_balances: 'id, type, date',
            notes: 'date',
            notifications: 'id, status, type, date, timestamp, sourceId, [status+timestamp]',
            ai_chat_history: '++id, timestamp, sender'
        });
        localDB.version(6).stores({
            transactions: 'id, date, category, [category+date], [date+category], timestamp, user, top, bottom',
            settings: 'key',
            inventory: 'id, date, invId, [invId+date]',
            external_balances: 'id, type, date',
            notes: 'date',
            notifications: 'id, status, type, date, timestamp, sourceId, [status+timestamp]',
            ai_chat_history: '++id, timestamp, sender'
        });
        console.log('✅ Bayan MasterDB (IndexedDB v6 فائق السرعة مع الفهارس المركبة المعكوسة) جاهز للاستخدام الفائق');
    } catch (err) {
        console.warn('⚠️ تعذر تشغيل IndexedDB، الاعتماد على LocalStorage:', err);
        localDB = null;
    }
} else {
    console.log('ℹ️ مكتبة Dexie غير محملة، يعمل المحرك بنمط التخزين المحلي الآمن (LocalStorage).');
}

window.BayanDB = {
    dexie: localDB,
    cache: new Map(),

    // ---------------- إعادة تعيين قاعدة البيانات لحساب جديد (Clean Slate Reset) ----------------
    async resetForNewAccount() {
        this.cache.clear();
        if (localDB) {
            try {
                const tables = ['transactions', 'inventory', 'external_balances', 'notes', 'notifications', 'ai_chat_history'];
                for (const t of tables) {
                    if (localDB[t]) {
                        await localDB[t].clear();
                    }
                }
                console.log('🧹 تم تصفير قاعدة بيانات دكسي (IndexedDB) بالكامل لحساب جديد.');
            } catch (e) {
                console.warn('BayanDB reset error:', e);
            }
        }
    },

    // ---------------- الإعدادات والمظهر (Settings & Config) ----------------
    async setSetting(key, value) {
        this.cache.set(key, value);
        if (localDB) {
            try { await localDB.settings.put({ key, value }); } catch (e) { }
        }
        try {
            localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : value);
        } catch (e) { }
    },

    async getSetting(key, defaultValue = null) {
        if (this.cache.has(key)) return this.cache.get(key);
        if (localDB) {
            try {
                const res = await localDB.settings.get(key);
                if (res && res.value !== undefined) {
                    this.cache.set(key, res.value);
                    return res.value;
                }
            } catch (e) {
                console.warn('Error reading setting from IndexedDB:', key, e);
            }
        }
        const lsVal = localStorage.getItem(key);
        if (lsVal !== null) {
            let parsed = lsVal;
            try { parsed = JSON.parse(lsVal); } catch (e) { }
            if (localDB) {
                try { await localDB.settings.put({ key, value: parsed }); } catch (e) { }
            }
            this.cache.set(key, parsed);
            return parsed;
        }
        return defaultValue;
    },

    // ---------------- المعاملات والعمليات المحاسبية (Transactions) ----------------
    async saveTransaction(rec) {
        if (!rec.id) rec.id = 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        if (!rec.date) {
            rec.date = (typeof currentDate !== 'undefined' && currentDate)
                ? currentDate
                : (rec.timestamp ? rec.timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10));
        }
        if (localDB) {
            try { await localDB.transactions.put(rec); } catch (e) { }
        }
        return rec;
    },

    async bulkSaveTransactions(records) {
        if (!Array.isArray(records) || records.length === 0) return;
        const fallbackDate = (typeof currentDate !== 'undefined' && currentDate) ? currentDate : new Date().toISOString().slice(0, 10);
        records.forEach(r => {
            if (!r.id) r.id = 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            if (!r.date) r.date = r.timestamp ? r.timestamp.slice(0, 10) : fallbackDate;
        });
        if (localDB) {
            try {
                await localDB.transactions.bulkPut(records);
            } catch (e) {
                console.warn('BayanDB bulkPut warning (falling back to put):', e);
                for (const r of records) {
                    try { await localDB.transactions.put(r); } catch (err) { }
                }
            }
        }
        return records;
    },

    async getTransactionsByDate(dateStr) {
        if (localDB) {
            try {
                return await localDB.transactions.where('date').equals(dateStr).toArray();
            } catch (e) { }
        }
        // Fallback to localStorage
        try {
            const raw = localStorage.getItem('acc_' + dateStr);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && Array.isArray(parsed.records)) return parsed.records;
            }
        } catch (e) { }
        return [];
    },

    async getAllTransactions() {
        if (localDB) {
            try {
                return await localDB.transactions.toArray();
            } catch (e) { }
        }
        // Fallback to localStorage
        const all = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('acc_') && /^acc_\d{4}-\d{2}-\d{2}$/.test(k)) {
                try {
                    const parsed = JSON.parse(localStorage.getItem(k));
                    if (parsed && Array.isArray(parsed.records)) {
                        all.push(...parsed.records);
                    }
                } catch (e) { }
            }
        }
        return all;
    },

    // ---------------- استعلام النطاق الزمني والفهرسة المتقدمة (Date Range & Compound Indexes) ----------------
    async getTransactionsByDateRange(startDate, endDate, category = null) {
        if (localDB) {
            try {
                if (category) {
                    if (startDate && endDate) {
                        return await localDB.transactions
                            .where('[category+date]')
                            .between([category, startDate], [category, endDate], true, true)
                            .toArray();
                    } else if (startDate) {
                        return await localDB.transactions
                            .where('[category+date]')
                            .between([category, startDate], [category, String.fromCharCode(65535)], true, true)
                            .toArray();
                    } else if (endDate) {
                        return await localDB.transactions
                            .where('[category+date]')
                            .between([category, ''], [category, endDate], true, true)
                            .toArray();
                    } else {
                        return await localDB.transactions
                            .where('category')
                            .equals(category)
                            .toArray();
                    }
                } else {
                    if (startDate && endDate) {
                        return await localDB.transactions
                            .where('date')
                            .between(startDate, endDate, true, true)
                            .toArray();
                    } else if (startDate) {
                        return await localDB.transactions
                            .where('date')
                            .aboveOrEqual(startDate)
                            .toArray();
                    } else if (endDate) {
                        return await localDB.transactions
                            .where('date')
                            .belowOrEqual(endDate)
                            .toArray();
                    } else {
                        return await localDB.transactions.toArray();
                    }
                }
            } catch (e) {
                console.warn('BayanDB getTransactionsByDateRange warning:', e);
            }
        }
        // Fallback to localStorage
        const results = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && /^acc_\d{4}-\d{2}-\d{2}$/.test(k)) {
                    const d = k.replace('acc_', '');
                    if (startDate && d < startDate) continue;
                    if (endDate && d > endDate) continue;
                    const parsed = JSON.parse(localStorage.getItem(k));
                    if (parsed && Array.isArray(parsed.records)) {
                        parsed.records.forEach(r => {
                            if (!category || r.category === category) {
                                results.push({ ...r, date: d });
                            }
                        });
                    }
                }
            }
        } catch (e) { }
        return results;
    },

    // ---------------- جلب الفئات الفريدة مباشرة من الفهرس بسرعة فائقة ----------------
    async getUniqueCategories() {
        if (localDB) {
            try {
                const keys = await localDB.transactions.orderBy('category').uniqueKeys();
                if (keys && keys.length > 0) return keys.filter(Boolean);
            } catch (e) { }
        }
        const cats = new Set();
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && /^acc_\d{4}-\d{2}-\d{2}$/.test(k)) {
                    const parsed = JSON.parse(localStorage.getItem(k));
                    if (parsed && Array.isArray(parsed.records)) {
                        parsed.records.forEach(r => { if (r.category) cats.add(r.category); });
                    }
                }
            }
        } catch (e) { }
        return Array.from(cats);
    },

    // ---------------- محرك البحث والاستعلام الشامل المفهرس (High-Performance Search) ----------------
    async searchTransactions({ query = '', category = '', startDate = '', endDate = '', limit = 300 } = {}) {
        const cleanQ = (query || '').toLowerCase().trim();
        const searchWords = cleanQ.split(/\s+/).filter(w => w.length > 0);

        if (localDB) {
            try {
                let collection = null;
                if (category) {
                    if (startDate && endDate) {
                        collection = localDB.transactions
                            .where('[category+date]')
                            .between([category, startDate], [category, endDate], true, true);
                    } else if (startDate) {
                        collection = localDB.transactions
                            .where('[category+date]')
                            .between([category, startDate], [category, String.fromCharCode(65535)], true, true);
                    } else if (endDate) {
                        collection = localDB.transactions
                            .where('[category+date]')
                            .between([category, ''], [category, endDate], true, true);
                    } else {
                        collection = localDB.transactions.where('category').equals(category);
                    }
                } else {
                    if (startDate && endDate) {
                        collection = localDB.transactions
                            .where('date')
                            .between(startDate, endDate, true, true);
                    } else if (startDate) {
                        collection = localDB.transactions
                            .where('date')
                            .aboveOrEqual(startDate);
                    } else if (endDate) {
                        collection = localDB.transactions
                            .where('date')
                            .belowOrEqual(endDate);
                    } else {
                        collection = localDB.transactions.toCollection();
                    }
                }

                if (collection) {
                    if (searchWords.length === 0) {
                        return await collection.limit(limit).toArray();
                    }
                    const filtered = await collection.filter(r => {
                        const totalAmt = Number(r.top || 0) + Number(r.bottom || 0);
                        const fullText = `${r.category || ''} ${r.notes || ''} ${r.top || 0} ${r.bottom || 0} ${totalAmt} ${r.user || ''} ${r.timestamp || ''}`.toLowerCase();
                        return searchWords.every(w => fullText.includes(w));
                    }).limit(limit).toArray();
                    return filtered;
                }
            } catch (e) {
                console.warn('BayanDB indexed search error:', e);
            }
        }

        // Fallback to localStorage
        const results = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && /^acc_\d{4}-\d{2}-\d{2}$/.test(k)) {
                    const d = k.replace('acc_', '');
                    if (startDate && d < startDate) continue;
                    if (endDate && d > endDate) continue;
                    const parsed = JSON.parse(localStorage.getItem(k));
                    if (parsed && Array.isArray(parsed.records)) {
                        for (const r of parsed.records) {
                            if (category && r.category !== category) continue;
                            if (searchWords.length > 0) {
                                const totalAmt = Number(r.top || 0) + Number(r.bottom || 0);
                                const fullText = `${r.category || ''} ${r.notes || ''} ${r.top || 0} ${r.bottom || 0} ${totalAmt} ${r.user || ''} ${r.timestamp || ''}`.toLowerCase();
                                if (!searchWords.every(w => fullText.includes(w))) continue;
                            }
                            results.push({ ...r, date: d });
                            if (results.length >= limit) break;
                        }
                    }
                }
                if (results.length >= limit) break;
            }
        } catch (e) { }
        return results;
    },

    async deleteTransaction(id) {
        if (localDB) {
            try { await localDB.transactions.delete(id); } catch (e) { }
        }
    },

    async deleteTransactionsByDate(dateStr) {
        if (localDB) {
            try {
                await localDB.transactions.where('date').equals(dateStr).delete();
            } catch (e) {
                console.warn('Error deleting date transactions from IndexedDB:', e);
            }
        }
    },

    // ---------------- المخزون والأرصدة (Inventory) ----------------
    async setInventoryStock(invId, dateStr, stockData) {
        const id = `${invId}_${dateStr}`;
        if (localDB) {
            try { await localDB.inventory.put({ id, invId, date: dateStr, stock: stockData }); } catch (e) { }
        }
        try {
            localStorage.setItem(`acc_inv_stock_${invId}_${dateStr}`, JSON.stringify(stockData));
        } catch (e) { }
    },

    async getInventoryStock(invId, dateStr) {
        const id = `${invId}_${dateStr}`;
        if (localDB) {
            try {
                const item = await localDB.inventory.get(id);
                if (item) return item.stock;
            } catch (e) { }
        }
        try {
            const raw = localStorage.getItem(`acc_inv_stock_${invId}_${dateStr}`);
            if (raw) return JSON.parse(raw);
        } catch (e) { }
        return { unit1: 0, unit2: 0 };
    },

    // ---------------- الحسابات الخارجية (External Balances) ----------------
    async getExternalBalances() {
        if (localDB) {
            try { return await localDB.external_balances.toArray(); } catch (e) { }
        }
        try {
            return JSON.parse(localStorage.getItem('acc_external_balances') || '[]');
        } catch (e) { return []; }
    },

    async saveExternalBalance(item) {
        if (!item.id) item.id = 'ext_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        if (localDB) {
            try { await localDB.external_balances.put(item); } catch (e) { }
        }
    },

    async deleteExternalBalance(id) {
        if (localDB) {
            try { await localDB.external_balances.delete(id); } catch (e) { }
        }
    },

    // ---------------- الإشعارات والتنبيهات الذكية (Smart Notifications) ----------------
    async saveNotification(notif) {
        if (!notif.id) notif.id = 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        if (localDB && localDB.notifications) {
            try { await localDB.notifications.put(notif); } catch (e) { }
        }
        try {
            const list = JSON.parse(localStorage.getItem('acc_bayan_notifications') || '[]');
            const idx = list.findIndex(n => n.id === notif.id);
            if (idx >= 0) list[idx] = notif;
            else list.push(notif);
            localStorage.setItem('acc_bayan_notifications', JSON.stringify(list));
        } catch (e) { }
        return notif;
    },

    async bulkSaveNotifications(notifList) {
        if (!Array.isArray(notifList) || notifList.length === 0) return;
        if (localDB && localDB.notifications) {
            try {
                await localDB.notifications.bulkPut(notifList);
            } catch (e) {
                for (const n of notifList) {
                    try { await localDB.notifications.put(n); } catch (err) { }
                }
            }
        }
        try {
            const list = JSON.parse(localStorage.getItem('acc_bayan_notifications') || '[]');
            const map = new Map(list.map(n => [n.id, n]));
            for (const n of notifList) map.set(n.id, n);
            localStorage.setItem('acc_bayan_notifications', JSON.stringify(Array.from(map.values())));
        } catch (e) { }
    },

    async getNotifications(status = null) {
        if (localDB && localDB.notifications) {
            try {
                if (status) {
                    return await localDB.notifications.where('status').equals(status).reverse().sortBy('timestamp');
                }
                return await localDB.notifications.toCollection().reverse().sortBy('timestamp');
            } catch (e) {
                console.warn('Error reading notifications from IndexedDB:', e);
            }
        }
        try {
            const list = JSON.parse(localStorage.getItem('acc_bayan_notifications') || '[]');
            if (status) return list.filter(n => n.status === status);
            return list;
        } catch (e) { return []; }
    },

    async getNotificationById(id) {
        if (localDB && localDB.notifications) {
            try {
                return await localDB.notifications.get(id);
            } catch (e) { }
        }
        try {
            const list = JSON.parse(localStorage.getItem('acc_bayan_notifications') || '[]');
            return list.find(n => n.id === id) || null;
        } catch (e) { return null; }
    },

    async markNotificationReceived(id) {
        const now = new Date().toISOString();
        if (localDB && localDB.notifications) {
            try {
                await localDB.notifications.update(id, { status: 'received', receivedAt: now });
            } catch (e) { }
        }
        try {
            const list = JSON.parse(localStorage.getItem('acc_bayan_notifications') || '[]');
            const item = list.find(n => n.id === id);
            if (item) {
                item.status = 'received';
                item.receivedAt = now;
                localStorage.setItem('acc_bayan_notifications', JSON.stringify(list));
            }
        } catch (e) { }
    },

    async restoreNotification(id) {
        if (localDB && localDB.notifications) {
            try {
                await localDB.notifications.update(id, { status: 'pending', receivedAt: null });
            } catch (e) { }
        }
        try {
            const list = JSON.parse(localStorage.getItem('acc_bayan_notifications') || '[]');
            const item = list.find(n => n.id === id);
            if (item) {
                item.status = 'pending';
                item.receivedAt = null;
                localStorage.setItem('acc_bayan_notifications', JSON.stringify(list));
            }
        } catch (e) { }
    },

    async deleteNotification(id) {
        if (localDB && localDB.notifications) {
            try {
                await localDB.notifications.delete(id);
            } catch (e) { }
        }
        try {
            let list = JSON.parse(localStorage.getItem('acc_bayan_notifications') || '[]');
            list = list.filter(n => n.id !== id);
            localStorage.setItem('acc_bayan_notifications', JSON.stringify(list));
        } catch (e) { }
    },

    async clearReceivedNotifications() {
        if (localDB && localDB.notifications) {
            try {
                await localDB.notifications.where('status').equals('received').delete();
            } catch (e) { }
        }
        try {
            let list = JSON.parse(localStorage.getItem('acc_bayan_notifications') || '[]');
            list = list.filter(n => n.status !== 'received');
            localStorage.setItem('acc_bayan_notifications', JSON.stringify(list));
        } catch (e) { }
    },

    // ---------------- سجل محادثات الذكاء الاصطناعي (AI Chat History) ----------------
    async saveAiMessage(text, sender) {
        if (localDB) {
            try {
                await localDB.ai_chat_history.add({
                    text,
                    sender,
                    timestamp: Date.now()
                });
            } catch (e) { }
        }
    },

    async getAiChatHistory(limit = 100) {
        if (localDB) {
            try {
                return await localDB.ai_chat_history.orderBy('id').limit(limit).toArray();
            } catch (e) { }
        }
        return [];
    },

    async clearAiChatHistory() {
        if (localDB) {
            try { await localDB.ai_chat_history.clear(); } catch (e) { }
        }
    },

    // ---------------- الهجرة التلقائية من LocalStorage لمرة واحدة (Auto Migration) ----------------
    async migrateFromLocalStorage() {
        if (!localDB) return;
        try {
            const isMigrated = await localDB.settings.get('db_migrated_v3');
            if (isMigrated && isMigrated.value) return;

            console.log('🔄 جاري نقل وتدقيق البيانات من LocalStorage إلى IndexedDB...');

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const val = localStorage.getItem(key);
                if (!val) continue;

                if (key.startsWith('acc_') && /^acc_\d{4}-\d{2}-\d{2}$/.test(key)) {
                    try {
                        const dayObj = JSON.parse(val);
                        const dateStr = key.replace('acc_', '');
                        if (dayObj && Array.isArray(dayObj.records)) {
                            for (const rec of dayObj.records) {
                                rec.date = dateStr;
                                if (!rec.id) rec.id = 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                                await localDB.transactions.put(rec);
                            }
                        }
                    } catch (e) { }
                } else if (key.startsWith('acc_inv_stock_')) {
                    try {
                        const parts = key.split('_');
                        const dateStr = parts[parts.length - 1];
                        const invId = parts.slice(3, parts.length - 1).join('_');
                        await localDB.inventory.put({ id: `${invId}_${dateStr}`, invId, date: dateStr, stock: JSON.parse(val) });
                    } catch (e) { }
                } else {
                    let parsed = val;
                    try { parsed = JSON.parse(val); } catch (e) { }
                    await localDB.settings.put({ key, value: parsed });
                }
            }

            await localDB.settings.put({ key: 'db_migrated_v3', value: true });
            console.log('✅ تم نقل كافة البيانات إلى IndexedDB بنجاح!');
        } catch (e) {
            console.warn('Migration warning:', e);
        }
    }
};

// تشغيل الهجرة التلقائية إن وُجدت قاعدة البيانات
if (window.BayanDB && localDB) {
    window.BayanDB.migrateFromLocalStorage();
}
