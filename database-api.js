// --- IndexedDB Configuration ---
const DB_NAME = 'BayanLocalDB';
const DB_VERSION = 1;
const STORE_NAME = 'transactions';

let localIndexedDB;
const request = indexedDB.open(DB_NAME, DB_VERSION);

request.onupgradeneeded = (event) => {
    const db = event.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
};

request.onsuccess = (event) => {
    localIndexedDB = event.target.result;
    console.log('✅ IndexedDB Initialized');
};

const DB_API = {
    // قم بتغيير هذا الرابط لرابط السيرفر الحقيقي عند الرفع
    baseURL: window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : 'https://your-api-domain.com/api',
    isConnected: false,

    // جلب السريال من الجهاز
    getSerial() {
        return localStorage.getItem('app_auth_serial') || 'NO_SERIAL';
    },

    // إعداد الهيدرز مع السريال
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'X-App-Serial': this.getSerial()
        };
    },

    async checkConnection() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            const response = await fetch(`${this.baseURL}/status`, { 
                method: 'GET',
                headers: this.getHeaders(),
                signal: controller.signal 
            });
            clearTimeout(timeoutId);
            const data = await response.json();
            this.isConnected = data.online;
            return this.isConnected;
        } catch (error) {
            console.warn('⚠️ السيرفر غير متصل. سيتم استخدام IndexedDB.');
            this.isConnected = false;
            return false;
        }
    },

    // حفظ في IndexedDB
    async saveLocal(transaction) {
        if (!localIndexedDB) return;
        const tx = localIndexedDB.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(transaction);
        return tx.complete;
    },

    // جلب من IndexedDB
    async getLocalAll() {
        return new Promise((resolve) => {
            if (!localIndexedDB) return resolve([]);
            const tx = localIndexedDB.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
        });
    },

    async saveTransaction(transaction) {
        // دائماً احفظ محلياً أولاً للسرعة والأمان
        await this.saveLocal(transaction);

        if (!this.isConnected) return { success: true, local: true };

        try {
            const response = await fetch(`${this.baseURL}/transactions`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(transaction)
            });
            return await response.json();
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async getAllTransactions() {
        // إذا كان هناك إنترنت، اجلب من السيرفر، وإلا فمن IndexedDB
        if (this.isConnected) {
            try {
                const response = await fetch(`${this.baseURL}/transactions`, { 
                    headers: this.getHeaders(),
                    cache: 'no-store' 
                });
                const data = await response.json();
                // حدث المخزن المحلي بالبيانات الجديدة
                for (const item of data) await this.saveLocal(item);
                return data;
            } catch (e) {
                return await this.getLocalAll();
            }
        }
        return await this.getLocalAll();
    },

    async deleteTransaction(id) {
        // حذف محلي
        if (localIndexedDB) {
            const tx = localIndexedDB.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).delete(id);
        }

        if (!this.isConnected) return { success: true, local: true };

        try {
            await fetch(`${this.baseURL}/transactions/${id}`, { 
                method: 'DELETE',
                headers: this.getHeaders()
            });
            return { success: true };
        } catch (error) {
            return { success: false };
        }
    },

    // --- Users ---
    async getAllUsers() {
        if (!this.isConnected) return null;
        try {
            const response = await fetch(`${this.baseURL}/users`, { 
                headers: this.getHeaders(),
                cache: 'no-store' 
            });
            return await response.json();
        } catch (error) {
            console.error('❌ خطأ في جلب المستخدمين:', error);
            return null;
        }
    },

    async saveUser(user) {
        if (!this.isConnected) return { success: true, local: true };
        try {
            const response = await fetch(`${this.baseURL}/users`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(user)
            });
            return await response.json();
        } catch (error) {
            console.error('❌ خطأ في حفظ المستخدم:', error);
            return { success: false, error: error.message };
        }
    },

    async deleteUser(id) {
        if (!this.isConnected) return { success: true, local: true };
        try {
            const response = await fetch(`${this.baseURL}/users/${id}`, { 
                method: 'DELETE',
                headers: this.getHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('❌ خطأ في حذف المستخدم:', error);
            return { success: false, error: error.message };
        }
    },

    // --- Inventory ---
    async getAllInventory() {
        if (!this.isConnected) return null;
        try {
            const response = await fetch(`${this.baseURL}/inventory`, { 
                headers: this.getHeaders(),
                cache: 'no-store' 
            });
            return await response.json();
        } catch (error) {
            console.error('❌ خطأ في جلب المخزون:', error);
            return null;
        }
    },

    async saveInventoryItem(item) {
        if (!this.isConnected) return { success: true, local: true };
        try {
            const response = await fetch(`${this.baseURL}/inventory`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(item)
            });
            return await response.json();
        } catch (error) {
            console.error('❌ خطأ في حفظ بند المخزون:', error);
            return { success: false, error: error.message };
        }
    },

    async deleteInventoryItem(code) {
        if (!this.isConnected) return { success: true, local: true };
        try {
            const response = await fetch(`${this.baseURL}/inventory/${code}`, { method: 'DELETE' });
            return await response.json();
        } catch (error) {
            console.error('❌ خطأ في حذف بند المخزون:', error);
            return { success: false, error: error.message };
        }
    },

    // مزامنة الإعدادات (جلب من السيرفر وتحديث localStorage)
    async syncSettings() {
        if (!this.isConnected) return;
        
        const settings = await this.getSettings();
        if (settings) {
            console.log('🔄 جاري مزامنة الإعدادات من السيرفر...');
            const syncKeys = [
                'acc_user_name', 'acc_user_phone', 'acc_user_notes', 'acc_app_theme', 
                'acc_dark_mode', 'acc_font_family', 'acc_font_weight', 'acc_sounds_enabled',
                'acc_auto_lock', 'acc_privacy_mode', 'acc_app_notes', 'acc_notes_box_name',
                'acc_ext_tome', 'acc_ext_byme', 'acc_custom_items', 'acc_custom_categories', 'acc_inventories_config'
            ];

            for (const key of syncKeys) {
                if (settings[key] !== undefined) {
                    try {
                        const val = JSON.parse(settings[key]);
                        localStorage.setItem(key, typeof val === 'object' ? JSON.stringify(val) : val);
                    } catch (e) {
                        localStorage.setItem(key, settings[key]);
                    }
                }
            }
            return true;
        }
        return false;
    }
};

// تهيئة الاتصال عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', async () => {
    const connected = await DB_API.checkConnection();
    if (connected) {
        console.log('✅ متصل بقاعدة البيانات المحلية');
        
        // 1. مزامنة الإعدادات والملاحظات
        await DB_API.syncSettings();

        // 2. مزامنة المستخدمين
        const dbUsers = await DB_API.getAllUsers();
        if (dbUsers && dbUsers.length > 0) {
            localStorage.setItem('acc_bayan_users', JSON.stringify(dbUsers));
            window.currentUserList = dbUsers;
        }

        // 3. تحديث واجهة المستخدم
        if (typeof renderAppNotesBox === 'function') renderAppNotesBox();
        if (typeof renderExternalBalances === 'function') renderExternalBalances();
        if (typeof renderUsersList === 'function') renderUsersList();
        if (typeof updateHeaderName === 'function') updateHeaderName();
        if (typeof loadFontSettings === 'function') loadFontSettings();

        // 4. جلب العمليات
        const dbTransactions = await DB_API.getAllTransactions();
        if (dbTransactions && dbTransactions.length > 0) {
            console.log(`📊 تم العثور على ${dbTransactions.length} عملية في قاعدة البيانات`);
        }
        
        showToast('✅ تم مزامنة البيانات بنجاح', 'success');
    } else {
        console.log('⚠️ العمل في وضع localStorage فقط');
        showToast('⚠️ قاعدة البيانات غير متصلة - استخدام التخزين المحلي', 'warning');
    }
});

// دالة محسّنة للحفظ تستخدم كلاً من localStorage وقاعدة البيانات
async function saveToStorageEnhanced() {
    const date = dateInput.value;
    if (!date) return;

    const dataToSave = {
        records: records,
        eggBalance: $('eggBalance') ? $('eggBalance').value : ''
    };

    // 1. حفظ في localStorage
    localStorage.setItem('acc_' + date, JSON.stringify(dataToSave));

    // 2. حفظ في قاعدة البيانات
    if (DB_API.isConnected) {
        for (const record of records) {
            await DB_API.saveTransaction(record);
        }
    }

    if (typeof beep === 'function') beep(1000, 0.04, 0.06);
}

// دالة محسّنة للتحميل تحاول قاعدة البيانات أولاً
async function loadFromStorageEnhanced() {
    const date = dateInput.value;
    if (!date) return;

    // محاولة جلب من قاعدة البيانات أولاً
    if (DB_API.isConnected) {
        const dbData = await DB_API.getAllTransactions();
        if (dbData && dbData.length > 0) {
            const dateRecords = dbData.filter(r => {
                if (!r.timestamp) return false;
                const recordDate = r.timestamp.split('T')[0];
                return recordDate === date;
            });

            if (dateRecords.length > 0) {
                records = dateRecords;
                render();
                console.log(`✅ تم تحميل ${dateRecords.length} عملية من قاعدة البيانات`);
                return;
            }
        }
    }

    // الرجوع إلى localStorage
    const raw = localStorage.getItem('acc_' + date);
    if (raw) {
        try {
            const data = JSON.parse(raw);
            records = Array.isArray(data) ? data : (data.records || []);
            render();
            console.log(`📂 تم تحميل ${records.length} عملية من localStorage`);
        } catch (e) {
            console.error('خطأ في تحليل البيانات:', e);
            records = [];
        }
    } else {
        records = [];
        render();
    }
}
