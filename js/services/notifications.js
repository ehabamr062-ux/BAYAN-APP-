// ============================================================
//  Bayan POS Pro — Smart Notifications & Dues Engine
//  js/services/notifications.js (Design System 2.0)
// ============================================================

(function () {
    'use strict';

    const KEYWORDS_REGEX = /(?:لنا|علينا|باقي|دين|مديون|مطلوب|سداد|قسط|آجل|اجل|شيك|تذكير|عهدة|امانة|أمانة|استحقاق|حساب|سلفة|مستحق)/i;

    const BayanNotifications = {
        items: [],
        activeTab: 'pending', // 'pending' = الوارد | 'received' = المستلمة
        isLoaded: false,

        // ---------------- 1. التهيئة الأولية (Initialization) ----------------
        async init() {
            try {
                if (window.BayanDB && typeof window.BayanDB.getNotifications === 'function') {
                    this.items = await window.BayanDB.getNotifications();
                } else {
                    const raw = localStorage.getItem('acc_bayan_notifications');
                    this.items = raw ? JSON.parse(raw) : [];
                }
            } catch (e) {
                console.warn('⚠️ Error initializing notifications:', e);
                this.items = [];
            }
            this.isLoaded = true;
            this.updateBadge();

            // فحص أولي للملاحظات المحفوظة عند الإقلاع
            setTimeout(() => {
                this.scanStoredDataOnStartup();
            }, 600);
        },

        // ---------------- 2. تحديث عداد البادج على أيقونة الجرس ----------------
        updateBadge() {
            const pendingList = this.items.filter(n => n.status === 'pending');
            const count = pendingList.length;

            const badge = document.getElementById('notificationBadge');
            const bellTile = document.getElementById('notificationBellTile');

            if (badge) {
                if (count > 0) {
                    badge.classList.add('visible');
                    badge.textContent = count > 99 ? '99+' : count;
                    badge.classList.remove('pulse');
                    // إعادة تشغيل أنيميشن النبض
                    void badge.offsetWidth;
                    badge.classList.add('pulse');
                } else {
                    badge.classList.remove('visible');
                    badge.textContent = '0';
                }
            }

            if (bellTile) {
                if (count > 0) {
                    bellTile.classList.add('has-unread');
                    bellTile.setAttribute('title', `مركز الإشعارات: لديك ${count} تنبيه وارد`);
                } else {
                    bellTile.classList.remove('has-unread');
                    bellTile.setAttribute('title', 'مركز الإشعارات والتنبيهات الذكية (لا توجد تنبيهات جديدة)');
                }
            }

            // تحديث أرقام التبويبات في حال كانت النافذة مفتوحة
            const pendingCountEl = document.getElementById('notifTabCountPending');
            const receivedCountEl = document.getElementById('notifTabCountReceived');
            if (pendingCountEl) {
                pendingCountEl.textContent = count;
                if (count > 0) pendingCountEl.classList.add('count-danger');
                else pendingCountEl.classList.remove('count-danger');
            }
            if (receivedCountEl) {
                const receivedCount = this.items.filter(n => n.status === 'received').length;
                receivedCountEl.textContent = receivedCount;
            }
        },

        // ---------------- 3. فحص العمليات والملاحظات (Smart Scanner) ----------------
        detectType(text) {
            if (!text) return 'reminder';
            if (text.includes('لنا') || text.includes('له')) return 'lana';
            if (text.includes('علينا') || text.includes('عليه') || text.includes('دين') || text.includes('مديون') || text.includes('مطلوب') || text.includes('باقي') || text.includes('آجل') || text.includes('اجل')) return 'alayna';
            return 'reminder';
        },

        getTypeTitle(type) {
            switch (type) {
                case 'lana': return 'مستحق لنا 🟢';
                case 'alayna': return 'مطلوب علينا 🔴';
                default: return 'تنبيه بملاحظة 📌';
            }
        },

        // فحص عملية مفردة (عند الإضافة أو التعديل)
        async scanTransaction(op, dateStr) {
            if (!op || !op.notes || !KEYWORDS_REGEX.test(op.notes)) return null;

            const opId = op.id || ('tx_' + Date.now());
            const notifId = 'notif_op_' + opId;
            const notifType = this.detectType(op.notes);
            const amount = op.bottom || op.top || op.cashSold || 0;

            const existingIdx = this.items.findIndex(n => n.id === notifId);
            if (existingIdx >= 0) {
                const existing = this.items[existingIdx];
                // إذا تم استلامه من قبل، لا نرجعه لوارد إلا إذا رغب المستخدم
                existing.text = op.notes;
                existing.category = op.category || '';
                existing.amount = amount;
                existing.date = dateStr || op.date || existing.date;
                existing.type = notifType;
                existing.title = this.getTypeTitle(notifType);
                if (window.BayanDB && typeof window.BayanDB.saveNotification === 'function') {
                    await window.BayanDB.saveNotification(existing);
                }
                return existing;
            }

            // إنشاء إشعار جديد بحالة "وارد" (pending)
            const newNotif = {
                id: notifId,
                sourceId: opId,
                sourceType: 'transaction',
                type: notifType,
                title: this.getTypeTitle(notifType),
                text: op.notes,
                category: op.category || '',
                amount: amount,
                date: dateStr || op.date || (new Date().toISOString().slice(0, 10)),
                timestamp: op.timestamp ? new Date(op.timestamp).getTime() : Date.now(),
                status: 'pending',
                receivedAt: null
            };

            this.items.unshift(newNotif);
            if (window.BayanDB && typeof window.BayanDB.saveNotification === 'function') {
                await window.BayanDB.saveNotification(newNotif);
            }
            this.updateBadge();
            return newNotif;
        },

        // فحص مصفوفة عمليات دفعة واحدة
        async scanTransactionsList(records, dateStr) {
            if (!Array.isArray(records) || records.length === 0) return;
            for (const r of records) {
                await this.scanTransaction(r, dateStr);
            }
            this.updateBadge();
        },

        // فحص الملاحظات العامة في دفتر الملاحظات (App Notes)
        async scanAppNotes(notesText, dateStr) {
            if (!notesText || typeof notesText !== 'string') return;
            const lines = notesText.split('\n');
            let hasNew = false;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line && KEYWORDS_REGEX.test(line)) {
                    // توليد معرف ثابت للسطر
                    let lineHash = 0;
                    for (let c = 0; c < line.length; c++) {
                        lineHash = ((lineHash << 5) - lineHash) + line.charCodeAt(c);
                        lineHash |= 0;
                    }
                    const notifId = 'notif_note_' + Math.abs(lineHash);
                    const notifType = this.detectType(line);

                    const existing = this.items.find(n => n.id === notifId);
                    if (!existing) {
                        const newNotif = {
                            id: notifId,
                            sourceId: 'note_line_' + i,
                            sourceType: 'app_notes',
                            type: notifType,
                            title: this.getTypeTitle(notifType),
                            text: line,
                            category: 'دفتر الملاحظات',
                            amount: 0,
                            date: dateStr || (new Date().toISOString().slice(0, 10)),
                            timestamp: Date.now(),
                            status: 'pending',
                            receivedAt: null
                        };
                        this.items.unshift(newNotif);
                        if (window.BayanDB && typeof window.BayanDB.saveNotification === 'function') {
                            await window.BayanDB.saveNotification(newNotif);
                        }
                        hasNew = true;
                    }
                }
            }

            if (hasNew) this.updateBadge();
        },

        // فحص البيانات المخزنة عند الإقلاع لمزامنة أي ملاحظات سابقة
        async scanStoredDataOnStartup() {
            try {
                // فحص عمليات اليوم الحالية
                if (Array.isArray(window.records) && window.records.length > 0) {
                    const curDate = document.getElementById('dateInput')?.value;
                    await this.scanTransactionsList(window.records, curDate);
                }

                // فحص دفتر الملاحظات العام
                const globalNotes = localStorage.getItem('acc_app_notes_global') || localStorage.getItem('acc_app_notes');
                if (globalNotes) {
                    await this.scanAppNotes(globalNotes);
                }
            } catch (e) {
                console.warn('Startup scan error:', e);
            }
        },

        // ---------------- 4. إجراءات الاستلام والمعالجة (Acknowledgment) ----------------
        // استلام إشعار مفرد وإنقاص العداد فوراً
        async markReceived(id) {
            const item = this.items.find(n => n.id === id);
            if (!item) return;

            item.status = 'received';
            item.receivedAt = new Date().toISOString();

            // 1. صوت تأكيد مريح
            if (typeof window.beep === 'function') {
                window.beep(850, 0.04, 0.05);
                setTimeout(() => window.beep(1200, 0.06, 0.08), 55);
            }

            // 2. تحديث IndexedDB
            if (window.BayanDB && typeof window.BayanDB.markNotificationReceived === 'function') {
                await window.BayanDB.markNotificationReceived(id);
            }

            // 3. إنقاص العداد وتحديث البادج فوراً
            this.updateBadge();

            // 4. تأثير حركي لاختفاء الكارت من خانة الوارد
            const cardEl = document.getElementById('notif-card-' + id);
            if (cardEl) {
                cardEl.classList.add('slide-out');
                setTimeout(() => {
                    cardEl.remove();
                    this.checkEmptyList();
                }, 320);
            }

            if (typeof window.showToast === 'function') {
                window.showToast('✅ تم استلام ومعالجة الإشعار ونقله للأرشيف', 'success');
            }
        },

        // استلام كافة الإشعارات دفعة واحدة
        async markAllReceived() {
            const pendingList = this.items.filter(n => n.status === 'pending');
            if (pendingList.length === 0) return;

            const now = new Date().toISOString();
            for (const item of pendingList) {
                item.status = 'received';
                item.receivedAt = now;
                if (window.BayanDB && typeof window.BayanDB.markNotificationReceived === 'function') {
                    await window.BayanDB.markNotificationReceived(item.id);
                }
            }

            if (typeof window.beep === 'function') {
                window.beep(1000, 0.05, 0.08);
            }

            this.updateBadge();
            this.renderTabContent();

            if (typeof window.showToast === 'function') {
                window.showToast('🎉 تم استلام ومعالجة جميع الإشعارات بنجاح', 'success');
            }
        },

        // استعادة إشعار من الأرشيف إلى الوارد
        async restoreNotification(id) {
            const item = this.items.find(n => n.id === id);
            if (!item) return;

            item.status = 'pending';
            item.receivedAt = null;

            if (window.BayanDB && typeof window.BayanDB.restoreNotification === 'function') {
                await window.BayanDB.restoreNotification(id);
            }

            this.updateBadge();
            this.renderTabContent();

            if (typeof window.showToast === 'function') {
                window.showToast('↩️ تم إعادة التنبيه إلى قائمة الوارد', 'info');
            }
        },

        // حذف إشعار نهائياً
        async deleteNotification(id) {
            this.items = this.items.filter(n => n.id !== id);
            if (window.BayanDB && typeof window.BayanDB.deleteNotification === 'function') {
                await window.BayanDB.deleteNotification(id);
            }
            this.updateBadge();
            this.renderTabContent();
        },

        // مسح الأرشيف المستلم بالكامل
        async clearArchive() {
            this.items = this.items.filter(n => n.status !== 'received');
            if (window.BayanDB && typeof window.BayanDB.clearReceivedNotifications === 'function') {
                await window.BayanDB.clearReceivedNotifications();
            }
            this.updateBadge();
            this.renderTabContent();

            if (typeof window.showToast === 'function') {
                window.showToast('🗑️ تم تفريغ أرشيف الإشعارات المستلمة', 'info');
            }
        },

        // ---------------- 5. نافذة الإشعارات ذات الخانتين (Dual-Tab Modal) ----------------
        openModal() {
            // إزالة أي نافذة إشعارات سابقة إن وجدت
            const oldModal = document.getElementById('bayanNotificationsModal');
            if (oldModal) oldModal.remove();

            const pendingCount = this.items.filter(n => n.status === 'pending').length;
            const receivedCount = this.items.filter(n => n.status === 'received').length;

            const modalHtml = `
            <div id="bayanNotificationsModal" class="modal-overlay" onclick="if(event.target === this) window.BayanNotifications.closeModal()">
                <div class="notif-modal-box" onclick="event.stopPropagation()">
                    
                    <!-- Modal Header -->
                    <div class="notif-modal-header">
                        <div class="notif-header-title-group">
                            <div class="notif-header-icon-circle">
                                <i class="fa-solid fa-bell"></i>
                            </div>
                            <div class="notif-header-text">
                                <h3>مركز الإشعارات والتنبيهات الذكية</h3>
                                <p>متابعة الديون، المستحقات (لنا / علينا)، والتنبيهات المستخرجة من الملاحظات</p>
                            </div>
                        </div>
                        <button class="btn ghost" onclick="window.BayanNotifications.closeModal()" title="إغلاق" 
                            style="color:#ef4444; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-weight: bold;">
                            ✕
                        </button>
                    </div>

                    <!-- Dual-Tab Switches (الخانتين) -->
                    <div class="notif-tabs-bar">
                        <button id="btnNotifTabPending" class="notif-tab-btn ${this.activeTab === 'pending' ? 'active' : ''}" onclick="window.BayanNotifications.switchTab('pending')">
                            <span>📥 الإشعارات الواردة</span>
                            <span id="notifTabCountPending" class="notif-tab-count ${pendingCount > 0 ? 'count-danger' : ''}">${pendingCount}</span>
                        </button>
                        <button id="btnNotifTabReceived" class="notif-tab-btn ${this.activeTab === 'received' ? 'active' : ''}" onclick="window.BayanNotifications.switchTab('received')">
                            <span>📦 الإشعارات المستلمة (الأرشيف)</span>
                            <span id="notifTabCountReceived" class="notif-tab-count">${receivedCount}</span>
                        </button>
                    </div>

                    <!-- Dynamic Tab Body Container -->
                    <div id="notifTabBodyArea"></div>

                </div>
            </div>`;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
            document.body.classList.add('modal-open');
            this.renderTabContent();
        },

        closeModal() {
            const modal = document.getElementById('bayanNotificationsModal');
            if (modal) modal.remove();
            document.body.classList.remove('modal-open');
        },

        switchTab(tabName) {
            this.activeTab = tabName;

            const btnPending = document.getElementById('btnNotifTabPending');
            const btnReceived = document.getElementById('btnNotifTabReceived');

            if (btnPending && btnReceived) {
                if (tabName === 'pending') {
                    btnPending.classList.add('active');
                    btnReceived.classList.remove('active');
                } else {
                    btnReceived.classList.add('active');
                    btnPending.classList.remove('active');
                }
            }

            this.renderTabContent();
        },

        renderTabContent() {
            const container = document.getElementById('notifTabBodyArea');
            if (!container) return;

            const currentList = this.items.filter(n => n.status === this.activeTab);

            if (this.activeTab === 'pending') {
                // الخانة 1: الإشعارات الواردة
                container.innerHTML = `
                    <div class="notif-tab-toolbar">
                        <span class="notif-tab-hint">💡 اضغط "استلام" على أي إشعار تم سداده أو معالجته لتقليل الرقم على الجرس</span>
                        ${currentList.length > 0 ? `
                            <button class="btn-notif-action-sm btn-receive-all" onclick="window.BayanNotifications.markAllReceived()">
                                <i class="fa-solid fa-check-double"></i> استلام الكل (${currentList.length})
                            </button>
                        ` : ''}
                    </div>
                    <div class="notif-list-container" id="notifListContainer">
                        ${currentList.length === 0 ? this.getEmptyStateHtml('pending') : currentList.map(n => this.renderCardHtml(n)).join('')}
                    </div>
                `;
            } else {
                // الخانة 2: الإشعارات المستلمة (الأرشيف)
                container.innerHTML = `
                    <div class="notif-tab-toolbar">
                        <span class="notif-tab-hint">سجل الإشعارات والديون التي تمت معالجتها واستلامها</span>
                        ${currentList.length > 0 ? `
                            <button class="btn-notif-action-sm btn-clear-archive" onclick="window.BayanNotifications.clearArchive()">
                                <i class="fa-solid fa-trash-can"></i> مسح الأرشيف
                            </button>
                        ` : ''}
                    </div>
                    <div class="notif-list-container" id="notifListContainer">
                        ${currentList.length === 0 ? this.getEmptyStateHtml('received') : currentList.map(n => this.renderCardHtml(n)).join('')}
                    </div>
                `;
            }
        },

        renderCardHtml(item) {
            const isPending = item.status === 'pending';
            const formattedAmount = item.amount ? (Number(item.amount).toLocaleString('ar-EG') + ' ج.م') : '';
            const tagClass = item.type === 'lana' ? 'tag-lana' : (item.type === 'alayna' ? 'tag-alayna' : 'tag-reminder');
            const cardTypeClass = item.type === 'lana' ? 'type-lana' : (item.type === 'alayna' ? 'type-alayna' : 'type-reminder');

            let dateDisplay = item.date || '';
            let timeDisplay = '';
            if (item.timestamp) {
                const d = new Date(item.timestamp);
                let hrs = d.getHours();
                const ampm = hrs >= 12 ? 'م' : 'ص';
                hrs = hrs % 12 || 12;
                const m = String(d.getMinutes()).padStart(2, '0');
                timeDisplay = `${hrs}:${m} ${ampm}`;
            }

            let receivedTimeDisplay = '';
            if (item.receivedAt) {
                const rd = new Date(item.receivedAt);
                receivedTimeDisplay = rd.toLocaleDateString('ar-EG') + ' ' + rd.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
            }

                const safeTitle = typeof escapeHtml === 'function' ? escapeHtml(item.title) : String(item.title || '');
                const safeCategory = typeof escapeHtml === 'function' ? escapeHtml(item.category) : String(item.category || '');
                return `
            <div class="notif-card ${cardTypeClass}" id="notif-card-${item.id}">
                <div class="notif-card-header">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="notif-type-tag ${tagClass}">${safeTitle}</span>
                        ${item.category ? `<span style="font-size:12px; color:#94a3b8; font-weight:700;">البند: <b style="color:#f8fafc;">${safeCategory}</b></span>` : ''}
                    </div>
                    <div class="notif-meta-group">
                        ${formattedAmount ? `<span class="notif-amount-chip">${formattedAmount}</span>` : ''}
                        <span>📅 ${dateDisplay}</span>
                        ${timeDisplay ? `<span>🕒 ${timeDisplay}</span>` : ''}
                    </div>
                </div>

                <div class="notif-body-text">
                    ${this.highlightKeywords(item.text)}
                </div>

                <div class="notif-card-footer">
                    <div>
                        ${!isPending ? `
                            <span class="notif-received-badge">
                                <i class="fa-solid fa-circle-check"></i> تم الاستلام: ${receivedTimeDisplay}
                            </span>
                        ` : `
                            <span style="font-size:11.5px; color:#64748b;">معلق بحاجة لمعالجة</span>
                        `}
                    </div>

                    <div style="display:flex; gap:8px; align-items:center;">
                        ${isPending ? `
                            <button class="btn-notif-receive" onclick="window.BayanNotifications.markReceived('${item.id}')">
                                <i class="fa-solid fa-check"></i> استلام (تم المعالجة)
                            </button>
                        ` : `
                            <button class="btn-notif-restore" onclick="window.BayanNotifications.restoreNotification('${item.id}')" title="إعادة التنبيه إلى قائمة الوارد">
                                ↩️ إعادة للوارد
                            </button>
                            <button class="btn-notif-del" onclick="window.BayanNotifications.deleteNotification('${item.id}')" title="حذف نهائي">
                                🗑️
                            </button>
                        `}
                    </div>
                </div>
            </div>`;
        },

        highlightKeywords(text) {
            if (!text) return '';
            const safe = String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            return safe.replace(/(لنا|علينا|باقي|دين|مديون|مطلوب|سداد|قسط|آجل|اجل|شيك|تذكير|عهدة|امانة|أمانة|استحقاق|حساب|سلفة|مستحق)/gi, (m) => {
                return `<b style="color: #38bdf8; text-decoration: underline; background: rgba(56, 189, 248, 0.15); padding: 1px 4px; border-radius: 4px;">${m}</b>`;
            });
        },

        getEmptyStateHtml(tab) {
            if (tab === 'pending') {
                return `
                <div class="notif-empty-state">
                    <div class="notif-empty-icon">🎉</div>
                    <div class="notif-empty-text">لا توجد إشعارات أو ديون معلقة حالياً!</div>
                    <div class="notif-empty-sub">أي عملية تكتب فيها ملاحظة مثل (لنا، علينا، دين، باقي...) ستظهر هنا تلقائياً.</div>
                </div>`;
            } else {
                return `
                <div class="notif-empty-state">
                    <div class="notif-empty-icon">📦</div>
                    <div class="notif-empty-text">أرشيف الإشعارات المستلمة فارغ</div>
                    <div class="notif-empty-sub">الإشعارات التي تضغط عليها "استلام" ستُحفظ هنا كسجل تاريخي.</div>
                </div>`;
            }
        },

        checkEmptyList() {
            const container = document.getElementById('notifListContainer');
            if (!container) return;
            const remainingCards = container.querySelectorAll('.notif-card:not(.slide-out)');
            if (remainingCards.length === 0) {
                container.innerHTML = this.getEmptyStateHtml(this.activeTab);
            }
        }
    };

    // إتاحة الكائن عالمياً
    window.BayanNotifications = BayanNotifications;
    window.toggleNotificationsModal = function () {
        BayanNotifications.openModal();
    };

    // تشغيل المحرك عند جاهزية الصفحة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => BayanNotifications.init());
    } else {
        BayanNotifications.init();
    }
})();
