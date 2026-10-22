// Layout Mode Toggle Script
        let currentLayoutMode = localStorage.getItem('acc_layout_mode') || 'auto';

        window.toggleLayoutMode = function toggleLayoutMode() {
            if (currentLayoutMode === 'auto' || currentLayoutMode === 'mobile') {
                currentLayoutMode = 'desktop';
            } else {
                currentLayoutMode = 'mobile';
            }
            localStorage.setItem('acc_layout_mode', currentLayoutMode);
            applyLayoutMode(true);
            if (typeof beep === 'function') beep(1000, 0.04, 0.06);
        };
        const toggleLayoutMode = window.toggleLayoutMode;

        window.applyLayoutMode = function applyLayoutMode(notify = false) {
            const metaViewport = document.querySelector('meta[name="viewport"]');
            const tile = document.getElementById('layoutToggleTile');
            const icon = document.getElementById('layoutToggleIcon') || tile?.querySelector('i');

            if (currentLayoutMode === 'desktop') {
                if (metaViewport) metaViewport.setAttribute('content', 'width=1200, initial-scale=0.35, viewport-fit=cover');
                document.body.classList.add('force-desktop');
                document.body.classList.remove('force-mobile');

                if (tile) tile.title = 'وضع الكمبيوتر (اضغط للعودة للموبايل)';
                if (icon) icon.className = 'fa-solid fa-desktop';
                if (notify && typeof showToast === 'function') {
                    showToast('💻 تم التبديل إلى وضع عرض الكمبيوتر', 'success');
                }
            } else {
                if (metaViewport) metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
                document.body.classList.add('force-mobile');
                document.body.classList.remove('force-desktop');

                if (tile) tile.title = 'وضع الموبايل (اضغط للتبديل للكمبيوتر)';
                if (icon) icon.className = 'fa-solid fa-mobile-screen-button';
                if (notify && typeof showToast === 'function') {
                    showToast('📱 تم التبديل إلى وضع عرض الهاتف', 'info');
                }
            }
        };
        const applyLayoutMode = window.applyLayoutMode;

        // Apply layout initially
        applyLayoutMode(false);
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => applyLayoutMode(false));
        }

        // ============================================================
        // 🔑 Serial Code & Cloud QR Modal System (Bayan POS Pro)
        // ============================================================
        window.showSerialQrModal = function showSerialQrModal() {
            const existing = document.getElementById('serial-qr-modal-overlay');
            if (existing) existing.remove();

            const serial = (localStorage.getItem('app_auth_serial') || '').trim();
            const storeName = localStorage.getItem('acc_user_name') || 'بيان POS Pro';

            const overlay = document.createElement('div');
            overlay.id = 'serial-qr-modal-overlay';
            overlay.className = 'modal-overlay';
            overlay.style.zIndex = '999999';
            overlay.style.backdropFilter = 'blur(16px)';
            overlay.style.webkitBackdropFilter = 'blur(16px)';
            overlay.onclick = function(e) {
                if (e.target === overlay) overlay.remove();
            };

            const esc = typeof escapeHtml === 'function' ? escapeHtml : (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

            overlay.innerHTML = `
                <div class="modal-box" style="max-width: 440px; width: 92%; background: linear-gradient(145deg, #0f172a 0%, #1e293b 100%); border: 2px solid rgba(245, 158, 11, 0.45); border-radius: 26px; box-shadow: 0 25px 60px rgba(0,0,0,0.85), 0 0 30px rgba(245, 158, 11, 0.2); padding: 0; overflow: hidden; color: #fff; direction: rtl; font-family: inherit; animation: modalScaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                    
                    <!-- Modal Header -->
                    <div style="background: linear-gradient(90deg, #1e293b, #0f172a); padding: 18px 22px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); display: flex; align-items: center; justify-content: center; font-size: 20px; color: #fbbf24;">🔑</div>
                            <div>
                                <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #f59e0b;">كود السيريال والباركود السحابي</h3>
                                <span style="font-size: 11.5px; color: #94a3b8;">${esc(storeName)}</span>
                            </div>
                        </div>
                        <button type="button" class="btn ghost" style="color: #f87171; background: rgba(239, 68, 68, 0.1); border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(239, 68, 68, 0.2); cursor: pointer; font-size: 16px;" onclick="document.getElementById('serial-qr-modal-overlay').remove()">✕</button>
                    </div>

                    <!-- Modal Body -->
                    <div style="padding: 22px; text-align: center;">
                        
                        <!-- Serial Display & Copy -->
                        <div style="background: rgba(0, 0, 0, 0.35); border: 1.5px dashed rgba(245, 158, 11, 0.4); border-radius: 16px; padding: 14px 16px; margin-bottom: 20px;">
                            <div style="font-size: 12px; color: #cbd5e1; margin-bottom: 8px; font-weight: 700;">كود السيريال الخاص بك (Serial Code)</div>
                            <div id="serialDisplayBox" style="font-family: 'Consolas', monospace; font-size: 17px; font-weight: 900; letter-spacing: 1.5px; color: #fbbf24; word-break: break-all; margin-bottom: 12px; user-select: all; background: rgba(251, 191, 36, 0.08); padding: 8px 12px; border-radius: 10px;">
                                ${serial ? esc(serial) : '<span style="color:#f87171; font-size:14px;">لم يتم تسجيل كود سيريال بعد</span>'}
                            </div>
                            <button type="button" id="copySerialBtn" onclick="window.copyCurrentSerialCode()" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #000; border: none; padding: 9px 18px; border-radius: 12px; font-weight: 900; font-size: 13.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.35); font-family: inherit;">
                                <i class="fa-solid fa-copy"></i>
                                <span id="copySerialBtnText">نسخ كود السيريال</span>
                            </button>
                        </div>

                        <!-- QR Code Display Box -->
                        <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 20px;">
                            <div style="background: #ffffff; padding: 14px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(245, 158, 11, 0.25); border: 3px solid rgba(245, 158, 11, 0.5); display: inline-block;">
                                <div id="serialQrCodeContainer" style="width: 190px; height: 190px; display: flex; align-items: center; justify-content: center;"></div>
                            </div>
                            <p style="font-size: 12px; color: #94a3b8; margin-top: 12px; line-height: 1.5; max-width: 320px;">
                                امسح الباركود بكاميرا الموبايل لربط الحساب ومزامنة الفواتير لحظياً 📱⚡
                            </p>
                        </div>

                        <!-- Action Buttons: Download & WhatsApp -->
                        <div style="display: flex; gap: 10px;">
                            <button type="button" onclick="window.downloadSerialQrImage()" style="flex: 1; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: #fff; border: none; padding: 12px; border-radius: 14px; font-weight: 800; font-size: 13.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 15px rgba(14, 165, 233, 0.35); font-family: inherit;">
                                <i class="fa-solid fa-download"></i>
                                <span>حفظ وتنزيل الباركود 💾</span>
                            </button>
                            <button type="button" onclick="window.shareSerialViaWhatsApp()" style="background: rgba(37, 211, 102, 0.15); border: 1.5px solid rgba(37, 211, 102, 0.4); color: #25d366; padding: 12px 16px; border-radius: 14px; font-weight: 800; font-size: 13.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-family: inherit;" title="مشاركة السيريال عبر واتساب">
                                <i class="fa-brands fa-whatsapp" style="font-size: 17px;"></i>
                                <span>واتساب</span>
                            </button>
                        </div>

                    </div>

                    <!-- Footer note -->
                    <div style="background: rgba(0, 0, 0, 0.25); border-top: 1px solid rgba(255, 255, 255, 0.05); padding: 10px 18px; font-size: 11.5px; color: #94a3b8; text-align: center;">
                        🔒 هذا السيريال والباركود خاص ببيانات ومزامنة محلك، احتفظ به وشاركه فقط مع أجهزتك.
                    </div>

                </div>
            `;

            document.body.appendChild(overlay);
            if (typeof beep === 'function') beep(1100, 0.03, 0.05);

            // Generate the QR code dynamically
            setTimeout(() => {
                const qrContainer = document.getElementById('serialQrCodeContainer');
                if (!qrContainer) return;
                qrContainer.innerHTML = '';

                if (!serial) {
                    qrContainer.innerHTML = '<span style="color:#ef4444; font-size:12px; font-weight:bold;">لا يوجد كود سيريال للتوليد</span>';
                    return;
                }

                if (typeof QRCode !== 'undefined') {
                    try {
                        new QRCode(qrContainer, {
                            text: serial,
                            width: 190,
                            height: 190,
                            colorDark: "#0f172a",
                            colorLight: "#ffffff",
                            correctLevel: (typeof QRCode.CorrectLevel !== 'undefined' ? QRCode.CorrectLevel.H : 2)
                        });
                    } catch (err) {
                        console.error('QR Generate Error:', err);
                        qrContainer.innerHTML = '<span style="color:#ef4444; font-size:12px;">تعذر رسم الباركود</span>';
                    }
                } else {
                    qrContainer.innerHTML = '<span style="color:#fbbf24; font-size:12px;">جاري تحميل محرك الباركود...</span>';
                }
            }, 80);
        };

        window.copyCurrentSerialCode = function copyCurrentSerialCode() {
            const serial = (localStorage.getItem('app_auth_serial') || '').trim();
            if (!serial) {
                if (typeof showToast === 'function') showToast('⚠️ لا يوجد كود سيريال مسجل حالياً لنسخه', 'warning');
                return;
            }

            const onSuccess = () => {
                const btnText = document.getElementById('copySerialBtnText');
                if (btnText) {
                    btnText.textContent = 'تم النسخ بنجاح ✅';
                    setTimeout(() => {
                        if (btnText) btnText.textContent = 'نسخ كود السيريال';
                    }, 2500);
                }
                if (typeof showToast === 'function') {
                    showToast('📋 تم نسخ كود السيريال إلى الحافظة بنجاح!', 'success');
                }
                if (typeof beep === 'function') beep(1400, 0.04, 0.06);
            };

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(serial).then(onSuccess).catch(() => {
                    fallbackCopy();
                });
            } else {
                fallbackCopy();
            }

            function fallbackCopy() {
                const tempInp = document.createElement('input');
                tempInp.value = serial;
                document.body.appendChild(tempInp);
                tempInp.select();
                document.execCommand('copy');
                document.body.removeChild(tempInp);
                onSuccess();
            }
        };

        window.downloadSerialQrImage = function downloadSerialQrImage() {
            const container = document.getElementById('serialQrCodeContainer');
            if (!container) return;

            let dataUrl = '';
            const canvas = container.querySelector('canvas');
            if (canvas) {
                dataUrl = canvas.toDataURL('image/png');
            } else {
                const img = container.querySelector('img');
                if (img && img.src) dataUrl = img.src;
            }

            if (!dataUrl) {
                if (typeof showToast === 'function') showToast('⚠️ تعذر استخراج صورة الباركود للتنزيل', 'warning');
                return;
            }

            const serial = (localStorage.getItem('app_auth_serial') || 'bayan').trim();
            const link = document.createElement('a');
            link.download = `bayan_serial_qr_${serial}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            if (typeof showToast === 'function') {
                showToast('💾 تم حفظ وتنزيل صورة الباركود بنجاح!', 'success');
            }
            if (typeof beep === 'function') beep(1200, 0.03, 0.05);
        };

        window.shareSerialViaWhatsApp = function shareSerialViaWhatsApp() {
            const serial = (localStorage.getItem('app_auth_serial') || '').trim();
            const storeName = localStorage.getItem('acc_user_name') || 'بيان POS Pro';
            if (!serial) {
                if (typeof showToast === 'function') showToast('⚠️ لا يوجد كود سيريال مسجل للمشاركة', 'warning');
                return;
            }

            const message = `🔑 *كود السيريال والمزامنة السحابية - ${storeName}*\n\nكود السيريال الخاص بك:\n\`${serial}\`\n\nقم بنسخ هذا الكود واستخدامه في تطبيق الموبايل (بيان لايت) لربط الحساب والمزامنة اللحظية.`;
            const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
        };

        // External Balances Logic
        window.renderExternalBalances = function() {
            const extToMe = parseFloat(localStorage.getItem('acc_ext_tome')) || 0;
            const extByMe = parseFloat(localStorage.getItem('acc_ext_byme')) || 0;
            const fmt = (n) => typeof formatNum === 'function' ? formatNum(n) : Number(n).toLocaleString('en-US');
            if (document.getElementById('extOwedToMe')) document.getElementById('extOwedToMe').textContent = fmt(extToMe);
            if (document.getElementById('extOwedByMe')) document.getElementById('extOwedByMe').textContent = fmt(extByMe);
        };
        const renderExternalBalances = window.renderExternalBalances;

        window.showExternalBalancesModal = function showExternalBalancesModal() {
            const extToMe = localStorage.getItem('acc_ext_tome') || 0;
            const extByMe = localStorage.getItem('acc_ext_byme') || 0;

            // Remove existing overlay if any
            const existing = document.querySelector('.ext-balances-modal-overlay');
            if (existing) existing.remove();

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay ext-balances-modal-overlay';
            overlay.style.zIndex = '999999';
            overlay.innerHTML = `
            <div class="modal-box" style="max-width: 450px; background: linear-gradient(145deg, #1e3a8a, #0f172a); border: 2px solid #3b82f6; box-shadow: 0 10px 40px rgba(0,0,0,0.6); color: #fff;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 15px;">
                    <h3 style="margin:0; font-size: 18px; display:flex; align-items:center; gap:8px;"><span style="font-size:24px;">💳</span> إدارة الحسابات الخارجية</h3>
                    <button class="btn ghost" style="color:#ef4444; background: rgba(239, 68, 68, 0.1); padding:8px; border-radius:50%;" onclick="document.body.removeChild(this.closest('.modal-overlay'))"><img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLXgiPjxsaW5lIHgxPSIxOCIgeDI9IjYiIHkxPSI2IiB5Mj0iMTgiLz48bGluZSB4MT0iNiIgeDI9IjE4IiB5MT0iNiIgeTI9IjE4Ii8+PC9zdmc+" class="icon" style="margin:0;"></button>
                </div>

                <div style="margin-bottom: 20px; text-align: right;">
                    <p style="font-size:13px; color:#93c5fd; margin-bottom:15px; line-height:1.6;">هذا القسم يتيح لك متابعة المبالغ الإجمالية التي <b>لك</b> أو <b>عليك</b> من تطبيقات أو جهات أخرى، كملخص عام لحسابك الخارجي.</p>
                    
                    <div style="display:flex; gap:10px; margin-bottom: 15px;">
                        <div style="flex:1;">
                            <label style="font-size:12px; color:#4ade80; font-weight:bold;">المبلغ (له) لك ⬆️</label>
                            <input type="number" id="manualToMeInput" value="${extToMe}" style="width:100%; padding: 12px; border-radius: 8px; border: 1px solid #4ade80; background: rgba(0,0,0,0.3); color: #fff; font-size:16px; margin-top:5px;">
                        </div>
                        <div style="flex:1;">
                            <label style="font-size:12px; color:#f87171; font-weight:bold;">المبلغ (عليه) دين ⬇️</label>
                            <input type="number" id="manualByMeInput" value="${extByMe}" style="width:100%; padding: 12px; border-radius: 8px; border: 1px solid #f87171; background: rgba(0,0,0,0.3); color: #fff; font-size:16px; margin-top:5px;">
                        </div>
                    </div>
                    <button class="btn green" onclick="saveManualExternalBalances()" style="width:100%; padding: 12px; font-weight:bold; font-size:15px;">💾 حفظ الأرقام يدوياً</button>
                </div>

                <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; text-align: center; background: rgba(0,0,0,0.2); border-radius: 12px; padding: 15px; margin-top: 10px;">
                    <h4 style="margin: 0 0 10px 0; color: #93c5fd;">📊 أو تحديث عبر ملف إكسل </h4>
                    <p style="font-size: 11px; color: var(--muted); margin-bottom: 15px; line-height: 1.5;">سنقوم بجمع القيم. يجب أن يحتوي الملف على أعمدة بها كلمة <b>"له"</b> و <b>"عليه"</b>، أو سيتم افتراض أول وثاني عمود بعد الاسم.</p>
                    <input type="file" id="extExcelUpload" accept=".xlsx, .xls" style="display:none;" onchange="handleExternalExcelUpload(event)">
                    <button class="btn blue" onclick="document.getElementById('extExcelUpload').click()" style="width: 100%; padding: 12px; display:flex; align-items:center; justify-content:center; gap:8px; font-weight:bold;">
                        <span style="font-size: 18px;">📥</span> اختر ملف إكسل للتحديث الآلي
                    </button>
                </div>
            </div>
        `;
            document.body.appendChild(overlay);
        }

        async function saveManualExternalBalances() {
            const toMe = parseFloat(document.getElementById('manualToMeInput').value) || 0;
            const byMe = parseFloat(document.getElementById('manualByMeInput').value) || 0;
            localStorage.setItem('acc_ext_tome', toMe);
            localStorage.setItem('acc_ext_byme', byMe);
            if (window.BayanDB && typeof window.BayanDB.setSetting === 'function') {
                try {
                    await window.BayanDB.setSetting('acc_ext_tome', toMe);
                    await window.BayanDB.setSetting('acc_ext_byme', byMe);
                } catch (e) {}
            }
            if (typeof window.saveToCloud === 'function') window.saveToCloud();
            renderExternalBalances();
            const modal = document.querySelector('.modal-overlay');
            if (modal) modal.remove();
            if (typeof showToast === 'function') showToast('✅ تم تحديث الأرصدة يدوياً', 'success');
            if (typeof beep === 'function') beep(1000, 0.04, 0.05);
        }

        function handleExternalExcelUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async function (e) {
                try {
                    if (typeof XLSX === 'undefined') {
                        alert('مكتبة الإكسل غير محملة. تأكد من اتصالك بالإنترنت.');
                        return;
                    }
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    let toMe = 0, byMe = 0;
                    if (rows.length > 0) {
                        const header = rows[0].map(h => (h || '').toString().trim().toLowerCase());
                        let cToMe = header.findIndex(h => h.includes('له') || h.includes('لصالحنا') || h.includes('credit') || h.includes('مدين'));
                        let cByMe = header.findIndex(h => h.includes('عليه') || h.includes('علينا') || h.includes('debit') || h.includes('دائن'));

                        // Default fallback: assume names in col 0, 'toMe' in col 1, 'byMe' in col 2
                        if (cToMe === -1) cToMe = 1;
                        if (cByMe === -1) cByMe = 2;

                        for (let i = 1; i < rows.length; i++) {
                            const row = rows[i];
                            if (row && row.length) {
                                const rowText = row.join(' ').toLowerCase();
                                if (rowText.includes('إجمالي') || rowText.includes('اجمالي') || rowText.includes('total')) {
                                    continue; // Skip totals row so we don't double count
                                }
                                toMe += parseFloat(row[cToMe]) || 0;
                                byMe += parseFloat(row[cByMe]) || 0;
                            }
                        }
                    }

                    if (confirm(`تم التعرف على القيم التالية من ملف الإكسل:\n\nإجمالي "له": ${formatNum(toMe)}\nإجمالي "عليه": ${formatNum(byMe)}\n\nهل تريد اعتماد وتحديث الأرصدة الحالية في التطبيق؟`)) {
                        localStorage.setItem('acc_ext_tome', toMe);
                        localStorage.setItem('acc_ext_byme', byMe);
                        if (window.BayanDB && typeof window.BayanDB.setSetting === 'function') {
                            try {
                                await window.BayanDB.setSetting('acc_ext_tome', toMe);
                                await window.BayanDB.setSetting('acc_ext_byme', byMe);
                            } catch (e) {}
                        }
                        if (typeof window.saveToCloud === 'function') window.saveToCloud();
                        renderExternalBalances();

                        const openModal = document.querySelector('.modal-overlay');
                        if (openModal) openModal.remove();

                        if (typeof showToast === 'function') showToast('✅ تم جلب الأرصدة من إكسل بنجاح', 'success');
                        if (typeof beep === 'function') beep(1200, 0.05, 0.06);
                    }
                } catch (error) {
                    if (typeof showToast === 'function') showToast('❌ خطأ في قراءة ملف الإكسل، تأكد من الصيغة', 'error');
                    console.error(error);
                }
            };
            reader.readAsArrayBuffer(file);
        }

        window.showUpdateNotesModal = function () {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
            <div class="modal-box" style="max-width: 680px; width: 92%; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px); border: 1.5px solid rgba(56, 189, 248, 0.4); box-shadow: 0 25px 60px rgba(0,0,0,0.8), 0 0 30px rgba(56, 189, 248, 0.15); color: #fff; border-radius: 28px; padding: 28px; font-family: 'Poppins', 'El Messiri', sans-serif; animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(135deg, #0ea5e9, #0284c7); display: flex; align-items: center; justify-content: center; font-size: 22px; box-shadow: 0 0 15px rgba(14, 165, 233, 0.5);">🚀</div>
                        <div>
                            <h3 style="margin:0; font-size: 20px; font-weight: 900; color: #38bdf8;">مميزات التحديث العملاق الشامل v6.0.0</h3>
                            <span style="font-size: 11px; color: #94a3b8;">إصدار التحديث الملكي v6.0.0</span>
                        </div>
                    </div>
                    <button class="btn ghost" style="color:#f87171; background: rgba(239, 68, 68, 0.15); width: 36px; height: 36px; border-radius: 50%; display:flex; align-items:center; justify-content:center; cursor:pointer; border:none; transition:0.2s;" onclick="document.body.removeChild(this.closest('.modal-overlay'))">✕</button>
                </div>

                <div style="max-height: 480px; overflow-y: auto; padding-left: 6px; line-height: 1.8; font-size: 13px; text-align: right; direction: rtl;">
                    
                    <!-- 1. مساعد بيان الذكي الحرفي وتسجيل الحركات -->
                    <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(168, 85, 247, 0.3); padding: 16px; border-radius: 18px; margin-bottom: 14px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <span style="font-size: 18px;">🤖</span>
                            <span style="font-size: 15px; font-weight: 900; color: #c084fc;">مساعد بيان الذكي 100% أوفلاين والحقن الفوري بالجدول</span>
                        </div>
                        <p style="margin: 0; color: #cbd5e1;">ربط فوري بين أوامر المساعد الصوتية/النصية وجدول المبيعات الرئيسي. بمجرد قول <b>"سجل بيبسي 500 تحت و 400 فوق"</b> يتم إدراج وحفظ العملية فورياً بالجدول والـ IndexedDB وإعادة حساب الصافي والأرباح في ذات اللحظة!</p>
                    </div>

                    <!-- 2. الآلة الحاسبة العلمية والمتقدمة -->
                    <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(56, 189, 248, 0.3); padding: 16px; border-radius: 18px; margin-bottom: 14px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <span style="font-size: 18px;">🧮</span>
                            <span style="font-size: 15px; font-weight: 900; color: #38bdf8;">الآلة الحاسبة العلمية المتقدمة (Scientific Mode)</span>
                        </div>
                        <p style="margin: 0; color: #cbd5e1;">تطوير الآلة الحاسبة بالكامل وإضافة زر التبديل العلمي <b>"Scientific Mode"</b> لدعم الدوال الهندسية والجذر والأُسس (sin, cos, tan, log, √, x^y) مع التصدير المباشر لخانة <b>بعت كام</b> أو <b>المبلغ</b> بنقرة واحدة.</p>
                    </div>

                    <!-- 3. التمديد الكامل واستغلال الشاشة (Full-Screen Edge-to-Edge) -->
                    <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(16, 185, 129, 0.3); padding: 16px; border-radius: 18px; margin-bottom: 14px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <span style="font-size: 18px;">🖥️</span>
                            <span style="font-size: 15px; font-weight: 900; color: #34d399;">التمديد الكامل للشاشة بعرض 100% (Edge-to-Edge Layout)</span>
                        </div>
                        <p style="margin: 0; color: #cbd5e1;">إلغاء جميع الأجزاء والهوامش الخارجية الزائدة وتمديد مساحة برنامج بيان POS لتغطي شاشات اللابتوب والكمبيوتر بالكامل 100% بدون أي مساحات فارغة بالجانبين.</p>
                    </div>

                    <!-- 4. تطوير شاشة تسجيل الدخول والنيون -->
                    <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(236, 72, 153, 0.3); padding: 16px; border-radius: 18px; margin-bottom: 14px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <span style="font-size: 18px;">🔐</span>
                            <span style="font-size: 15px; font-weight: 900; color: #f472b6;">تحديث شاشة تسجيل الدخول وشريط الخلفيات الكبسولة</span>
                        </div>
                        <p style="margin: 0; color: #cbd5e1;">إعادة ضبط أبعاد بطاقة تسجيل الدخول وإطار النيون، وتحويل شريط معاينات الصور إلى شريط كبسولة زجاجي أنيق وسلس يضمن عدم التداخل مع النوافذ.</p>
                    </div>

                    <!-- 5. تطوير البروفايل والاختصار والنظام -->
                    <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(245, 158, 11, 0.3); padding: 16px; border-radius: 18px; margin-bottom: 14px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <span style="font-size: 18px;">🏠</span>
                            <span style="font-size: 15px; font-weight: 900; color: #fbbf24;">تحديث تبويبات "بياناتي - الموظفين - الاختصارات - النظام"</span>
                        </div>
                        <p style="margin: 0; color: #cbd5e1;">إعادة تصميم غلاف البروفايل، عرض كروت السيريال وهويات الأجهزة بجانب بعضها، وتحديث تصميم إضافة الموظفين وكود الطوارئ وإدراج سجل الاختصارات الكامل لوحة المفاتيح.</p>
                    </div>

                    <!-- 6. تسريع الهاردوير بالـ GPU والأداء الخاطف -->
                    <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(14, 165, 233, 0.3); padding: 16px; border-radius: 18px; margin-bottom: 10px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <span style="font-size: 18px;">⚡</span>
                            <span style="font-size: 15px; font-weight: 900; color: #38bdf8;">التسريع الهاردوير بالـ GPU وتطوير الوضع الفاتح</span>
                        </div>
                        <p style="margin: 0; color: #cbd5e1;">تفعيل التسريع الجرافيكي الفائق 60 FPS، مع تباين ناصع وعالي الرؤية لكافة نصوص وكروت الشاشة الرئيسية بالوضع الفاتح (Light Mode).</p>
                    </div>

                </div>

                <button class="btn" style="width:100%; padding: 14px; font-weight: 900; font-size: 15px; margin-top: 20px; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #fff; border: none; border-radius: 14px; cursor: pointer; box-shadow: 0 4px 15px rgba(14, 165, 233, 0.4); transition: all 0.2s;" onclick="document.body.removeChild(this.closest('.modal-overlay'))">✨ رائع جداً، إغلاق النافذة</button>
            </div>
        `;
            document.body.appendChild(overlay);
        };

        window.showAppNotesModal = function showAppNotesModal() {
            const notesMode = localStorage.getItem('acc_notes_mode') || 'continuous';
            const currentDateStr = document.getElementById('dateInput')?.value || new Date().toISOString().split('T')[0];
            const storageKey = notesMode === 'daily' ? `acc_app_notes_${currentDateStr}` : 'acc_app_notes_global';

            let savedNotes = localStorage.getItem(storageKey);
            if (savedNotes === null && notesMode === 'continuous') {
                savedNotes = localStorage.getItem('acc_app_notes') || '';
            } else if (savedNotes === null) {
                savedNotes = '';
            }

            const savedName = localStorage.getItem('acc_notes_box_name') || 'ملاحظاتي اليومية والمفكرة';
            const savedFrameColor = localStorage.getItem('acc_notes_frame_color') || '#fbbf24';

            // Remove existing overlay if any
            const existing = document.querySelector('.notes-modal-overlay');
            if (existing) existing.remove();

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay notes-modal-overlay';
            overlay.style.zIndex = '999999';
            overlay.innerHTML = `
            <div class="modal-box" style="width: 92vw; max-width: 720px; background: linear-gradient(145deg, #0f172a, #1e293b); border: 2.5px solid ${savedFrameColor}; box-shadow: 0 20px 60px rgba(0,0,0,0.8), 0 0 25px ${savedFrameColor}44; color: #fff; border-radius: 24px; padding: 24px; transition: all 0.3s ease;">
                
                <!-- Header -->
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 14px; gap: 10px; flex-wrap: wrap;">
                    <div style="display:flex; align-items:center; gap:10px; flex: 1;">
                        <span style="font-size:26px;">📝</span>
                        <input type="text" id="notesBoxNameTitleInput" value="${savedName}" placeholder="اسم دفتر الملاحظات..." 
                            style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: ${savedFrameColor}; font-size: 18px; font-weight: 800; font-family: 'El Messiri', sans-serif; padding: 6px 12px; border-radius: 12px; outline: none; width: 100%; max-width: 320px;"
                            onchange="window.updateNotesTitle(this.value)">
                    </div>

                    <div style="display:flex; align-items:center; gap:8px;">
                        <button onclick="window.toggleNotesSettingsPanel()" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; padding: 6px 12px; border-radius: 10px; font-size: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                            ⚙️ الإعدادات والإطار
                        </button>
                        <button class="btn ghost" style="color:#ef4444; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); border-radius:50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-weight: bold;" onclick="document.body.removeChild(this.closest('.modal-overlay'))">✕</button>
                    </div>
                </div>

                <!-- Settings Box (Hidden by default) -->
                <div id="notesSettingsPanel" style="display: none; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 14px; margin-bottom: 16px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div>
                            <label style="font-size: 12px; color: #94a3b8; font-weight: bold; display: block; margin-bottom: 6px;">📌 نظام حفظ الملاحظات:</label>
                            <select id="notesModeSelect" onchange="window.changeNotesMode(this.value)" style="width: 100%; background: #0f172a; color: #fff; border: 1px solid #334155; padding: 8px; border-radius: 10px; font-weight: bold; font-size: 13px;">
                                <option value="continuous" ${notesMode === 'continuous' ? 'selected' : ''}>🔄 مستمر ودائم (تظهر في كل الأيام)</option>
                                <option value="daily" ${notesMode === 'daily' ? 'selected' : ''}>📅 يوم بيومه (تتغير تلقائياً مع كل تاريخ)</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size: 12px; color: #94a3b8; font-weight: bold; display: block; margin-bottom: 6px;">🎨 لون وتصميم إطار النافذة:</label>
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <button onclick="window.setNotesFrameColor('#fbbf24')" style="background: #fbbf24; border: none; width: 26px; height: 26px; border-radius: 50%; cursor: pointer;" title="ذهبي"></button>
                                <button onclick="window.setNotesFrameColor('#10b981')" style="background: #10b981; border: none; width: 26px; height: 26px; border-radius: 50%; cursor: pointer;" title="زمردي"></button>
                                <button onclick="window.setNotesFrameColor('#38bdf8')" style="background: #38bdf8; border: none; width: 26px; height: 26px; border-radius: 50%; cursor: pointer;" title="سماوي"></button>
                                <button onclick="window.setNotesFrameColor('#c084fc')" style="background: #c084fc; border: none; width: 26px; height: 26px; border-radius: 50%; cursor: pointer;" title="بنفسجي"></button>
                                <button onclick="window.setNotesFrameColor('#f87171')" style="background: #f87171; border: none; width: 26px; height: 26px; border-radius: 50%; cursor: pointer;" title="أحمر"></button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Textarea Area -->
                <div style="margin-bottom: 18px;">
                    <textarea id="appNotesTextarea" rows="12" style="width: 100%; padding: 16px; border-radius: 16px; border: 1.5px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.45); color: #f8fafc; font-size: 16px; line-height: 1.6; resize: vertical; outline: none; font-family: inherit; box-sizing: border-box;" placeholder="اكتب جميع ملاحظاتك ومهامك اليومية هنا...">${savedNotes}</textarea>
                    <button class="btn ghost" onclick="appendNewNoteTemplate()" style="width:100%; margin-top:12px; padding: 12px; font-weight:bold; font-size:14px; background: rgba(59, 130, 246, 0.15); border: 1px dashed #3b82f6; color:#93c5fd; border-radius: 14px; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <span>➕ إدراج ترقيم ووقت وتاريخ لملاحظة جديدة</span>
                    </button>
                </div>

                <!-- Save Action -->
                <button class="btn green" onclick="saveAppNotes()" style="width:100%; padding: 14px; font-weight:900; font-size:16px; border-radius: 14px; background: linear-gradient(135deg, #10b981, #059669); color: #fff; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35);">
                    💾 حفظ الملاحظات
                </button>
            </div>
        `;
            document.body.appendChild(overlay);
        }

        window.toggleNotesSettingsPanel = function() {
            const panel = document.getElementById('notesSettingsPanel');
            if (panel) {
                panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            }
        };

        window.updateNotesTitle = function(newTitle) {
            if (!newTitle.trim()) return;
            localStorage.setItem('acc_notes_box_name', newTitle.trim());
            renderAppNotesBox();
            if (typeof showToast === 'function') showToast('✅ تم حفظ عنوان الملاحظات الجديد', 'success');
        };

        window.setNotesFrameColor = function(color) {
            localStorage.setItem('acc_notes_frame_color', color);
            const modalBox = document.querySelector('#appNotesTextarea')?.closest('.modal-box');
            const titleInput = document.getElementById('notesBoxNameTitleInput');
            if (modalBox) {
                modalBox.style.borderColor = color;
                modalBox.style.boxShadow = `0 20px 60px rgba(0,0,0,0.8), 0 0 25px ${color}44`;
            }
            if (titleInput) {
                titleInput.style.color = color;
            }
            if (typeof showToast === 'function') showToast('🎨 تم تغيير تصميم الإطار', 'info');
        };

        window.changeNotesMode = function(mode) {
            localStorage.setItem('acc_notes_mode', mode);
            const modeText = mode === 'daily' ? 'يوم بيومه 📅' : 'مستمر ودائم 🔄';
            if (typeof showToast === 'function') showToast(`📌 تم تغيير النظام إلى: ${modeText}`, 'success');
            // Reload contents for the selected mode
            const currentDateStr = document.getElementById('dateInput')?.value || new Date().toISOString().split('T')[0];
            const storageKey = mode === 'daily' ? `acc_app_notes_${currentDateStr}` : 'acc_app_notes_global';
            const textarea = document.getElementById('appNotesTextarea');
            if (textarea) {
                textarea.value = localStorage.getItem(storageKey) || '';
            }
        };

        window.appendNewNoteTemplate = function () {
            const textarea = document.getElementById('appNotesTextarea');
            if (!textarea) return;

            const text = textarea.value;
            const noteCount = (text.match(/📌/g) || []).length + 1;

            const now = new Date();
            const dateStr = now.toLocaleDateString('ar-EG');
            let hours = now.getHours();
            const ampm = hours >= 12 ? 'م' : 'ص';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const mins = now.getMinutes().toString().padStart(2, '0');
            const timeStr = `${hours}:${mins} ${ampm}`;

            const separator = text.trim() === '' ? '' : '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
            const template = `${separator}📌 ملاحظة رقم #${noteCount}\n🕒 ${dateStr} - ${timeStr}\n📝 البيان:\n• `;

            textarea.value += template;
            textarea.focus();
            textarea.scrollTop = textarea.scrollHeight;
        };

        window.saveAppNotes = function() {
            const notes = document.getElementById('appNotesTextarea').value;
            const notesMode = localStorage.getItem('acc_notes_mode') || 'continuous';
            const currentDateStr = document.getElementById('dateInput')?.value || new Date().toISOString().split('T')[0];
            const storageKey = notesMode === 'daily' ? `acc_app_notes_${currentDateStr}` : 'acc_app_notes_global';

            localStorage.setItem(storageKey, notes);
            if (notesMode === 'continuous') {
                localStorage.setItem('acc_app_notes', notes);
            }

            // فحص واستخراج الإشعارات والتنبيهات من دفتر الملاحظات فوراً
            if (window.BayanNotifications && typeof window.BayanNotifications.scanAppNotes === 'function') {
                window.BayanNotifications.scanAppNotes(notes, currentDateStr);
            }

            const openOverlay = document.querySelector('.notes-modal-overlay') || document.querySelector('.modal-overlay');
            if (openOverlay) openOverlay.remove();
            if (typeof showToast === 'function') showToast('✅ تم حفظ الملاحظات وفحص التنبيهات بنجاح', 'success');
            if (typeof beep === 'function') beep(1000, 0.04, 0.05);
        };

        window.saveNotesBoxName = function() {
            const notesInputEl = document.getElementById('notesBoxNameInput');
            if (!notesInputEl) return;
            const newName = notesInputEl.value.trim();
            if (newName) {
                localStorage.setItem('acc_notes_box_name', newName);
                renderAppNotesBox();
                if (typeof showToast === 'function') showToast('✅ تم تحديث اسم مربع الملاحظات بنجاح', 'success');
                if (typeof beep === 'function') beep(1000, 0.04, 0.05);
            }
        };

        function renderAppNotesBox() {
            const savedNotesBoxName = localStorage.getItem('acc_notes_box_name') || 'الملاحظات';

            // 1. تحديث زر الهيدر
            const headerNotesElBtn = document.getElementById('headerNotesBoxNameBtn');
            if (headerNotesElBtn) headerNotesElBtn.textContent = savedNotesBoxName;

            // 2. تحديث تسمية الحقل في واجهة الإدخال
            const mainLabel = document.getElementById('mainFormNotesLabel');
            if (mainLabel) {
                mainLabel.innerHTML = `<span class="input-icon">📝</span> ${savedNotesBoxName}`;
            }

            // 3. تحديث التلميح (Placeholder) داخل الحقل
            const mainInput = document.getElementById('note');
            if (mainInput) {
                mainInput.placeholder = `اكتب ${savedNotesBoxName}...`;
            }

            // 4. تحديث رأس الجدول
            const tableHeader = document.getElementById('tableNotesHeaderName');
            if (tableHeader) tableHeader.textContent = savedNotesBoxName;

            // 5. تحديث الحقل في الإعدادات
            const notesInputEl = document.getElementById('notesBoxNameInput');
            if (notesInputEl) notesInputEl.value = savedNotesBoxName;
        }

        document.addEventListener('DOMContentLoaded', () => {
            renderExternalBalances();
            renderAppNotesBox();
            updateHeaderName();
            if (typeof updateAppLogos === 'function') updateAppLogos();
            // تحديث رقم الإصدار في تبويب "النظام"
            const versionEl = document.getElementById('about-app-version');
            if (versionEl) versionEl.textContent = `v${typeof APP_VERSION !== 'undefined' ? APP_VERSION : '6.0.0'} Pro Max`;
        });
        setTimeout(() => {
            renderExternalBalances();
            renderAppNotesBox();
            updateHeaderName();
            if (typeof updateAppLogos === 'function') updateAppLogos();
        }, 500); // safety fallback

        // PWA Install Prompt Logic
        let posDeferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            posDeferredPrompt = e;
            // Update UI notify the user they can add to home screen
            const installBtn = document.getElementById('installPwaBtn');
            if (installBtn) installBtn.style.display = 'inline-flex';
        });

        function installPWA() {
            if (!posDeferredPrompt) return;
            // Show the prompt
            posDeferredPrompt.prompt();
            // Wait for the user to respond to the prompt
            posDeferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the A2HS prompt');
                } else {
                    console.log('User dismissed the A2HS prompt');
                }
                posDeferredPrompt = null;
                const installBtn = document.getElementById('installPwaBtn');
                if (installBtn) installBtn.style.display = 'none';
            });
        }

        function showModal(title, contentHtml) {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.zIndex = '99999999';
            overlay.innerHTML = `
            <div class="modal-box" style="max-width: 500px; background: #1e293b; border: 1px solid #334155; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); padding: 0; overflow: hidden;">
                <div style="background: linear-gradient(90deg, #1e293b, #0f172a); padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; color: #fff; font-size: 18px;">${title}</h3>
                    <button class="btn ghost" onclick="this.closest('.modal-overlay').remove()" style="color: #94a3b8; font-size: 20px;">✕</button>
                </div>
                <div style="padding: 20px; max-height: 75vh; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #d4af37 rgba(255,255,255,0.05);">
                    ${contentHtml}
                </div>
            </div>
        `;
            document.body.appendChild(overlay);
            if (typeof beep === 'function') beep(1000, 0.05, 0.05);
        }

        // Export ONLY functions that actually exist in this file
        if (typeof saveManualExternalBalances !== 'undefined') window.saveManualExternalBalances = saveManualExternalBalances;
        if (typeof handleExternalExcelUpload !== 'undefined') window.handleExternalExcelUpload = handleExternalExcelUpload;
        if (typeof renderExternalBalances !== 'undefined') window.renderExternalBalances = renderExternalBalances;
        if (typeof saveAppNotes !== 'undefined') window.saveAppNotes = saveAppNotes;
        if (typeof saveNotesBoxName !== 'undefined') window.saveNotesBoxName = saveNotesBoxName;
        if (typeof renderAppNotesBox !== 'undefined') window.renderAppNotesBox = renderAppNotesBox;

        // --- دوال استعادة كلمة المرور وإنشاء حساب من شاشة الدخول بمودال حديث فاخر ---
        window.closeModernCreateAccountModal = function() {
            const m = document.getElementById('modern-create-account-modal');
            if (m) {
                m.style.opacity = '0';
                m.style.transition = 'opacity 0.2s ease';
                setTimeout(() => m.remove(), 200);
            }
        };

        window.toggleCreateModalFieldPass = function(fieldId, iconEl) {
            const field = document.getElementById(fieldId);
            if (!field || !iconEl) return;
            if (field.type === 'password') {
                field.type = 'text';
                iconEl.style.color = '#00d8ff';
                iconEl.style.textShadow = '0 0 8px rgba(0,216,255,0.6)';
            } else {
                field.type = 'password';
                iconEl.style.color = '#94a3b8';
                iconEl.style.textShadow = 'none';
            }
        };

        window.handleCreateNewAccountAction = async function() {
            // إزالة أي نافذة سابقة
            const oldModal = document.getElementById('modern-create-account-modal');
            if (oldModal) oldModal.remove();

            let users = [];
            try { users = JSON.parse(localStorage.getItem('acc_bayan_users') || '[]'); } catch (e) {}

            let admin = users.find(u => u.id === 'admin1');
            if (!admin) {
                const ownerName = localStorage.getItem('acc_user_name') || 'المدير العام';
                const finalName = ownerName.includes('المدير') ? ownerName : `المدير العام ${ownerName}`;
                const defaultHash = (window.BayanSecurity && typeof window.BayanSecurity.hashPassword === 'function')
                    ? await window.BayanSecurity.hashPassword('123')
                    : '123';
                admin = {
                    id: 'admin1',
                    name: finalName,
                    role: 'admin',
                    pass: defaultHash
                };
                users.push(admin);
                localStorage.setItem('acc_bayan_users', JSON.stringify(users));
            }

            const modalHTML = `
            <div id="modern-create-account-modal" onclick="if(event.target === this) window.closeModernCreateAccountModal()" style="position: fixed; inset: 0; z-index: 10000000; background: rgba(3, 7, 18, 0.78); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); display: flex; align-items: center; justify-content: center; padding: 20px; direction: rtl; font-family: 'Readex Pro', 'Tajawal', 'Poppins', sans-serif; animation: fadeInCreateModal 0.25s ease;">
                <style>
                    @keyframes fadeInCreateModal {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes slideUpCreateCard {
                        from { opacity: 0; transform: translateY(25px) scale(0.96); }
                        to { opacity: 1; transform: translateY(0) scale(1); }
                    }
                    #modern-create-account-modal .create-acc-card {
                        position: relative;
                        width: 100%;
                        max-width: 440px;
                        background: linear-gradient(150deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.94) 100%);
                        border: 1.5px solid rgba(0, 216, 255, 0.5);
                        border-radius: 28px;
                        padding: 32px 28px;
                        box-shadow: 0 0 45px rgba(0, 216, 255, 0.25), 0 30px 60px rgba(0, 0, 0, 0.85);
                        color: #fff;
                        text-align: right;
                        box-sizing: border-box;
                        animation: slideUpCreateCard 0.32s cubic-bezier(0.16, 1, 0.3, 1);
                    }
                    #modern-create-account-modal .modal-input-wrap {
                        position: relative;
                        margin-bottom: 15px;
                    }
                    #modern-create-account-modal .modal-input-label {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        font-size: 12px;
                        font-weight: bold;
                        color: #cbd5e1;
                        margin-bottom: 6px;
                    }
                    #modern-create-account-modal .modal-input-field {
                        width: 100%;
                        padding: 12px 40px 12px 16px;
                        background: rgba(255, 255, 255, 0.07);
                        border: 1px solid rgba(255, 255, 255, 0.16);
                        border-radius: 14px;
                        color: #fff;
                        font-size: 14px;
                        outline: none;
                        box-sizing: border-box;
                        font-family: inherit;
                        transition: all 0.25s ease;
                    }
                    #modern-create-account-modal .modal-input-field:focus {
                        border-color: #00d8ff;
                        background: rgba(255, 255, 255, 0.12);
                        box-shadow: 0 0 14px rgba(0, 216, 255, 0.35);
                    }
                    #modern-create-account-modal .modal-pass-toggle {
                        position: absolute;
                        left: 14px;
                        top: 50%;
                        transform: translateY(-50%);
                        cursor: pointer;
                        color: #94a3b8;
                        font-size: 15px;
                        transition: 0.2s;
                        user-select: none;
                    }
                    #modern-create-account-modal .modal-pass-toggle:hover {
                        color: #00d8ff;
                    }
                </style>

                <div class="create-acc-card">
                    <!-- Header -->
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 46px; height: 46px; border-radius: 14px; background: linear-gradient(135deg, rgba(0, 216, 255, 0.25), rgba(2, 132, 199, 0.45)); border: 1.5px solid rgba(0, 216, 255, 0.6); display: flex; align-items: center; justify-content: center; font-size: 22px; box-shadow: 0 0 18px rgba(0, 216, 255, 0.35);">
                                👥
                            </div>
                            <div>
                                <h3 style="margin: 0; font-size: 18px; font-weight: 900; color: #fff; letter-spacing: 0.5px;">إنشاء حساب موظف جديد</h3>
                                <p style="margin: 3px 0 0 0; font-size: 11px; color: #94a3b8; font-weight: 600;">إضافة عضو جديد لفريق العمل بصلاحية بيع (كاشير)</p>
                            </div>
                        </div>
                        <button type="button" onclick="window.closeModernCreateAccountModal()" style="border: none; background: rgba(255,255,255,0.08); width: 34px; height: 34px; border-radius: 50%; color: #94a3b8; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s;" onmouseover="this.style.background='rgba(239, 68, 68, 0.25)'; this.style.color='#f87171';" onmouseout="this.style.background='rgba(255,255,255,0.08)'; this.style.color='#94a3b8';">✕</button>
                    </div>

                    <!-- Role Badge Hint -->
                    <div style="background: rgba(0, 216, 255, 0.08); border: 1px dashed rgba(0, 216, 255, 0.3); border-radius: 14px; padding: 10px 14px; font-size: 12px; color: #7dd3fc; margin-bottom: 18px; display: flex; align-items: center; gap: 9px; line-height: 1.5;">
                        <span style="font-size: 16px;">🔐</span>
                        <span>صلاحية الإدارة مطلوبة: يرجى إدخال كود المدير العام أولاً للموافقة.</span>
                    </div>

                    <!-- Error/Success Notice Container -->
                    <div id="create-modal-alert" style="display: none; padding: 10px 14px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-bottom: 15px; text-align: center; transition: 0.3s;"></div>

                    <!-- Field 1: Admin Password -->
                    <div class="modal-input-wrap">
                        <label class="modal-input-label" for="create-modal-admin-pass">
                            <span>👨‍💼</span>
                            <span>كود سر المدير العام:</span>
                        </label>
                        <div style="position: relative;">
                            <input type="password" id="create-modal-admin-pass" class="modal-input-field" placeholder="أدخل كود سر المدير أو كود الطوارئ" autocomplete="off">
                            <span class="modal-pass-toggle" onclick="window.toggleCreateModalFieldPass('create-modal-admin-pass', this)">👁️</span>
                        </div>
                    </div>

                    <!-- Field 2: New User Name -->
                    <div class="modal-input-wrap">
                        <label class="modal-input-label" for="create-modal-user-name">
                            <span>👤</span>
                            <span>اسم الموظف الجديد:</span>
                        </label>
                        <div style="position: relative;">
                            <input type="text" id="create-modal-user-name" class="modal-input-field" style="padding: 12px 16px;" placeholder="مثال: أحمد، محمد، كاشير 1" autocomplete="off">
                        </div>
                    </div>

                    <!-- Field 3: New User Pass -->
                    <div class="modal-input-wrap" style="margin-bottom: 22px;">
                        <label class="modal-input-label" for="create-modal-user-pass">
                            <span>🔑</span>
                            <span>كود السر الخاص بالموظف:</span>
                        </label>
                        <div style="position: relative;">
                            <input type="password" id="create-modal-user-pass" class="modal-input-field" placeholder="أدخل رمز المرور الذي سيدخل به" autocomplete="new-password">
                            <span class="modal-pass-toggle" onclick="window.toggleCreateModalFieldPass('create-modal-user-pass', this)">👁️</span>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div style="display: flex; gap: 10px;">
                        <button type="button" onclick="window.submitModernCreateAccount()" style="flex: 2; padding: 13px; background: #00d8ff; color: #000; border: none; border-radius: 14px; font-weight: 900; font-size: 14px; cursor: pointer; box-shadow: 0 0 20px rgba(0, 216, 255, 0.4); transition: all 0.25s ease; font-family: inherit;" onmouseover="this.style.background='#00f0ff'; this.style.boxShadow='0 0 25px rgba(0, 240, 255, 0.65)'; this.style.transform='translateY(-1px)';" onmouseout="this.style.background='#00d8ff'; this.style.boxShadow='0 0 20px rgba(0, 216, 255, 0.4)'; this.style.transform='translateY(0)';">
                            <span>✅ إنشاء الحساب فوراً</span>
                        </button>
                        <button type="button" onclick="window.closeModernCreateAccountModal()" style="flex: 1; padding: 13px; background: rgba(255, 255, 255, 0.08); color: #cbd5e1; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 14px; font-weight: bold; font-size: 13px; cursor: pointer; transition: all 0.2s ease; font-family: inherit;" onmouseover="this.style.background='rgba(255, 255, 255, 0.14)';" onmouseout="this.style.background='rgba(255, 255, 255, 0.08)';">
                            <span>إلغاء</span>
                        </button>
                    </div>
                </div>
            </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);

            setTimeout(() => {
                const adminInput = document.getElementById('create-modal-admin-pass');
                if (adminInput) adminInput.focus();

                ['create-modal-admin-pass', 'create-modal-user-name', 'create-modal-user-pass'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.onkeydown = (e) => {
                            if (e.key === 'Enter') window.submitModernCreateAccount();
                            if (e.key === 'Escape') window.closeModernCreateAccountModal();
                        };
                    }
                });
            }, 50);
        };

        window.submitModernCreateAccount = async function() {
            const adminPassInput = document.getElementById('create-modal-admin-pass');
            const userNameInput = document.getElementById('create-modal-user-name');
            const userPassInput = document.getElementById('create-modal-user-pass');
            const alertBox = document.getElementById('create-modal-alert');

            function showError(msg) {
                if (!alertBox) return;
                alertBox.style.display = 'block';
                alertBox.style.background = 'rgba(239, 68, 68, 0.18)';
                alertBox.style.border = '1px solid rgba(239, 68, 68, 0.45)';
                alertBox.style.color = '#fca5a5';
                alertBox.innerHTML = msg;
            }

            const adminPass = adminPassInput ? adminPassInput.value.trim() : '';
            const userName = userNameInput ? userNameInput.value.trim() : '';
            const userPass = userPassInput ? userPassInput.value.trim() : '';

            if (!adminPass) {
                showError('⚠️ يرجى إدخال كود سر المدير العام للتحقق.');
                if (adminPassInput) adminPassInput.focus();
                return;
            }

            let users = [];
            try { users = JSON.parse(localStorage.getItem('acc_bayan_users') || '[]'); } catch (e) {}
            let admin = users.find(u => u.id === 'admin1' || u.role === 'admin');
            if (!admin) {
                const defaultHash = (window.BayanSecurity && typeof window.BayanSecurity.hashPassword === 'function')
                    ? await window.BayanSecurity.hashPassword('123')
                    : '123';
                admin = { id: 'admin1', name: 'المدير العام', role: 'admin', pass: defaultHash };
                users.push(admin);
            }

            let isAdminPassValid = false;
            if (window.BayanSecurity && typeof window.BayanSecurity.verifyPassword === 'function') {
                const verifyRes = await window.BayanSecurity.verifyPassword(adminPass, admin.pass);
                isAdminPassValid = verifyRes.valid;
                if (verifyRes.valid && verifyRes.needMigration && verifyRes.newHash) {
                    admin.pass = verifyRes.newHash;
                    localStorage.setItem('acc_bayan_users', JSON.stringify(users));
                }
            } else {
                isAdminPassValid = (admin.pass === adminPass);
            }

            if (!isAdminPassValid) {
                showError('❌ كود سر المدير العام غير صحيح. تم رفض العملية.');
                if (adminPassInput) {
                    adminPassInput.value = '';
                    adminPassInput.focus();
                }
                return;
            }

            if (!userName) {
                showError('⚠️ يرجى إدخال اسم الموظف الجديد.');
                if (userNameInput) userNameInput.focus();
                return;
            }

            if (users.some(u => u.name.toLowerCase() === userName.toLowerCase())) {
                showError('⚠️ يوجد مستخدم مسجل بنفس هذا الاسم مسبقاً.');
                if (userNameInput) userNameInput.focus();
                return;
            }

            if (!userPass || userPass.length < 3) {
                showError('⚠️ يرجى تحديد كود سر لا يقل عن 3 خانات للموظف الجديد.');
                if (userPassInput) userPassInput.focus();
                return;
            }

            const newId = 'user_' + Date.now();
            const hashedUserPass = (window.BayanSecurity && typeof window.BayanSecurity.hashPassword === 'function')
                ? await window.BayanSecurity.hashPassword(userPass)
                : userPass;

            const newUser = {
                id: newId,
                name: userName,
                pass: hashedUserPass,
                role: 'cashier',
                permissions: { sell: true, view: false, delete: false, reports: false, settings: false }
            };

            users.push(newUser);
            localStorage.setItem('acc_bayan_users', JSON.stringify(users));

            localStorage.setItem('acc_saved_pass_' + newId, hashedUserPass);
            localStorage.setItem('acc_last_emp_id', newId);

            if (alertBox) {
                alertBox.style.display = 'block';
                alertBox.style.background = 'rgba(34, 197, 94, 0.18)';
                alertBox.style.border = '1px solid rgba(34, 197, 94, 0.45)';
                alertBox.style.color = '#86efac';
                alertBox.innerHTML = `🎉 تم إنشاء حساب <b>(${userName})</b> بنجاح!`;
            }

            if (window.showToast) {
                window.showToast(`🎉 تم إنشاء حساب الموظف (${userName}) بنجاح!`, 'success');
            }

            setTimeout(() => {
                window.closeModernCreateAccountModal();

                const select = document.getElementById('login-user-select');
                if (select) {
                    const opt = document.createElement('option');
                    opt.value = newId;
                    opt.textContent = userName;
                    opt.style.background = '#111827';
                    opt.style.color = '#fff';
                    select.appendChild(opt);
                    select.value = newId;
                    if (typeof window.onLoginUserChange === 'function') {
                        window.onLoginUserChange(newId);
                    }
                } else {
                    if (typeof window.showTeamLogin === 'function') {
                        window.showTeamLogin(true);
                    }
                }
            }, 700);
        };

        // --- مودال حديث لاستعادة / إعادة تعيين كلمة المرور ---
        window.handleForgotPasswordAction = function() {
            const oldModal = document.getElementById('modern-reset-pass-modal');
            if (oldModal) oldModal.remove();

            let users = [];
            try { users = JSON.parse(localStorage.getItem('acc_bayan_users') || '[]'); } catch (e) {}
            if (users.length === 0) {
                if (window.showToast) window.showToast('⚠️ لا يوجد مستخدمين مسجلين بعد.', 'warning');
                return;
            }

            const currentSelected = document.getElementById('login-user-select')?.value || (users[0] ? users[0].id : '');

            const modalHTML = `
            <div id="modern-reset-pass-modal" onclick="if(event.target === this) this.remove()" style="position: fixed; inset: 0; z-index: 10000000; background: rgba(3, 7, 18, 0.78); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); display: flex; align-items: center; justify-content: center; padding: 20px; direction: rtl; font-family: 'Readex Pro', 'Tajawal', 'Poppins', sans-serif; animation: fadeInCreateModal 0.25s ease;">
                <div class="create-acc-card" style="position: relative; width: 100%; max-width: 440px; background: linear-gradient(150deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.94) 100%); border: 1.5px solid rgba(255, 59, 126, 0.5); border-radius: 28px; padding: 32px 28px; box-shadow: 0 0 45px rgba(255, 59, 126, 0.25), 0 30px 60px rgba(0, 0, 0, 0.85); color: #fff; text-align: right; box-sizing: border-box; animation: slideUpCreateCard 0.32s cubic-bezier(0.16, 1, 0.3, 1);">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 46px; height: 46px; border-radius: 14px; background: linear-gradient(135deg, rgba(255, 59, 126, 0.25), rgba(225, 29, 72, 0.45)); border: 1.5px solid rgba(255, 59, 126, 0.6); display: flex; align-items: center; justify-content: center; font-size: 22px; box-shadow: 0 0 18px rgba(255, 59, 126, 0.35);">
                                🔒
                            </div>
                            <div>
                                <h3 style="margin: 0; font-size: 18px; font-weight: 900; color: #fff;">إعادة تعيين كود السر</h3>
                                <p style="margin: 3px 0 0 0; font-size: 11px; color: #94a3b8; font-weight: 600;">بموافقة وترخيص المدير العام</p>
                            </div>
                        </div>
                        <button type="button" onclick="document.getElementById('modern-reset-pass-modal')?.remove()" style="border: none; background: rgba(255,255,255,0.08); width: 34px; height: 34px; border-radius: 50%; color: #94a3b8; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s;" onmouseover="this.style.background='rgba(239, 68, 68, 0.25)'; this.style.color='#f87171';" onmouseout="this.style.background='rgba(255,255,255,0.08)'; this.style.color='#94a3b8';">✕</button>
                    </div>

                    <div id="reset-modal-alert" style="display: none; padding: 10px 14px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-bottom: 15px; text-align: center;"></div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; font-size: 12px; font-weight: bold; color: #cbd5e1; margin-bottom: 6px;">اختر المستخدم المطلوب:</label>
                        <select id="reset-modal-user-select" style="width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.16); border-radius: 14px; color: #fff; font-size: 14px; outline: none; font-family: inherit;">
                            ${users.filter(u => u.id !== 'admin1').map(u => `<option value="${u.id}" ${u.id === currentSelected ? 'selected' : ''} style="background: #111827; color:#fff;">${u.name}</option>`).join('')}
                        </select>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <label style="display: block; font-size: 12px; font-weight: bold; color: #cbd5e1; margin-bottom: 6px;">كود سر المدير العام:</label>
                        <div style="position: relative;">
                            <input type="password" id="reset-modal-admin-pass" style="width: 100%; padding: 12px 40px 12px 16px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.16); border-radius: 14px; color: #fff; font-size: 14px; outline: none; font-family: inherit; box-sizing: border-box;" placeholder="كود سر المدير العام">
                            <span onclick="window.toggleCreateModalFieldPass('reset-modal-admin-pass', this)" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #94a3b8; font-size: 15px;">👁️</span>
                        </div>
                    </div>

                    <div style="margin-bottom: 22px;">
                        <label style="display: block; font-size: 12px; font-weight: bold; color: #cbd5e1; margin-bottom: 6px;">كود السر الجديد:</label>
                        <div style="position: relative;">
                            <input type="password" id="reset-modal-new-pass" style="width: 100%; padding: 12px 40px 12px 16px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.16); border-radius: 14px; color: #fff; font-size: 14px; outline: none; font-family: inherit; box-sizing: border-box;" placeholder="كود السر الجديد">
                            <span onclick="window.toggleCreateModalFieldPass('reset-modal-new-pass', this)" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #94a3b8; font-size: 15px;">👁️</span>
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px;">
                        <button type="button" onclick="window.submitModernResetPass()" style="flex: 2; padding: 13px; background: #ff3b7e; color: #fff; border: none; border-radius: 14px; font-weight: 900; font-size: 14px; cursor: pointer; box-shadow: 0 0 20px rgba(255,59,126,0.4); font-family: inherit;">
                            <span>تحديث الرمز السري 🔒</span>
                        </button>
                        <button type="button" onclick="document.getElementById('modern-reset-pass-modal')?.remove()" style="flex: 1; padding: 13px; background: rgba(255, 255, 255, 0.08); color: #cbd5e1; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 14px; font-weight: bold; font-size: 13px; cursor: pointer; font-family: inherit;">
                            <span>إلغاء</span>
                        </button>
                    </div>
                </div>
            </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        };

        window.submitModernResetPass = async function() {
            const userSel = document.getElementById('reset-modal-user-select')?.value;
            const adminPass = document.getElementById('reset-modal-admin-pass')?.value.trim();
            const newPass = document.getElementById('reset-modal-new-pass')?.value.trim();
            const alertBox = document.getElementById('reset-modal-alert');

            function showErr(msg) {
                if (!alertBox) return;
                alertBox.style.display = 'block';
                alertBox.style.background = 'rgba(239, 68, 68, 0.18)';
                alertBox.style.border = '1px solid rgba(239, 68, 68, 0.45)';
                alertBox.style.color = '#fca5a5';
                alertBox.innerHTML = msg;
            }

            if (!userSel) return showErr('⚠️ يرجى اختيار المستخدم.');
            if (!adminPass) return showErr('⚠️ يرجى إدخال كود سر المدير العام.');
            if (!newPass || newPass.length < 3) return showErr('⚠️ يرجى إدخال كود سر لا يقل عن 3 خانات.');

            let users = [];
            try { users = JSON.parse(localStorage.getItem('acc_bayan_users') || '[]'); } catch (e) {}
            const admin = users.find(u => u.id === 'admin1' || u.role === 'admin');
            if (!admin) {
                return showErr('❌ لم يتم العثور على حساب المدير العام.');
            }

            let isAdminPassValid = false;
            if (window.BayanSecurity && typeof window.BayanSecurity.verifyPassword === 'function') {
                const check = await window.BayanSecurity.verifyPassword(adminPass, admin.pass);
                isAdminPassValid = check.valid;
                if (check.valid && check.needMigration && check.newHash) {
                    admin.pass = check.newHash;
                    localStorage.setItem('acc_bayan_users', JSON.stringify(users));
                }
            } else {
                isAdminPassValid = (admin.pass === adminPass);
            }

            if (!isAdminPassValid) {
                return showErr('❌ كود سر المدير العام غير صحيح.');
            }

            const target = users.find(u => u.id === userSel);
            if (!target) return showErr('المستخدم غير موجود.');

            const hashedNewPass = (window.BayanSecurity && typeof window.BayanSecurity.hashPassword === 'function')
                ? await window.BayanSecurity.hashPassword(newPass)
                : newPass;

            target.pass = hashedNewPass;
            localStorage.setItem('acc_bayan_users', JSON.stringify(users));
            localStorage.setItem('acc_saved_pass_' + userSel, hashedNewPass);

            if (alertBox) {
                alertBox.style.display = 'block';
                alertBox.style.background = 'rgba(34, 197, 94, 0.18)';
                alertBox.style.border = '1px solid rgba(34, 197, 94, 0.45)';
                alertBox.style.color = '#86efac';
                alertBox.innerHTML = `🎉 تم تغيير وتشفير كود السر بنجاح!`;
            }
            if (window.showToast) window.showToast('🎉 تم تغيير وتشفير كود السر بنجاح!', 'success');

            setTimeout(() => {
                document.getElementById('modern-reset-pass-modal')?.remove();
                if (typeof window.onLoginUserChange === 'function') window.onLoginUserChange(userSel);
            }, 700);
        };

        // --- نظام تسجيل دخول فريق العمل الإجباري ---
        window.showTeamLogin = function (force = false) {
            if (!localStorage.getItem('app_auth_serial')) return;

            // التحقق من الجلسة النشطة لمنع حجب واجهة البرنامج عند عمل ريلود للمتصفح
            const hasActiveSession = Boolean(
                localStorage.getItem('acc_current_user_id') && 
                (sessionStorage.getItem('acc_logged_in_session') === 'true' || sessionStorage.getItem('acc_auto_enter') === 'true')
            );
            if (hasActiveSession && !force) {
                const app = document.getElementById('app');
                if (app && app.style.display === 'none') {
                    app.style.display = 'block';
                    if (typeof render === 'function') requestAnimationFrame(render);
                }
                const teamOverlay = document.getElementById('team-login-overlay');
                if (teamOverlay) teamOverlay.remove();
                return;
            }

            // حماية المدخلات: إذا كانت شاشة تسجيل الدخول معروضة بالفعل في الصفحة، لا نعيد بناءها حتى لا يتم تفريغ ما يكتبه المستخدم
            const existingLogin = document.getElementById('team-login-overlay');
            if (existingLogin && !force) {
                if (existingLogin.style.display === 'none') {
                    existingLogin.style.display = 'flex';
                }
                const app = document.getElementById('app');
                if (app) app.style.display = 'none';
                return;
            }

            const app = document.getElementById('app');
            if (app) app.style.display = 'none';

            const authOverlay = document.getElementById('auth-overlay');
            if (authOverlay) authOverlay.style.display = 'none';

            if (existingLogin) existingLogin.remove();

            let users = [];
            try { users = JSON.parse(localStorage.getItem('acc_bayan_users') || '[]'); } catch (e) { }

            if (users.length === 0) {
                const ownerName = localStorage.getItem('acc_user_name') || 'المدير العام';
                // إذا كان المستخدم طه، سيظهر "المدير العام طه"
                const finalName = ownerName.includes('المدير') ? ownerName : `المدير العام ${ownerName}`;

                users.push({
                    id: 'admin1',
                    name: finalName,
                    role: 'admin',
                    pass: '123' // الباسورد الافتراضي لأول مرة فقط
                });
                localStorage.setItem('acc_bayan_users', JSON.stringify(users));
            }

            const lastEmpId = localStorage.getItem('acc_last_emp_id') || (users[0] ? users[0].id : '');
            const initialSavedPass = lastEmpId ? (localStorage.getItem('acc_saved_pass_' + lastEmpId) || '') : '';
            const savedTheme = localStorage.getItem('acc_login_theme') || 'theme-city';
            const loginHTML = `
        <div id="team-login-overlay" class="${savedTheme}" style="position:fixed; top:0; left:0; width:100%; height:100%; z-index:9999999; display:flex; justify-content:center; align-items:center; direction: rtl; font-family: 'Poppins', 'El Messiri', sans-serif; transition: background 0.8s ease, background-image 0.8s ease; background-size: cover; background-position: center; overflow-y: auto;">
            <style>
                #team-login-overlay.theme-dark {
                    background: radial-gradient(circle at center, #1e293b 0%, #0f172a 60%, #020617 100%) !important;
                }
                #team-login-overlay.theme-city {
                    background-image: url('https://images.unsplash.com/photo-1508962914676-134849a727f0?q=80&w=1920') !important;
                    background-size: cover !important;
                    background-position: center !important;
                }
                #team-login-overlay.theme-cyan {
                    background-image: url('https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=1920') !important;
                    background-size: cover !important;
                    background-position: center !important;
                }
                #team-login-overlay.theme-purple {
                    background-image: url('https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1920') !important;
                    background-size: cover !important;
                    background-position: center !important;
                }
                #team-login-overlay.theme-custom {
                    background-image: url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920') !important;
                    background-size: cover !important;
                    background-position: center !important;
                }
                #team-login-overlay.theme-desert {
                    background-image: url('https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=1920') !important;
                    background-size: cover !important;
                    background-position: center !important;
                }
                #team-login-overlay.theme-cyberpunk {
                    background-image: url('https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?q=80&w=1920') !important;
                    background-size: cover !important;
                    background-position: center !important;
                }
                #team-login-overlay.theme-gold {
                    background-image: url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1920') !important;
                    background-size: cover !important;
                    background-position: center !important;
                }
                #team-login-overlay.theme-white {
                    background: radial-gradient(circle at center, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%) !important;
                }

                #team-login-theme-selector button:hover {
                    transform: scale(1.15) translateX(3px) !important;
                    box-shadow: 0 0 16px rgba(0, 216, 255, 0.6) !important;
                    border-color: #00d8ff !important;
                }
                
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(35px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes heartbeat {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.15); }
                    100% { transform: scale(1); }
                }
                
                #team-login-overlay .login-card {
                    position: relative;
                    width: 100%;
                    max-width: 440px;
                    background: rgba(15, 23, 42, 0.82);
                    backdrop-filter: blur(30px);
                    -webkit-backdrop-filter: blur(30px);
                    border: 1.5px solid rgba(0, 216, 255, 0.5);
                    border-radius: 30px;
                    padding: 38px 32px;
                    box-shadow: 0 0 35px rgba(0, 216, 255, 0.2), 0 25px 50px rgba(0, 0, 0, 0.7);
                    color: #fff;
                    text-align: center;
                    box-sizing: border-box;
                    animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                    margin: 20px;
                }
                
                #team-login-overlay .login-input-wrapper {
                    position: relative;
                    margin-bottom: 20px;
                    width: 100%;
                }
                
                #team-login-overlay .login-input {
                    width: 100%;
                    padding: 14px 25px;
                    background: rgba(255, 255, 255, 0.08) !important;
                    border: 1px solid rgba(255, 255, 255, 0.15) !important;
                    border-radius: 30px !important;
                    color: #fff !important;
                    font-size: 15px !important;
                    outline: none !important;
                    text-align: center !important;
                    transition: 0.3s ease !important;
                    box-sizing: border-box !important;
                }
                
                #team-login-overlay .login-input:focus {
                    border-color: #00d8ff !important;
                    box-shadow: 0 0 15px rgba(0, 216, 255, 0.35) !important;
                    background: rgba(255, 255, 255, 0.13) !important;
                }
                
                #team-login-overlay .login-btn-cyan {
                    width: 100%;
                    padding: 14px;
                    background: #00d8ff !important;
                    color: #000 !important;
                    border: none !important;
                    border-radius: 30px !important;
                    font-weight: 900 !important;
                    font-size: 16px !important;
                    cursor: pointer !important;
                    transition: 0.3s ease !important;
                    box-shadow: 0 0 20px rgba(0, 216, 255, 0.4) !important;
                }
                
                #team-login-overlay .login-btn-cyan:hover {
                    background: #00f0ff !important;
                    box-shadow: 0 0 25px rgba(0, 240, 255, 0.6) !important;
                    transform: translateY(-2px);
                }

                #team-login-overlay .login-btn-gold {
                    width: 100%;
                    padding: 14px;
                    background: linear-gradient(90deg, #d4af37, #b8860b) !important;
                    color: #000 !important;
                    border: none !important;
                    border-radius: 30px !important;
                    font-weight: 900 !important;
                    font-size: 15px !important;
                    cursor: pointer !important;
                    transition: 0.3s ease !important;
                    box-shadow: 0 0 22px rgba(212, 175, 55, 0.45) !important;
                }

                #team-login-overlay .login-btn-gold:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 0 30px rgba(212, 175, 55, 0.7) !important;
                }
            </style>

            <!-- Center Card (Login Card) -->
            <div class="login-card">
                <!-- Card Header (Luxury Enterprise Identity) -->
                <div style="margin-bottom: 18px;">
                    <div style="width: 58px; height: 58px; margin: 0 auto 12px auto; border-radius: 18px; background: linear-gradient(135deg, rgba(0, 216, 255, 0.2), rgba(2, 132, 199, 0.4)); border: 1.5px solid rgba(0, 216, 255, 0.6); display: flex; align-items: center; justify-content: center; font-size: 26px; box-shadow: 0 0 25px rgba(0, 216, 255, 0.35);">
                        💎
                    </div>
                    <h2 style="font-size: 24px; font-weight: 900; letter-spacing: 1px; color: #fff; margin: 0 0 6px 0; font-family: 'Readex Pro', 'Tajawal', sans-serif;">
                        بيــان للمحاسـبة <span style="font-size: 13px; background: rgba(0, 216, 255, 0.18); color: #00d8ff; padding: 2px 8px; border-radius: 8px; border: 1px solid rgba(0, 216, 255, 0.4); font-weight: 800;">PRO</span>
                    </h2>
                    <p id="login-status-hint" style="color: ${initialSavedPass ? '#38bdf8' : '#94a3b8'}; font-size: 12px; margin: 0; font-weight: 700;">
                        ${initialSavedPass ? '🔒 تم استرجاع الرمز السري — جاهز للدخول الفوري' : 'نظام بيان لتسجيل دخول الموظفين وفريق العمل'}
                    </p>
                </div>

                <!-- Tab Selection (Dual Switches at top of login) -->
                <div style="display: flex; background: rgba(0,0,0,0.35); border-radius: 20px; padding: 4px; margin-bottom: 22px; border: 1.5px solid rgba(255,255,255,0.08);">
                    <button type="button" onclick="window.switchTeamLoginTab('signin')" id="team-tab-btn-signin" style="flex: 1; padding: 8px 12px; border: none; border-radius: 16px; background: #00d8ff; color: #000; font-weight: 900; cursor: pointer; transition: 0.3s; font-size: 13px; font-family: inherit;">تسجيل الدخول</button>
                    <button type="button" onclick="window.switchTeamLoginTab('signup')" id="team-tab-btn-signup" style="flex: 1; padding: 8px 12px; border: none; border-radius: 16px; background: transparent; color: #94a3b8; font-weight: 900; cursor: pointer; transition: 0.3s; font-size: 13px; font-family: inherit;">👑 حساب جديد</button>
                </div>

                <!-- SECTION 1: SIGN IN -->
                <div id="team-sec-signin" style="display: block;">
                    <!-- Dropdown Select User -->
                    <div class="login-input-wrapper">
                        <select id="login-user-select" class="login-input" onchange="window.onLoginUserChange(this.value)" onkeydown="if(event.key === 'Enter') window.attemptTeamLogin()" style="appearance: none; -webkit-appearance: none; cursor: pointer;">
                            <option value="" disabled ${!lastEmpId ? 'selected' : ''}>-- اختر مستخدم --</option>
                            ${users.map(u => `<option value="${u.id}" ${u.id == lastEmpId ? 'selected' : ''} style="background: #111827; color: #fff;">${u.name}</option>`).join('')}
                        </select>
                        <span style="position: absolute; left: 20px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #94a3b8; font-size: 12px;">▼</span>
                    </div>

                    <!-- Password Input -->
                    <div class="login-input-wrapper">
                        <input type="password" id="login-user-pass" class="login-input" value="${initialSavedPass}" placeholder="الرمز السري الخاص بك" autocomplete="current-password">
                        <span id="eyeLogin" onclick="window.toggleEmpPasswordVisibility()" style="position: absolute; left: 20px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #94a3b8; font-size: 16px; transition: 0.2s;">👁️</span>
                    </div>
                    
                    <div style="display: flex; align-items: center; justify-content: space-between; margin: 8px 0 15px 0; padding: 0 2px;">
                        <label style="display: flex; align-items: center; gap: 8px; color: #cbd5e1; font-size: 12px; cursor: pointer;">
                            <input type="checkbox" id="rememberEmpPassCheck" checked style="accent-color: #00d8ff; cursor: pointer; width: 15px; height: 15px;">
                            <span>تذكر الرمز السري لهذا المستخدم 🔒</span>
                        </label>
                    </div>

                    <button class="login-btn-cyan" onclick="window.attemptTeamLogin()" style="display: flex; align-items: center; justify-content: center; gap: 8px; font-family: inherit;">
                        <span>تسجيل الدخول السريع</span>
                        <span style="font-size: 18px; line-height: 1;">➔</span>
                    </button>
                    
                    <div style="margin-top: 18px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 14px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
                        <a href="#" onclick="event.preventDefault(); window.handleForgotPasswordAction && window.handleForgotPasswordAction()" style="color: #ff3b7e; text-decoration: none; transition: all 0.3s;" onmouseover="this.style.textShadow='0 0 10px rgba(255,59,126,0.6)'" onmouseout="this.style.textShadow='none'">🔒 نسيت كود السر؟</a>
                        
                        <a href="#" onclick="event.preventDefault(); window.handleOpenSerialLogin && window.handleOpenSerialLogin()" style="color: #38bdf8; text-decoration: none; transition: all 0.3s;" onmouseover="this.style.textShadow='0 0 10px rgba(56,189,248,0.6)'" onmouseout="this.style.textShadow='none'">🔑 سيريال آخر</a>

                        <a href="#" onclick="event.preventDefault(); window.handleCreateNewAccountAction && window.handleCreateNewAccountAction()" style="color: #a855f7; text-decoration: none; transition: all 0.3s;" onmouseover="this.style.textShadow='0 0 10px rgba(168,85,247,0.6)'" onmouseout="this.style.textShadow='none'">👥 إضافة موظف</a>
                    </div>
                </div>

                <!-- SECTION 2: SIGN UP -->
                <div id="team-sec-signup" style="display: none;">
                    <div style="background: rgba(212, 175, 55, 0.08); border: 1px dashed rgba(212, 175, 55, 0.35); border-radius: 14px; padding: 10px 12px; margin-bottom: 18px; text-align: center; color: #fde047; font-size: 12px; font-weight: bold;">
                        🌟 إنشاء منشأة جديدة وتوليد كود ترخيص وقاعدة بيانات نظيفة
                    </div>

                    <div class="login-input-wrapper">
                        <input type="text" id="team-new-user-name" class="login-input" placeholder="اسم المنشأة / المدير (مثال: اسم محلك أو شركتك أو اسمك)">
                    </div>
                    
                    <div class="login-input-wrapper">
                        <input type="tel" id="team-new-user-phone" class="login-input" placeholder="رقم الهاتف (لتأمين حسابك)">
                    </div>

                    <div class="login-input-wrapper" style="position: relative;">
                        <input type="password" id="team-new-user-pass" class="login-input" placeholder="كلمة سر المدير العام (4 أرقام أو حروف على الأقل)">
                        <span onclick="const p = document.getElementById('team-new-user-pass'); if(p){ p.type = p.type==='password'?'text':'password'; this.textContent = p.type==='password'?'👁️':'🔒'; }" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #94a3b8; font-size: 14px; user-select: none;">👁️</span>
                    </div>
                    
                    <button id="team-generate-serial-btn" onclick="window.handleGenerateNewFacilityAccount('team-new-user-name', 'team-new-user-phone', 'team-new-user-pass')" class="login-btn-gold">
                        إنشاء حساب وتوليد كود 👑
                    </button>

                    <p style="color: #94a3b8; font-size: 11px; margin-top: 14px; margin-bottom: 0;">
                        سيفتح البرنامج كصفحة بيضاء جديدة بالكامل ومربوطاً بقاعدة بيانات نظيفة 🌟
                    </p>
                </div>
            </div>

            <!-- Side Vertical Background Theme Selector (Sleek Luxury Edge Dock) -->
            <div id="team-login-theme-selector" style="position: fixed; left: 0; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 8px; background: rgba(15, 23, 42, 0.88); backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px); padding: 14px 10px 14px 8px; border-radius: 0 24px 24px 0; border: 1.5px solid rgba(0, 216, 255, 0.4); border-left: none; box-shadow: 12px 0 35px rgba(0,0,0,0.7), 0 0 25px rgba(0,216,255,0.2); z-index: 10000; align-items: center; justify-content: flex-start; max-height: calc(100vh - 40px); overflow-y: auto; overflow-x: hidden; scrollbar-width: none;">
                <!-- Theme Header Icon & Glow Accent -->
                <div style="font-size: 15px; margin-bottom: 2px; user-select: none; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 0 6px rgba(0, 216, 255, 0.6));" title="اختر مظهر وخلفية الشاشة">🎨</div>
                <div style="width: 20px; height: 1.5px; background: linear-gradient(90deg, #00d8ff, rgba(0, 216, 255, 0.2)); margin-bottom: 6px; border-radius: 2px;"></div>

                <!-- 1. City Sunset -->
                <button onclick="window.applyTeamLoginTheme('theme-city')" style="border: none; width: 34px; height: 34px; border-radius: 11px; background-image: url('https://images.unsplash.com/photo-1508962914676-134849a727f0?q=80&w=150'); background-size: cover; background-position: center; cursor: pointer; border: 1.5px solid rgba(255,255,255,0.25); transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); flex-shrink: 0;" title="🌆 غروب المدينة الحديثة" id="btn-team-theme-city"></button>

                <!-- 2. Dark Luxury -->
                <button onclick="window.applyTeamLoginTheme('theme-dark')" style="border: none; width: 34px; height: 34px; border-radius: 11px; background: radial-gradient(circle at center, #334155 0%, #0f172a 100%); cursor: pointer; border: 1.5px solid rgba(255,255,255,0.25); transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); flex-shrink: 0;" title="🖤 الفخامة الداكنة الملكية" id="btn-team-theme-dark"></button>

                <!-- 3. Emerald Aurora -->
                <button onclick="window.applyTeamLoginTheme('theme-cyan')" style="border: none; width: 34px; height: 34px; border-radius: 11px; background-image: url('https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=150'); background-size: cover; background-position: center; cursor: pointer; border: 1.5px solid rgba(255,255,255,0.25); transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); flex-shrink: 0;" title="✨ الشفق القطبي الزمردي" id="btn-team-theme-cyan"></button>

                <!-- 4. Cosmic Purple Nebula -->
                <button onclick="window.applyTeamLoginTheme('theme-purple')" style="border: none; width: 34px; height: 34px; border-radius: 11px; background-image: url('https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=150'); background-size: cover; background-position: center; cursor: pointer; border: 1.5px solid rgba(255,255,255,0.25); transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); flex-shrink: 0;" title="🔮 سديم الفضاء الأرجواني" id="btn-team-theme-purple"></button>

                <!-- 5. Cyber Earth Space -->
                <button onclick="window.applyTeamLoginTheme('theme-custom')" style="border: none; width: 34px; height: 34px; border-radius: 11px; background-image: url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=150'); background-size: cover; background-position: center; cursor: pointer; border: 1.5px solid rgba(255,255,255,0.25); transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); flex-shrink: 0;" title="🌐 فضاء النيون الرقمي" id="btn-team-theme-custom"></button>

                <!-- 6. Desert Night -->
                <button onclick="window.applyTeamLoginTheme('theme-desert')" style="border: none; width: 34px; height: 34px; border-radius: 11px; background-image: url('https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=150'); background-size: cover; background-position: center; cursor: pointer; border: 1.5px solid rgba(255,255,255,0.25); transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); flex-shrink: 0;" title="🏜️ ليلة الصحراء الذهبية" id="btn-team-theme-desert"></button>

                <!-- 7. Tokyo Cyberpunk -->
                <button onclick="window.applyTeamLoginTheme('theme-cyberpunk')" style="border: none; width: 34px; height: 34px; border-radius: 11px; background-image: url('https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?q=80&w=150'); background-size: cover; background-position: center; cursor: pointer; border: 1.5px solid rgba(255,255,255,0.25); transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); flex-shrink: 0;" title="⚡ طوكيو نيون سايبربانك" id="btn-team-theme-cyberpunk"></button>

                <!-- 8. Liquid Gold Waves -->
                <button onclick="window.applyTeamLoginTheme('theme-gold')" style="border: none; width: 34px; height: 34px; border-radius: 11px; background-image: url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=150'); background-size: cover; background-position: center; cursor: pointer; border: 1.5px solid rgba(255,255,255,0.25); transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); flex-shrink: 0;" title="👑 تموجات الذهب الملكية" id="btn-team-theme-gold"></button>

                <!-- 9. Pearl White Modern -->
                <button onclick="window.applyTeamLoginTheme('theme-white')" style="border: none; width: 34px; height: 34px; border-radius: 11px; background: radial-gradient(circle at center, #ffffff 0%, #cbd5e1 100%); cursor: pointer; border: 1.5px solid rgba(255,255,255,0.25); transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); flex-shrink: 0;" title="🤍 اللؤلؤ الأبيض النقي" id="btn-team-theme-white"></button>
            </div>

            <!-- Bottom-Right Luxury Clock Widget -->
            <div id="team-login-bottom-widget" style="position: absolute; bottom: 30px; right: 30px; left: auto; background: rgba(17, 24, 39, 0.6); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); border: 1px solid rgba(255,255,255,0.08); padding: 12px 25px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; color: #fff; z-index: 1000; min-width: 190px;">
                <div id="team-login-widget-date-btm" style="font-size: 13px; font-weight: bold; color: #cbd5e1; margin-bottom: 2px;">...</div>
                <div id="team-login-widget-time-btm" style="font-size: 22px; font-weight: 900; font-family: 'Poppins', sans-serif; color: #00d8ff; text-shadow: 0 0 15px rgba(0, 216, 255, 0.6); letter-spacing: 1px;">...</div>
            </div>
        </div>`;
            document.body.insertAdjacentHTML('beforeend', loginHTML);

            // Clock logic for bottom widget
            function updateTeamLoginBottomWidgetTime() {
                const timeEl = document.getElementById('team-login-widget-time-btm');
                const dateEl = document.getElementById('team-login-widget-date-btm');

                if (!timeEl) return;

                const now = new Date();

                // Time format: AM/PM H:MM
                let hours = now.getHours();
                const minutes = String(now.getMinutes()).padStart(2, '0');
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours ? hours : 12;

                timeEl.textContent = `${ampm} ${hours}:${minutes}`;

                const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
                const dayName = days[now.getDay()];

                const months = [
                    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
                ];
                if (dateEl) {
                    dateEl.textContent = `${dayName}، ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
                }
            }

            // Toggle employee password visibility
            window.toggleEmpPasswordVisibility = function () {
                const input = document.getElementById('login-user-pass');
                const eye = document.getElementById('eyeLogin');
                if (!input || !eye) return;

                if (input.type === 'password') {
                    input.type = 'text';
                    eye.style.color = '#00d8ff';
                    eye.style.textShadow = '0 0 8px rgba(0,216,255,0.5)';
                } else {
                    input.type = 'password';
                    eye.style.color = '#94a3b8';
                    eye.style.textShadow = 'none';
                }
            };

            // Theme switching logic inside team login overlay
            window.applyTeamLoginTheme = function (themeClass) {
                const overlay = document.getElementById('team-login-overlay');
                if (!overlay) return;

                overlay.className = ''; // Reset classes
                overlay.classList.add(themeClass);

                localStorage.setItem('acc_login_theme', themeClass);

                // Sync with auth-overlay if it exists
                const authOverlay = document.getElementById('auth-overlay');
                if (authOverlay) {
                    authOverlay.className = '';
                    authOverlay.classList.add(themeClass);
                }

                // Highlight active border on selector preview buttons
                const buttons = overlay.querySelectorAll('#team-login-theme-selector button');
                buttons.forEach(btn => {
                    const btnId = btn.id || '';
                    const isMatch = btnId === 'btn-team-' + themeClass;
                    
                    if (isMatch) {
                        btn.style.border = '2.5px solid #00d8ff';
                        btn.style.transform = 'scale(1.18) translateX(3px)';
                        btn.style.boxShadow = '0 0 18px rgba(0, 216, 255, 0.9)';
                    } else {
                        btn.style.border = '1.5px solid rgba(255,255,255,0.25)';
                        btn.style.transform = 'scale(1)';
                        btn.style.boxShadow = 'none';
                    }
                });
            };

            // Initialize clock and theme active borders
            setInterval(updateTeamLoginBottomWidgetTime, 1000);
            updateTeamLoginBottomWidgetTime();
            setTimeout(() => {
                let activeTheme = localStorage.getItem('acc_login_theme') || 'theme-city';
                if (activeTheme.startsWith('theme-uploaded')) {
                    activeTheme = 'theme-city';
                    localStorage.setItem('acc_login_theme', 'theme-city');
                }
                window.applyTeamLoginTheme(activeTheme);
            }, 50);

            window.onLoginUserChange = function (userId) {
                if (!userId) return;
                const passInput = document.getElementById('login-user-pass');
                const hint = document.getElementById('login-status-hint');
                if (passInput) {
                    const users = JSON.parse(localStorage.getItem('acc_bayan_users') || '[]');
                    const selected = users.find(u => String(u.id) === String(userId));
                    // حماية الحسابات الإدارية: منع الملء التلقائي لكلمة سر المدير على الأجهزة المشتركة
                    if (selected && selected.role === 'admin') {
                        passInput.value = '';
                        passInput.focus();
                        if (hint) {
                            hint.textContent = '🔐 حساب إداري: يرجى كتابة الرمز السري يدوياً للتأكيد';
                            hint.style.color = '#fbbf24';
                        }
                        return;
                    }

                    const saved = localStorage.getItem('acc_saved_pass_' + userId) || '';
                    passInput.value = saved;
                    passInput.focus();
                    if (saved) {
                        passInput.select();
                        if (hint) {
                            hint.textContent = '🔒 تم استرجاع الرمز السري — جاهز للدخول الفوري';
                            hint.style.color = '#38bdf8';
                        }
                    } else {
                        if (hint) {
                            hint.textContent = 'أدخل الرمز السري لهذا المستخدم';
                            hint.style.color = '#94a3b8';
                        }
                    }
                }
            };

            window.switchTeamLoginTab = function (tab) {
                const signinSec = document.getElementById('team-sec-signin');
                const signupSec = document.getElementById('team-sec-signup');
                const btnSignin = document.getElementById('team-tab-btn-signin');
                const btnSignup = document.getElementById('team-tab-btn-signup');
                const hint = document.getElementById('login-status-hint');

                if (!signinSec || !signupSec || !btnSignin || !btnSignup) return;

                if (tab === 'signin') {
                    signinSec.style.display = 'block';
                    signupSec.style.display = 'none';
                    btnSignin.style.background = '#00d8ff';
                    btnSignin.style.color = '#000';
                    btnSignup.style.background = 'transparent';
                    btnSignup.style.color = '#94a3b8';
                    if (hint) hint.textContent = 'نظام بيان لتسجيل دخول الموظفين وفريق العمل';
                } else {
                    signinSec.style.display = 'none';
                    signupSec.style.display = 'block';
                    btnSignup.style.background = 'linear-gradient(90deg, #d4af37, #b8860b)';
                    btnSignup.style.color = '#000';
                    btnSignin.style.background = 'transparent';
                    btnSignin.style.color = '#94a3b8';
                    if (hint) hint.textContent = 'إنشاء حساب وترخيص منشأة جديدة بالكامل';
                    setTimeout(() => {
                        const nameInp = document.getElementById('team-new-user-name');
                        if (nameInp) nameInp.focus();
                    }, 100);
                }
            };

            window.handleOpenSerialLogin = function () {
                const existing = document.getElementById('quick-serial-modal');
                if (existing) existing.remove();

                const currentSerial = localStorage.getItem('app_auth_serial') || '';

                const modalHtml = `
                <div id="quick-serial-modal" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.85); z-index:22000000; display:flex; justify-content:center; align-items:center; direction:rtl; font-family:'Readex Pro', 'Tajawal', 'El Messiri', sans-serif; backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);">
                    <div style="background:linear-gradient(145deg, #111827, #1e293b); border:1.5px solid #00d8ff; border-radius:28px; width:92%; max-width:440px; padding:32px 28px; box-shadow:0 0 50px rgba(0, 216, 255, 0.25), 0 25px 50px rgba(0,0,0,0.85); text-align:center; color:#fff; position:relative;">
                        
                        <div style="width:56px; height:56px; margin:0 auto 14px auto; border-radius:18px; background:rgba(0, 216, 255, 0.12); border:1.5px solid #00d8ff; display:flex; align-items:center; justify-content:center; font-size:26px; box-shadow:0 0 20px rgba(0, 216, 255, 0.3);">🔑</div>
                        
                        <h3 style="margin:0 0 6px 0; font-size:20px; font-weight:800; color:#fff; font-family:'Poppins', 'Readex Pro', sans-serif;">تسجيل الدخول بسيريال آخر</h3>
                        <p style="color:#94a3b8; font-size:12px; margin:0 0 20px 0; line-height:1.5;">أدخل كود السيريال الخاص بالمنشأة أو الحساب المطلوب للتبديل إليه فوراً</p>
                        
                        <div style="position:relative; margin-bottom:18px;">
                            <input type="text" id="quick-serial-input" placeholder="BYN-XXXX-XXXX" value="" 
                                style="width:100%; box-sizing:border-box; background:rgba(15, 23, 42, 0.85); border:1.5px solid rgba(0, 216, 255, 0.5); border-radius:16px; padding:14px 18px; color:#fff; font-size:16px; font-family:'Poppins', monospace; letter-spacing:2px; text-transform:uppercase; text-align:center; outline:none; transition:0.3s; box-shadow:inset 0 2px 4px rgba(0,0,0,0.4);"
                                onfocus="this.style.borderColor='#00d8ff'; this.style.boxShadow='0 0 15px rgba(0, 216, 255, 0.4), inset 0 2px 4px rgba(0,0,0,0.4)';"
                                onblur="this.style.borderColor='rgba(0, 216, 255, 0.5)'; this.style.boxShadow='inset 0 2px 4px rgba(0,0,0,0.4)';"
                            />
                        </div>

                        ${currentSerial ? `
                        <div style="font-size:11px; color:#64748b; margin-bottom:18px; direction:ltr; text-align:center;">
                            السيريال الحالي النشط: <span style="color:#38bdf8; font-family:monospace; font-weight:bold;">${currentSerial}</span>
                        </div>` : ''}

                        <div style="display:flex; gap:10px;">
                            <button id="quick-serial-submit-btn" onclick="window.submitQuickSerialLogin()" 
                                style="flex:2; padding:12px 16px; background:linear-gradient(135deg, #0284c7 0%, #00d8ff 100%); color:#000; border:none; border-radius:14px; font-weight:800; font-size:14px; cursor:pointer; font-family:inherit; transition:0.25s; box-shadow:0 4px 15px rgba(0, 216, 255, 0.35);">
                                دخول بالسيريال 🚀
                            </button>
                            <button onclick="document.getElementById('quick-serial-modal').remove()" 
                                style="flex:1; padding:12px 14px; background:rgba(255,255,255,0.06); color:#cbd5e1; border:1px solid rgba(255,255,255,0.15); border-radius:14px; font-weight:700; font-size:13px; cursor:pointer; font-family:inherit; transition:0.25s;">
                                إلغاء ✖
                            </button>
                        </div>
                    </div>
                </div>`;

                document.body.insertAdjacentHTML('beforeend', modalHtml);

                setTimeout(() => {
                    const inp = document.getElementById('quick-serial-input');
                    if (inp) {
                        inp.focus();
                        inp.onkeydown = (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                window.submitQuickSerialLogin();
                            } else if (e.key === 'Escape') {
                                const m = document.getElementById('quick-serial-modal');
                                if (m) m.remove();
                            }
                        };
                    }
                }, 100);
            };

            window.submitQuickSerialLogin = function () {
                const inp = document.getElementById('quick-serial-input');
                const val = inp ? inp.value.trim().toUpperCase() : '';
                if (!val) {
                    if (typeof showToast === 'function') showToast('⚠️ يرجى إدخال كود السيريال للمتابعة', 'warning');
                    else if (typeof showModernAlert === 'function') showModernAlert('يرجى إدخال كود السيريال للمتابعة', 'warning');
                    if (inp) inp.focus();
                    return;
                }
                if (typeof window.loginWithSerial === 'function') {
                    window.loginWithSerial(val, true);
                } else {
                    console.warn("loginWithSerial not yet ready");
                }
            };

            setTimeout(() => {
                const pi = document.getElementById('login-user-pass');
                const select = document.getElementById('login-user-select');
                if (select && select.value) {
                    const saved = localStorage.getItem('acc_saved_pass_' + select.value) || '';
                    if (pi && saved && !pi.value) {
                        pi.value = saved;
                    }
                }
                if (pi) { 
                    pi.focus(); 
                    if (pi.value) pi.select();
                    pi.onkeydown = (e) => { if (e.key === 'Enter') window.attemptTeamLogin(); }; 
                }

                ['team-new-user-name', 'team-new-user-phone', 'team-new-user-pass'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.onkeydown = (e) => {
                            if (e.key === 'Enter') {
                                window.handleGenerateNewFacilityAccount('team-new-user-name', 'team-new-user-phone', 'team-new-user-pass');
                            }
                        };
                    }
                });
            }, 100);
        };

        window.attemptTeamLogin = async function () {
            const select = document.getElementById('login-user-select');
            const passInput = document.getElementById('login-user-pass');
            if (!select || !passInput) return;

            const userId = select.value;
            const rawPass = passInput.value;

            if (!userId) {
                if (window.showToast) window.showToast('⚠️ يرجى اختيار اسم المستخدم من القائمة أولاً', 'warning');
                else alert('يرجى اختيار اسم المستخدم');
                return;
            }

            if (!rawPass || !rawPass.trim()) {
                if (window.showToast) window.showToast('⚠️ يرجى إدخال الرمز السري / كلمة المرور', 'warning');
                else alert('يرجى إدخال كلمة المرور');
                passInput.focus();
                return;
            }

            const cleanDigitStr = (str) => {
                if (str === null || str === undefined) return '';
                let s = String(str).trim();
                const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
                const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
                for (let i = 0; i < 10; i++) {
                    s = s.split(easternDigits[i]).join(String(i));
                    s = s.split(persianDigits[i]).join(String(i));
                }
                return s;
            };

            const typedPassClean = cleanDigitStr(rawPass);

            let users = [];
            try { users = JSON.parse(localStorage.getItem('acc_bayan_users') || '[]'); } catch (e) { }

            const selectedUser = users.find(u => String(u.id) === String(userId) || String(u.name) === String(userId));

            if (!selectedUser) {
                if (window.showToast) window.showToast('❌ لم يتم العثور على اسم المستخدم المحدد', 'error');
                return;
            }

            const userPassClean = cleanDigitStr(selectedUser.pass);
            const userEmClean = cleanDigitStr(selectedUser.emergencyCode);

            let isEmergencyMatch = false;
            if (selectedUser.emergencyCode) {
                if (window.BayanSecurity && typeof window.BayanSecurity.verifyPassword === 'function') {
                    const emCheck = await window.BayanSecurity.verifyPassword(typedPassClean || rawPass, selectedUser.emergencyCode);
                    isEmergencyMatch = emCheck.valid;
                    if (emCheck.valid && emCheck.needMigration && emCheck.newHash) {
                        selectedUser.emergencyCode = emCheck.newHash;
                        try {
                            localStorage.setItem('acc_bayan_users', JSON.stringify(users));
                            if (typeof window.saveToCloud === 'function') window.saveToCloud();
                        } catch (e) { }
                    }
                } else {
                    isEmergencyMatch = (userEmClean && typedPassClean === userEmClean);
                }
            }

            let isPasswordMatch = false;
            if (window.BayanSecurity && typeof window.BayanSecurity.verifyPassword === 'function') {
                const verifyRes = await window.BayanSecurity.verifyPassword(typedPassClean || rawPass, selectedUser.pass);
                isPasswordMatch = verifyRes.valid;
                // ترقية الحساب القديم تلقائياً إلى التشفير العالي (Auto-Migration)
                if (verifyRes.valid && verifyRes.needMigration && verifyRes.newHash) {
                    selectedUser.pass = verifyRes.newHash;
                    try {
                        localStorage.setItem('acc_bayan_users', JSON.stringify(users));
                        if (typeof window.saveToCloud === 'function') window.saveToCloud();
                    } catch (e) { }
                }
            } else {
                isPasswordMatch = (
                    (typedPassClean && typedPassClean === userPassClean) ||
                    (rawPass.trim() === String(selectedUser.pass).trim())
                );
            }

            // 1. الدخول بكود الطوارئ
            if (isEmergencyMatch) {
                if (window.showToast) window.showToast(`🆘 تم الدخول عبر كود الطوارئ لـ: ${selectedUser.name}`, 'warning');

                localStorage.setItem('acc_current_user_name', selectedUser.name);
                localStorage.setItem('acc_current_user_id', selectedUser.id);
                localStorage.setItem('acc_current_user_role', selectedUser.role || 'staff');
                sessionStorage.setItem('acc_logged_in_session', 'true');
                sessionStorage.setItem('acc_auto_enter', 'true');

                const loginBtn = document.querySelector('.login-btn-cyan');
                if (loginBtn) {
                    loginBtn.innerHTML = '<span style="display:inline-block; animation: spin 1s linear infinite;">⏳</span> جاري التحميل...';
                    loginBtn.style.pointerEvents = 'none';
                }

                setTimeout(() => {
                    const overlay = document.getElementById('team-login-overlay');
                    if (overlay) {
                        overlay.style.transition = 'opacity 0.3s ease';
                        overlay.style.opacity = '0';
                    }

                    setTimeout(() => {
                        if (overlay) overlay.remove();
                        document.getElementById('app').style.display = 'block';
                        updateHeaderName();
                        if (typeof render === 'function') requestAnimationFrame(render);
                        setTimeout(() => {
                            if (typeof window.refreshAllCharts === 'function') window.refreshAllCharts();
                        }, 100);

                        setTimeout(() => {
                            if (typeof startRealtimeSync === 'function') startRealtimeSync();
                        }, 300);
                    }, 300);
                }, 50);
                return;
            }

            // 2. الدخول بكلمة المرور الرئيسية
            if (isPasswordMatch) {
                const user = selectedUser;
                // Save Session
                localStorage.setItem('acc_current_user_name', user.name);
                localStorage.setItem('acc_current_user_id', user.id);
                localStorage.setItem('acc_current_user_role', user.role || 'staff');
                sessionStorage.setItem('acc_logged_in_session', 'true');
                sessionStorage.setItem('acc_auto_enter', 'true');
                // حفظ وقت بداية الجلسة للتحقق من انتهاء الصلاحية (7 أيام)
                localStorage.setItem('acc_session_timestamp', Date.now().toString());

                // حفظ كلمة المرور تلقائياً لتسجيل الدخول السريع في المرات القادمة (للموظفين فقط وليس المديرين)
                const rememberCheck = document.getElementById('rememberEmpPassCheck');
                const shouldRemember = rememberCheck ? rememberCheck.checked : true;
                if (user.role === 'admin') {
                    localStorage.removeItem('acc_saved_pass_' + user.id);
                } else if (shouldRemember) {
                    localStorage.setItem('acc_saved_pass_' + user.id, rawPass.trim());
                } else {
                    localStorage.removeItem('acc_saved_pass_' + user.id);
                }

                // تحديث الموظف المسؤول في السيرفر ليعرف المدير من يستخدم الجهاز حالياً
                try {
                    const serial = localStorage.getItem('app_auth_serial');
                    const devId = localStorage.getItem('acc_device_id');
                    const firestoreDb = window.db || (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length ? firebase.firestore() : null);
                    if (serial && devId && firestoreDb && typeof firestoreDb.collection === 'function') {
                        firestoreDb.collection("users").doc(serial).collection("devices").doc(devId).update({
                            currentUser: user.name
                        }).catch(e => console.warn("Device status update postponed offline:", e));
                    }
                } catch (err) {
                    console.warn("Device status update ignored:", err);
                }

                // Remember for next time
                localStorage.setItem('acc_last_emp_id', user.id);
                localStorage.setItem('acc_last_emp_name', user.name);

                // Log login event
                try {
                    const logs = JSON.parse(localStorage.getItem('acc_user_activity_logs') || '[]');
                    logs.push({
                        userId: user.id,
                        userName: user.name,
                        type: 'login',
                        timestamp: new Date().toISOString()
                    });
                    localStorage.setItem('acc_user_activity_logs', JSON.stringify(logs.slice(-1000)));
                } catch (e) { }

                const loginBtn = document.querySelector('.login-btn-cyan');
                if (loginBtn) {
                    loginBtn.innerHTML = '<span style="display:inline-block; animation: spin 1s linear infinite;">⏳</span> جاري التحميل...';
                    loginBtn.style.opacity = '0.8';
                    loginBtn.style.pointerEvents = 'none';
                }

                setTimeout(() => {
                    const overlay = document.getElementById('team-login-overlay');
                    if (overlay) {
                        overlay.style.transition = 'opacity 0.3s ease';
                        overlay.style.opacity = '0';
                    }

                    setTimeout(() => {
                        if (overlay) overlay.remove();
                        document.getElementById('app').style.display = 'block';
                        updateHeaderName();
                        if (typeof render === 'function') requestAnimationFrame(render);
                        setTimeout(() => {
                            if (typeof window.refreshAllCharts === 'function') window.refreshAllCharts();
                        }, 100);

                        setTimeout(() => {
                            if (typeof startRealtimeSync === 'function') startRealtimeSync();
                        }, 300);

                        if (window.showToast) window.showToast(`مرحباً بك: ${user.name} 👋`, 'success');
                    }, 300);
                }, 50);
            } else {
                // Failure Feedback
                if (window.showToast) window.showToast(`❌ كلمة السر غير صحيحة للمستخدم: ${selectedUser.name}`, 'error');
                else alert(`فشل تسجيل الدخول: كلمة السر غير صحيحة للمستخدم ${selectedUser.name}`);

                if (typeof beep === 'function') beep(400, 0.1, 0.2);

                const overlay = document.getElementById('team-login-overlay');
                if (overlay) {
                    const card = overlay.querySelector('.login-card');
                    if (card) {
                        card.style.animation = 'none';
                        void card.offsetWidth; // Trigger reflow
                        card.style.animation = 'shake 0.4s ease-in-out';
                    }
                }
            }
        };
        function updateHeaderName() {
            const ownerName = localStorage.getItem('acc_user_name') || 'المدير';
            const currentStaffName = localStorage.getItem('acc_current_user_name') || ownerName;

            // تحديث كل العناصر الممكنة في الواجهة
            const logNameEls = document.querySelectorAll('.user-name-text');
            logNameEls.forEach(el => el.textContent = currentStaffName);

            const headerIds = ['header-user-name-display', 'header-user-name-display-main', 'appTitle'];
            headerIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    if (id === 'appTitle') {
                        // الحفاظ على الهيكل مع الأفاتار
                        const prefix = localStorage.getItem('acc_app_name_prefix') || 'تطبيق المحاسبة اليومي';
                        const logo = localStorage.getItem('acc_user_logo');
                        const avatarHtml = logo ? `<img src="${logo}" class="header-avatar" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(currentStaffName)}&background=0f172a&color=fbbf24'">` : `<div class="header-avatar" style="display:flex; align-items:center; justify-content:center; font-size:14px;">👤</div>`;
                        el.innerHTML = `${avatarHtml} <span style="font-weight: 800;">${prefix} — ${currentStaffName}</span>`;
                    } else {
                        el.textContent = currentStaffName;
                    }
                }
            });

            document.title = currentStaffName;
        }

        // Session management is handled securely via init.js and lockAppNow (persistent 7-day session)

        window.showQuickStaffStats = function (userName) {
            const userRecords = records.filter(r => {
                const mName = localStorage.getItem('acc_user_name') || 'المدير العام';
                const dName = (!r.user || r.user === 'المدير العام' || r.user === 'المستخدم الافتراضي') ? mName : r.user;
                return dName === userName;
            });

            let totalTop = 0, totalBottom = 0, totalSold = 0;
            userRecords.forEach(r => {
                totalTop += (r.top || 0);
                totalBottom += (r.bottom || 0);
                totalSold += (r.cashSold || 0);
            });

            const statsHtml = `
            <div style="text-align:right; direction:rtl; font-family:'El Messiri', sans-serif;">
                <h3 style="color:#8b5cf6; margin-bottom:15px; border-bottom:1px solid rgba(139,92,246,0.3); padding-bottom:10px;">📊 أداء الموظف: ${userName}</h3>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px;">
                    <div style="background:rgba(34,197,94,0.1); padding:10px; border-radius:10px; border:1px solid rgba(34,197,94,0.2);">
                        <div style="font-size:11px; color:#4ade80;">إجمالي الوارد (فوق)</div>
                        <div style="font-size:18px; font-weight:bold; color:#fff;">${formatNum(totalTop)}</div>
                    </div>
                    <div style="background:rgba(239,68,68,0.1); padding:10px; border-radius:10px; border:1px solid rgba(239,68,68,0.2);">
                        <div style="font-size:11px; color:#f87171;">إجمالي المصروف (تحت)</div>
                        <div style="font-size:18px; font-weight:bold; color:#fff;">${formatNum(totalBottom)}</div>
                    </div>
                    <div style="grid-column:1/-1; background:rgba(245,158,11,0.1); padding:10px; border-radius:10px; border:1px solid rgba(245,158,11,0.2); text-align:center;">
                        <div style="font-size:11px; color:#fbbf24;">إجمالي المبيعات (بعت كام)</div>
                        <div style="font-size:22px; font-weight:bold; color:#fff;">${formatNum(totalSold)}</div>
                    </div>
                </div>
                <div style="font-size:12px; color:#94a3b8; text-align:center;">عدد العمليات اليوم: <span style="color:#fff; font-weight:bold;">${userRecords.length}</span></div>
            </div>
        `;

            if (window.showModal) {
                window.showModal('إحصائيات الموظف اللحظية', statsHtml);
            } else {
                alert(`إحصائيات ${userName}:\nالوارد: ${totalTop}\nالمصروف: ${totalBottom}\nالمبيعات: ${totalSold}`);
            }
        };

        // --- Robust User Management (Final Export) ---
        // Migration from old key if necessary
        try {
            const oldUsers = localStorage.getItem('acc_users');
            if (oldUsers && !localStorage.getItem('acc_bayan_users')) {
                localStorage.setItem('acc_bayan_users', oldUsers);
                localStorage.removeItem('acc_users');
            }
        } catch (e) { }

        let currentEditIdx = -1;

        window.renderUsersList = function () {
            try {
                const container = document.getElementById('usersListContainer');
                if (!container) return;
                const users = JSON.parse(localStorage.getItem('acc_bayan_users') || '[]');

                if (users.length === 0) {
                    container.innerHTML = '<div style="text-align:center; padding:30px; color:#94a3b8; background:rgba(255,255,255,0.02); border-radius:12px; border:1px dashed rgba(255,255,255,0.1);">لا يوجد مستخدمين مضافين حالياً.</div>';
                    return;
                }

                const safeEsc = (s) => typeof escapeHtml === 'function' ? escapeHtml(s || '') : String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                container.innerHTML = users.map((user, idx) => {
                    const userName = safeEsc(user.name);
                    const userInitial = safeEsc((user.name || '?').charAt(0).toUpperCase());
                    const roleLabel = user.role === 'admin' ? '💎 مدير النظام' : '👤 موظف';
                    return `
                    <div class="user-item" style="background:rgba(30,41,59,0.5); padding:15px; border-radius:12px; display:flex; justify-content:space-between; align-items:center; border:1px solid rgba(139, 92, 246, 0.2); margin-bottom:8px; transition: transform 0.2s;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="width:40px; height:40px; background:linear-gradient(135deg, #8b5cf6, #6d28d9); border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:bold; box-shadow: 0 4px 10px rgba(109, 40, 217, 0.3);">${userInitial}</div>
                            <div>
                                <div style="font-weight:bold; color:#fff;">${userName}</div>
                                <div style="font-size:11px; color:#a78bfa;">${roleLabel}</div>
                            </div>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button onclick="window.viewUserDetails(${idx})" class="btn" style="background:rgba(14, 165, 233, 0.1); color:#0ea5e9; border:1px solid rgba(14, 165, 233, 0.2); padding:6px 10px; font-size:15px; border-radius:8px;" title="عرض التفاصيل والنشاط">👁️</button>
                            <button onclick="window.editUser(${idx})" class="btn" style="background:rgba(245, 158, 11, 0.1); color:#f59e0b; border:1px solid rgba(245, 158, 11, 0.2); padding:6px 12px; font-size:12px; border-radius:8px;">تعديل</button>
                            <button onclick="window.deleteUser(${idx})" class="btn" style="background:rgba(239, 68, 68, 0.1); color:#ef4444; border:1px solid rgba(239, 68, 68, 0.2); padding:6px 12px; font-size:12px; border-radius:8px;">حذف</button>
                        </div>
                    </div>
                `;}).join('');
            } catch (e) { console.error(e); }
        };

        window.editUser = function (idx) {
            const users = JSON.parse(localStorage.getItem('acc_bayan_users') || '[]');
            const user = users[idx];
            if (!user) return;

            currentEditIdx = idx;
            document.getElementById('newUserName').value = user.name;
            const passField = document.getElementById('newUserPass');
            if (passField) {
                passField.value = '';
                passField.placeholder = 'اترك الحقل فارغاً للاحتفاظ بكلمة السر الحالية';
            }
            document.getElementById('newUserRole').value = user.role || 'staff';

            const emCode = document.getElementById('newUserEmergencyCode');
            if (emCode) emCode.value = user.emergencyCode || '';

            const btn = document.getElementById('addUserMainBtn');
            if (btn) {
                btn.textContent = '💾 حفظ التعديلات';
                btn.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
            }

            // Add cancel button if not exists
            if (!document.getElementById('cancelEditBtn')) {
                const cancelBtn = document.createElement('button');
                cancelBtn.id = 'cancelEditBtn';
                cancelBtn.className = 'btn';
                cancelBtn.textContent = 'إلغاء';
                cancelBtn.style.cssText = 'background:rgba(255,255,255,0.1); color:#fff; padding:10px 15px; border-radius:12px; margin-top:10px; width:100%; border:1px solid rgba(255,255,255,0.2);';
                cancelBtn.onclick = window.resetUserForm;
                btn.parentNode.appendChild(cancelBtn);
            }
        };

        window.resetUserForm = function () {
            currentEditIdx = -1;
            document.getElementById('newUserName').value = '';

            const passInput = document.getElementById('newUserPass');
            if (passInput) {
                passInput.value = '';
                passInput.type = 'password';
            }
            const eyeUser = document.getElementById('eyeUser');
            if (eyeUser) {
                eyeUser.textContent = '👁️';
                eyeUser.style.color = '#f59e0b';
            }

            document.getElementById('newUserRole').value = 'staff';

            const emCode = document.getElementById('newUserEmergencyCode');
            if (emCode) {
                emCode.value = '';
                emCode.type = 'password';
            }
            const eyeEmergency = document.getElementById('eyeEmergency');
            if (eyeEmergency) {
                eyeEmergency.textContent = '👁️';
                eyeEmergency.style.color = '#f59e0b';
            }

            const btn = document.getElementById('addUserMainBtn');
            if (btn) {
                btn.textContent = '➕ إضافة عضو جديد لمؤسستك';
                btn.style.background = 'linear-gradient(90deg, #8b5cf6, #7c3aed)';
            }
            const cancelBtn = document.getElementById('cancelEditBtn');
            if (cancelBtn) cancelBtn.remove();
        };

        window.addNewUser = async function () {
            const currentUserRole = typeof getCurrentUserRole === 'function' ? getCurrentUserRole() : (localStorage.getItem('acc_current_user_role') || 'staff');
            const isTempUnlocked = typeof isTempAdminUnlocked === 'function' ? isTempAdminUnlocked() : (sessionStorage.getItem('acc_admin_temp_unlocked') === 'true');
            if (currentUserRole !== 'admin' && !isTempUnlocked) {
                if (window.promptAdminUnlock) {
                    window.promptAdminUnlock(() => window.addNewUser());
                } else {
                    alert('⚠️ عذراً، لا يمكن إضافة أو تعديل المستخدمين إلا بواسطة مدير المنشأة.');
                }
                return;
            }

            const nameInput = document.getElementById('newUserName');
            const passInput = document.getElementById('newUserPass');
            const roleSelect = document.getElementById('newUserRole');
            const emergencyInput = document.getElementById('newUserEmergencyCode');

            const name = nameInput.value.trim();
            const pass = passInput.value.trim();
            const role = roleSelect ? roleSelect.value : 'staff';
            const emergencyCode = emergencyInput ? emergencyInput.value.trim() : '';

            if (!name || (currentEditIdx === -1 && !pass)) {
                if (window.showToast) window.showToast('⚠️ يرجى إدخال جميع البيانات المطلوبة', 'warning');
                return;
            }

            let users = JSON.parse(localStorage.getItem('acc_bayan_users') || '[]');

            if (currentEditIdx > -1) {
                // Update existing
                users[currentEditIdx].name = name;
                if (pass) {
                    if (pass !== users[currentEditIdx].pass && !pass.startsWith('sha256:')) {
                        users[currentEditIdx].pass = (window.BayanSecurity ? await window.BayanSecurity.hashPassword(pass) : pass);
                    }
                }
                users[currentEditIdx].role = role;
                if (emergencyCode) {
                    if (emergencyCode !== users[currentEditIdx].emergencyCode && !emergencyCode.startsWith('sha256:')) {
                        users[currentEditIdx].emergencyCode = (window.BayanSecurity ? await window.BayanSecurity.hashPassword(emergencyCode) : emergencyCode);
                    }
                } else {
                    users[currentEditIdx].emergencyCode = '';
                }
                if (window.showToast) window.showToast('✅ تم تحديث بيانات العضو', 'success');
            } else {
                // Add new
                const hashedPass = (window.BayanSecurity && typeof window.BayanSecurity.hashPassword === 'function')
                    ? await window.BayanSecurity.hashPassword(pass)
                    : pass;

                const hashedEmergency = (emergencyCode && window.BayanSecurity && typeof window.BayanSecurity.hashPassword === 'function')
                    ? await window.BayanSecurity.hashPassword(emergencyCode)
                    : (emergencyCode || '');

                users.push({
                    id: Date.now(),
                    name,
                    pass: hashedPass,
                    role,
                    emergencyCode: hashedEmergency,
                    date: new Date().toISOString()
                });
                if (window.showToast) window.showToast('✅ تم إضافة العضو الجديد بنجاح', 'success');
            }

            localStorage.setItem('acc_bayan_users', JSON.stringify(users));
            window.resetUserForm();
            window.renderUsersList();

            if (typeof window.saveToCloud === 'function') window.saveToCloud();
        };

        window.deleteUser = function (idx) {
            const currentUserRole = typeof getCurrentUserRole === 'function' ? getCurrentUserRole() : (localStorage.getItem('acc_current_user_role') || 'staff');
            const isTempUnlocked = typeof isTempAdminUnlocked === 'function' ? isTempAdminUnlocked() : (sessionStorage.getItem('acc_admin_temp_unlocked') === 'true');
            if (currentUserRole !== 'admin' && !isTempUnlocked) {
                if (window.promptAdminUnlock) {
                    window.promptAdminUnlock(() => window.deleteUser(idx));
                } else {
                    alert('⚠️ عذراً، لا يمكن حذف المستخدمين إلا بواسطة مدير النظام.');
                }
                return;
            }

            let users = JSON.parse(localStorage.getItem('acc_bayan_users') || '[]');
            if (!users[idx]) return;

            // Prevent deleting the last remaining admin
            const adminCount = users.filter(u => u.role === 'admin').length;
            if (users[idx].role === 'admin' && adminCount <= 1) {
                alert('⚠️ لا يمكن حذف المدير الوحيد في النظام! يجب أن يظل هناك مدير واحد على الأقل لإدارة المنشأة.');
                return;
            }

            if (!confirm('هل أنت متأكد من حذف هذا العضو؟ سيتم نقله لسلة المحذوفات.')) return;

            const user = users[idx];
            user.deletedAt = new Date().toISOString();
            user.itemType = 'user';

            // Add to Trash
            const trash = JSON.parse(localStorage.getItem('acc_bayan_trash') || '[]');
            trash.unshift(user);
            localStorage.setItem('acc_bayan_trash', JSON.stringify(trash));

            users.splice(idx, 1);
            localStorage.setItem('acc_bayan_users', JSON.stringify(users));
            window.renderUsersList();
            if (typeof window.renderDeletedUsersList === 'function') window.renderDeletedUsersList();
            if (window.showToast) window.showToast('♻️ تم النقل لسلة المحذوفات', 'success');

            // مزامنة الحذف سحابياً
            if (typeof window.saveToCloud === 'function') window.saveToCloud();
        };

        window.toggleDeletedUsersList = function () {
            const section = document.getElementById('deletedUsersSection');
            const btn = document.getElementById('toggleDeletedUsersBtn');
            if (!section || !btn) return;

            if (section.style.display === 'none') {
                section.style.display = 'block';
                btn.textContent = '🙈 إخفاء أرشيف الموظفين المحذوفين';
                window.renderDeletedUsersList();
            } else {
                section.style.display = 'none';
                btn.textContent = '👁️ عرض أرشيف الموظفين المحذوفين';
            }
        };

        window.renderDeletedUsersList = function () {
            try {
                const container = document.getElementById('deletedUsersListContainer');
                if (!container) return;

                const trash = JSON.parse(localStorage.getItem('acc_bayan_trash') || '[]');
                const deletedUsers = trash.filter(item => item.itemType === 'user');

                if (deletedUsers.length === 0) {
                    container.innerHTML = '<div style="text-align:center; padding:15px; color:#64748b; font-size:11px;">لا يوجد موظفين محذوفين حالياً.</div>';
                    return;
                }

                const safeEsc = (s) => typeof escapeHtml === 'function' ? escapeHtml(s || '') : String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                container.innerHTML = deletedUsers.map((user, idx) => {
                    const userName = safeEsc(user.name);
                    const userInitial = safeEsc((user.name || '?').charAt(0).toUpperCase());
                    const roleLabel = user.role === 'admin' ? 'مدير النظام' : 'موظف';
                    return `
                    <div class="user-item" style="background:rgba(239, 68, 68, 0.05); padding:12px; border-radius:12px; display:flex; justify-content:space-between; align-items:center; border:1px solid rgba(239, 68, 68, 0.2); margin-bottom:6px;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="width:35px; height:35px; background:linear-gradient(135deg, #ef4444, #991b1b); border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:bold;">${userInitial}</div>
                            <div>
                                <div style="font-weight:bold; color:#fff; font-size:13px;">${userName}</div>
                                <div style="font-size:10px; color:#f87171;">${roleLabel}</div>
                            </div>
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button onclick="window.restoreUser(${idx})" class="btn" style="background:rgba(34, 197, 94, 0.1); color:#4ade80; border:1px solid rgba(34, 197, 94, 0.2); padding:4px 8px; font-size:11px; border-radius:6px; cursor:pointer;">استعادة 🟢</button>
                            <button onclick="window.permanentlyDeleteUser(${idx})" class="btn" style="background:rgba(239, 68, 68, 0.15); color:#f87171; border:1px solid rgba(239, 68, 68, 0.3); padding:4px 8px; font-size:11px; border-radius:6px; cursor:pointer;">حذف نهائي 🗑️</button>
                        </div>
                    </div>
                `;}).join('');
            } catch (e) { console.error(e); }
        };

        window.restoreUser = function (trashIdx) {
            try {
                let trash = JSON.parse(localStorage.getItem('acc_bayan_trash') || '[]');
                const deletedUsers = trash.filter(item => item.itemType === 'user');
                const userToRestore = deletedUsers[trashIdx];
                if (!userToRestore) return;

                // Remove from trash
                const actualTrashIdx = trash.indexOf(userToRestore);
                if (actualTrashIdx > -1) {
                    trash.splice(actualTrashIdx, 1);
                    localStorage.setItem('acc_bayan_trash', JSON.stringify(trash));
                }

                // Add back to active users
                let users = JSON.parse(localStorage.getItem('acc_bayan_users') || '[]');
                delete userToRestore.deletedAt;
                delete userToRestore.itemType;
                users.push(userToRestore);
                localStorage.setItem('acc_bayan_users', JSON.stringify(users));

                window.renderUsersList();
                window.renderDeletedUsersList();
                if (window.showToast) window.showToast('🟢 تم استعادة الموظف بنجاح', 'success');
                if (typeof window.saveToCloud === 'function') window.saveToCloud();
            } catch (e) { console.error(e); }
        };

        window.permanentlyDeleteUser = function (trashIdx) {
            try {
                if (!confirm('هل أنت متأكد من حذف هذا الموظف نهائياً؟ لا يمكن استرجاعه بعد ذلك.')) return;

                let trash = JSON.parse(localStorage.getItem('acc_bayan_trash') || '[]');
                const deletedUsers = trash.filter(item => item.itemType === 'user');
                const userToDelete = deletedUsers[trashIdx];
                if (!userToDelete) return;

                // Remove from trash
                const actualTrashIdx = trash.indexOf(userToDelete);
                if (actualTrashIdx > -1) {
                    trash.splice(actualTrashIdx, 1);
                    localStorage.setItem('acc_bayan_trash', JSON.stringify(trash));
                }

                window.renderDeletedUsersList();
                if (window.showToast) window.showToast('🗑️ تم الحذف النهائي للموظف', 'success');
            } catch (e) { console.error(e); }
        };

        window.togglePasswordVisibility = function (inputId, iconId) {
            const input = document.getElementById(inputId);
            const icon = document.getElementById(iconId);
            if (!input) return;
            if (input.type === 'password') {
                input.type = 'text';
                if (icon) {
                    icon.textContent = '🙈';
                    icon.style.color = '#fff';
                }
            } else {
                input.type = 'password';
                if (icon) {
                    icon.textContent = '👁️';
                    icon.style.color = '#f59e0b';
                }
            }
        };

        console.log('🚀 User Management Patch Active');

        // --- Network Status Monitoring Logic ---
        function updateAppNetworkStatus() {
            const statusBox = document.getElementById('networkStatus');
            const statusIcon = document.getElementById('networkStatusIcon');
            const statusText = document.getElementById('networkStatusText');

            if (!statusIcon) return;

            if (navigator.onLine) {
                if (statusBox) {
                    statusBox.title = 'حالة الاتصال: متصل بالإنترنت (المزامنة السحابية نشطة) ✅';
                    statusBox.classList.remove('action-tile-offline');
                    statusBox.classList.add('action-tile-online');
                    statusBox.style.background = '';
                    statusBox.style.borderColor = '';
                    statusBox.style.color = '';
                }
                statusIcon.className = 'fa-solid fa-wifi';
                statusIcon.innerHTML = '';
                statusIcon.style.color = '#10b981';
                statusIcon.style.fontSize = '15px';
                if (statusText) statusText.textContent = 'متصل';
            } else {
                if (statusBox) {
                    statusBox.title = 'حالة الاتصال: غير متصل بالإنترنت (النظام يعمل أوفلاين بأمان) ⚠️';
                    statusBox.classList.remove('action-tile-online');
                    statusBox.classList.add('action-tile-offline');
                    statusBox.style.background = '';
                    statusBox.style.borderColor = '';
                    statusBox.style.color = '';
                }
                statusIcon.className = 'fa-solid fa-wifi';
                statusIcon.innerHTML = '';
                statusIcon.style.color = '#ef4444';
                statusIcon.style.fontSize = '15px';
                if (statusText) statusText.textContent = 'غير متصل';
            }
        }

        window.showNetworkToast = function () {
            if (window.showToast) {
                if (navigator.onLine) {
                    window.showToast('✅ أنت متصل بالإنترنت — المزامنة السحابية تعمل بنجاح', 'success');
                } else {
                    window.showToast('⚠️ أنت غير متصل بالإنترنت — جميع العمليات تُحفظ محلياً بأمان', 'warning');
                }
            }
        };

        window.addEventListener('online', updateAppNetworkStatus);
        window.addEventListener('offline', updateAppNetworkStatus);

        // Check status immediately and after a short delay to ensure UI is ready
        updateAppNetworkStatus();
        // --- Inventory & Product Management Logic ---
        window.renderInventoriesSettings = function () {
            console.log('📦 Initializing Inventory Tab...');
            if (window.renderInventoryList) window.renderInventoryList();
        };

        window.exportInventoryExcel = function () {
            const inventory = JSON.parse(localStorage.getItem('acc_bayan_inventory') || '[]');
            if (inventory.length === 0) {
                if (window.showToast) window.showToast('⚠️ لا توجد سلع لتصديرها', 'warning');
                return;
            }

            if (typeof XLSX === 'undefined') {
                alert('مكتبة Excel غير محملة');
                return;
            }

            const data = inventory.map(item => ({
                'اسم الصنف': item.name,
                'السعر': item.price,
                'الكمية المتوفرة': item.stock,
                'تاريخ الإضافة': new Date(item.id).toLocaleDateString('ar-EG')
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "المخزون");
            XLSX.writeFile(wb, `inventory_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
        };

        window.editProduct = function (idx) {
            const inventory = JSON.parse(localStorage.getItem('acc_bayan_inventory') || '[]');
            const item = inventory[idx];
            if (item) window.editProductById(item.id || idx);
        };

        window.editProductById = function (productId) {
            const inventory = JSON.parse(localStorage.getItem('acc_bayan_inventory') || '[]');
            const item = inventory.find(p => String(p.id) === String(productId));
            if (!item) return;

            const modalHtml = `
            <div style="display:grid; gap:15px; direction:rtl;">
                <input type="text" id="editProdName" value="${item.name}" placeholder="اسم الصنف" class="custom-input">
                <input type="number" id="editProdPrice" value="${item.price}" placeholder="سعر البيع" class="custom-input">
                <input type="number" id="editProdStock" value="${item.stock}" placeholder="الكمية" class="custom-input">
                <button class="btn" onclick="window.saveEditedProductById('${item.id}')" style="background:#fbbf24; color:#000; padding:12px; font-weight:bold; border:none; border-radius:10px; cursor:pointer;">💾 حفظ التعديلات</button>
            </div>
        `;
            if (window.showModal) window.showModal('تعديل بيانات الصنف', modalHtml);
        };

        window.saveEditedProduct = function (idx) {
            const inventory = JSON.parse(localStorage.getItem('acc_bayan_inventory') || '[]');
            const item = inventory[idx];
            if (item) window.saveEditedProductById(item.id || idx);
        };

        window.saveEditedProductById = function (productId) {
            const inventory = JSON.parse(localStorage.getItem('acc_bayan_inventory') || '[]');
            const item = inventory.find(p => String(p.id) === String(productId));
            if (!item) return;

            item.name = (document.getElementById('editProdName')?.value || '').trim();
            item.price = parseFloat(document.getElementById('editProdPrice')?.value) || 0;
            item.stock = parseInt(document.getElementById('editProdStock')?.value) || 0;

            localStorage.setItem('acc_bayan_inventory', JSON.stringify(inventory));
            const modal = document.querySelector('.modal-overlay');
            if (modal) modal.remove();
            window.renderInventoryList();
            if (typeof window.saveToCloud === 'function') window.saveToCloud(); // مزامنة فورية
            if (window.showToast) window.showToast('✅ تم تحديث الصنف بنجاح', 'success');
        };

        window.deleteProduct = function (idx) {
            const inventory = JSON.parse(localStorage.getItem('acc_bayan_inventory') || '[]');
            const item = inventory[idx];
            if (item) window.deleteProductById(item.id || idx);
        };

        window.deleteProductById = function (productId) {
            if (!confirm('هل أنت متأكد من حذف هذا الصنف؟ سيتم نقله لسلة المحذوفات.')) return;
            const inventory = JSON.parse(localStorage.getItem('acc_bayan_inventory') || '[]');
            const prodIndex = inventory.findIndex(p => String(p.id) === String(productId));
            if (prodIndex === -1) return;

            const product = inventory[prodIndex];
            product.deletedAt = new Date().toISOString();
            product.itemType = 'product';

            // Add to Trash
            const trash = JSON.parse(localStorage.getItem('acc_bayan_trash') || '[]');
            trash.unshift(product);
            localStorage.setItem('acc_bayan_trash', JSON.stringify(trash));

            inventory.splice(prodIndex, 1);
            localStorage.setItem('acc_bayan_inventory', JSON.stringify(inventory));
            window.renderInventoryList();
            if (typeof window.saveToCloud === 'function') window.saveToCloud(); // مزامنة فورية
            if (window.showToast) window.showToast('♻️ تم النقل لسلة المحذوفات', 'success');
        };

        window.renderInventoryList = function () {
            const container = document.getElementById('inventoriesListContainer');
            if (!container) return;

            let inventory = [];
            try {
                inventory = JSON.parse(localStorage.getItem('acc_bayan_inventory') || '[]');
            } catch (e) {
                inventory = [];
            }

            // Ensure every item has a unique ID
            let needsSave = false;
            inventory.forEach((item, i) => {
                if (!item.id) {
                    item.id = Date.now() + i;
                    needsSave = true;
                }
            });
            if (needsSave) {
                localStorage.setItem('acc_bayan_inventory', JSON.stringify(inventory));
            }

            const searchTerm = (document.getElementById('inventorySearch')?.value || '').toLowerCase().trim();
            const categoryFilter = document.getElementById('inventoryCategoryFilter')?.value || 'all';

            // Populate category filter options if available
            const catSelect = document.getElementById('inventoryCategoryFilter');
            if (catSelect && catSelect.options.length <= 1) {
                const categories = new Set();
                inventory.forEach(item => {
                    if (item.category) categories.add(item.category);
                });
                categories.forEach(cat => {
                    const opt = document.createElement('option');
                    opt.value = cat;
                    opt.textContent = cat;
                    catSelect.appendChild(opt);
                });
            }

            const filtered = inventory.filter(item => {
                const matchesSearch = item.name.toLowerCase().includes(searchTerm) || (item.category && item.category.toLowerCase().includes(searchTerm));
                const matchesCat = (categoryFilter === 'all') || (item.category === categoryFilter);
                return matchesSearch && matchesCat;
            });

            if (filtered.length === 0) {
                container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#64748b;">لا توجد أصناف تطابق بحثك حالياً.</div>';
                return;
            }

            container.innerHTML = filtered.map(item => `
            <div class="inventory-card" style="background:rgba(30,41,59,0.6); padding:15px; border-radius:15px; border:1px solid ${item.stock < 5 ? '#ef4444' : 'rgba(255,255,255,0.1)'}; display:flex; flex-direction:column; gap:10px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div style="font-weight:bold; color:#fff; font-size:16px;">${item.name}</div>
                    <div style="background:${item.stock < 5 ? '#ef4444' : '#22c55e'}; color:#fff; padding:2px 8px; border-radius:20px; font-size:11px;">${item.stock < 5 ? 'مخزن منخفض' : 'متوفر'}</div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <div style="background:rgba(255,255,255,0.03); padding:8px; border-radius:10px; text-align:center;">
                        <div style="font-size:10px; color:#94a3b8;">السعر</div>
                        <div style="font-weight:bold; color:#fbbf24;">${typeof formatNum === 'function' ? formatNum(item.price) : item.price}</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.03); padding:8px; border-radius:10px; text-align:center;">
                        <div style="font-size:10px; color:#94a3b8;">الكمية</div>
                        <div style="font-weight:bold; color:#fff;">${item.stock} قطع</div>
                    </div>
                </div>
                <div style="display:flex; gap:5px; margin-top:5px;">
                    <button class="btn" style="flex:1; background:rgba(255,255,255,0.05); font-size:11px; padding:5px; cursor:pointer;" onclick="window.editProductById('${item.id}')">تعديل</button>
                    <button class="btn" style="flex:1; background:rgba(239,68,68,0.1); color:#ef4444; font-size:11px; padding:5px; cursor:pointer;" onclick="window.deleteProductById('${item.id}')">حذف</button>
                </div>
            </div>
        `).join('');
        };

        window.addNewProductModal = function () {
            const modalHtml = `
            <div style="display:grid; gap:15px; direction:rtl;">
                <input type="text" id="prodName" placeholder="اسم الصنف (مثلاً: بيبسي 1 لتر)" class="custom-input">
                <input type="number" id="prodPrice" placeholder="سعر البيع" class="custom-input">
                <input type="number" id="prodStock" placeholder="الكمية الحالية" class="custom-input">
                <button class="btn" onclick="saveNewProduct()" style="background:#06b6d4; color:#fff; padding:12px; font-weight:bold;">✅ إضافة للمخزن</button>
            </div>
        `;
            if (window.showModal) window.showModal('إضافة صنف جديد للمخزن', modalHtml);
        };

        window.saveNewProduct = function () {
            const name = document.getElementById('prodName').value.trim();
            const price = parseFloat(document.getElementById('prodPrice').value) || 0;
            const stock = parseInt(document.getElementById('prodStock').value) || 0;

            if (!name) return alert('يرجى إدخال اسم الصنف');

            const inventory = JSON.parse(localStorage.getItem('acc_bayan_inventory') || '[]');
            inventory.push({ name, price, stock, id: Date.now() });
            localStorage.setItem('acc_bayan_inventory', JSON.stringify(inventory));

            const modal = document.querySelector('.modal-overlay');
            if (modal) modal.remove();

            window.renderInventoryList();
            if (typeof window.saveToCloud === 'function') window.saveToCloud(); // مزامنة فورية
            if (window.showToast) window.showToast('📦 تم إضافة الصنف للمخزن', 'success');
            if (window.updateBalancesBadge) window.updateBalancesBadge();
        };

        window.updateBalancesBadge = function () {
            const btn = document.getElementById('balancesBtn');
            if (!btn) return;
            const inventory = JSON.parse(localStorage.getItem('acc_bayan_inventory') || '[]');
            const count = inventory.length;
            btn.innerHTML = `📦 الأرصدة ${count > 0 ? `<span style="background:var(--gold1); color:var(--gold4); padding:2px 8px; border-radius:10px; font-size:12px; font-weight:900; margin-right:5px;">${count}</span>` : ''}`;
        };

        // Initialize badge on load
        setTimeout(() => { if (window.updateBalancesBadge) window.updateBalancesBadge(); }, 1000);

        // --- Dashboard Live Stats Logic ---
        window.updateDashboardStats = function () {
            const totalDays = Object.keys(localStorage).filter(k => /^acc_\d{4}-\d{2}-\d{2}$/.test(k)).length;
            const currentRecs = (typeof window.records !== 'undefined' && Array.isArray(window.records)) ? window.records : [];
            const todayOps = currentRecs.length;

            let netProfit = 0;
            currentRecs.forEach(r => {
                netProfit += (r.top || 0); // Above (Incoming)
                netProfit -= (r.bottom || 0); // Below (Outgoing)
            });

            const d1 = document.getElementById('dash-totalDays');
            const d2 = document.getElementById('dash-todayOps');
            const d3 = document.getElementById('dash-netProfit');

            if (d1) d1.textContent = totalDays;
            if (d2) d2.textContent = todayOps;
            if (d3) d3.textContent = typeof window.formatNum === 'function' ? window.formatNum(netProfit) : netProfit;
        };

        // Hook updateDashboardStats into the main render
        const originalRender = window.render;
        window.render = function () {
            if (typeof originalRender === 'function') originalRender();
            if (typeof window.updateDashboardStats === 'function') window.updateDashboardStats();
        };

        if (typeof window.renderInventoryList === 'function') window.renderInventoryList();
        if (typeof window.updateDashboardStats === 'function') window.updateDashboardStats();
        window.viewUserDetails = function (idx) {
            const users = JSON.parse(localStorage.getItem('acc_bayan_users') || '[]');
            const user = users[idx];
            if (!user) return;

            // Filter activity logs
            let allLogs = [];
            try { allLogs = JSON.parse(localStorage.getItem('acc_user_activity_logs') || '[]'); } catch (e) { }
            const userLogs = allLogs.filter(l => String(l.userId) === String(user.id)).reverse();

            // Calculate stats from all records stored in localStorage
            let totalTop = 0;
            let totalBottom = 0;
            let opCount = 0;
            let seenIds = new Set();

            try {
                const searchName = user.name.trim();
                // Strict regex to match ONLY daily records (acc_YYYY-MM-DD)
                const keys = Object.keys(localStorage).filter(k => /^acc_\d{4}-\d{2}-\d{2}$/.test(k));

                keys.forEach(key => {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        const dayRecords = Array.isArray(data) ? data : (data.records || []);
                        dayRecords.forEach(r => {
                            // Prevent double counting if the same ID appears in different keys (e.g. legacy/backups)
                            if (r.id && seenIds.has(r.id)) return;

                            const recordUser = (r.user || '').trim();
                            if (recordUser === searchName) {
                                totalTop += (Number(r.top) || 0);
                                totalBottom += (Number(r.bottom) || 0);
                                opCount++;
                                if (r.id) seenIds.add(r.id);
                            }
                        });
                    } catch (e) { }
                });
            } catch (e) { }

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.zIndex = '1000000';
            overlay.innerHTML = `
            <div class="modal-box" style="max-width: 550px; background: #0f172a; border: 1px solid #1e293b; padding: 0; overflow: hidden; display: flex; flex-direction: column; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);">
                <div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 25px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                    <div style="display:flex; align-items:center; gap:15px;">
                        <div style="width:50px; height:50px; background:#8b5cf6; border-radius:15px; display:flex; align-items:center; justify-content:center; font-size:24px; box-shadow: 0 8px 16px rgba(139, 92, 246, 0.2);">👤</div>
                        <div>
                            <h3 style="margin: 0; color: #fff; font-size: 20px;">${user.name}</h3>
                            <span style="font-size: 12px; color: #a78bfa;">${user.role === 'admin' ? 'مدير النظام' : 'عضو فريق العمل'}</span>
                        </div>
                    </div>
                    <button class="btn ghost" onclick="this.closest('.modal-overlay').remove()" style="color: #64748b; font-size: 20px;">✕</button>
                </div>
                
                <div style="padding: 25px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
                        <div style="background: rgba(139, 92, 246, 0.08); padding: 20px; border-radius: 16px; border: 1px solid rgba(139, 92, 246, 0.15); text-align: center;">
                            <div style="font-size: 28px; font-weight: 900; color: #a78bfa; margin-bottom: 5px;">${opCount}</div>
                            <div style="font-size: 11px; color: #94a3b8; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">إجمالي العمليات</div>
                        </div>
                        <div style="background: rgba(34, 197, 94, 0.08); padding: 20px; border-radius: 16px; border: 1px solid rgba(34, 197, 94, 0.15); text-align: center;">
                            <div style="font-size: 28px; font-weight: 900; color: #4ade80; margin-bottom: 5px;">${(totalTop + totalBottom).toLocaleString()}</div>
                            <div style="font-size: 11px; color: #94a3b8; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">إجمالي المبالغ</div>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px;">
                        <div style="padding: 15px; border-radius: 12px; background: rgba(0,0,0,0.2); border-left: 4px solid #8b5cf6;">
                            <div style="color: #94a3b8; font-size: 11px; margin-bottom: 5px;">مبالغ (فوق)</div>
                            <div style="font-size: 18px; color: #fff; font-weight: 800;">${totalTop.toLocaleString()}</div>
                        </div>
                        <div style="padding: 15px; border-radius: 12px; background: rgba(0,0,0,0.2); border-left: 4px solid #f87171;">
                            <div style="color: #94a3b8; font-size: 11px; margin-bottom: 5px;">مبالغ (تحت)</div>
                            <div style="font-size: 18px; color: #fff; font-weight: 800;">${totalBottom.toLocaleString()}</div>
                        </div>
                    </div>

                    <div style="background: rgba(0,0,0,0.2); border-radius: 16px; padding: 20px; border: 1px solid rgba(255,255,255,0.05);">
                        <h4 style="margin: 0 0 15px 0; color: #93c5fd; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                             سجل الدخول والخروج الأخير
                        </h4>
                        <div style="display: grid; gap: 8px; max-height: 200px; overflow-y: auto; padding-right: 5px;">
                            ${userLogs.length ? userLogs.slice(0, 10).map(log => `
                                <div style="display: flex; justify-content: space-between; background: rgba(255,255,255,0.03); padding: 12px; border-radius: 10px; font-size: 12px; border: 1px solid rgba(255,255,255,0.05);">
                                    <div style="display:flex; align-items:center; gap:8px;">
                                        <div style="width:8px; height:8px; border-radius:50%; background: ${log.type === 'login' ? '#4ade80' : '#f87171'}"></div>
                                        <span style="font-weight:bold; color: ${log.type === 'login' ? '#4ade80' : '#f87171'}">${log.type === 'login' ? 'تم الدخول' : 'تم الخروج'}</span>
                                    </div>
                                    <span style="color: #64748b;">${new Date(log.timestamp).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            `).join('') : '<div style="text-align:center; color:#475569; padding:20px; font-style:italic;">لا يوجد سجلات نشاط مسجلة لهذا الموظف.</div>'}
                        </div>
                    </div>
                </div>

                <div style="padding: 20px; background: rgba(0,0,0,0.2); text-align: center;">
                    <button class="btn" onclick="this.closest('.modal-overlay').remove()" style="background: rgba(255,255,255,0.1); color: #fff; padding: 10px 40px; border-radius: 10px; width: 100%;">إغلاق النافذة</button>
                </div>
            </div>
        `;
            document.body.appendChild(overlay);
            if (typeof beep === 'function') beep(1000, 0.05, 0.05);
        };

        // Helper to open specific settings tab from anywhere
        window.openSettingsTab = function (tabId) {
            if (typeof openSettings === 'function') openSettings();

            // Find the specific tab link and click it
            setTimeout(() => {
                const tabLinks = document.querySelectorAll('.tab-link');
                tabLinks.forEach(link => {
                    if (link.dataset.tab === tabId) {
                        link.click();
                    }
                });
            }, 120);
        };

        setTimeout(updateAppNetworkStatus, 1000);

        // --- Device ID & Serial Management ---
        window.showDeviceDetails = function (deviceId, deviceType, deviceName) {
            if (typeof beep === 'function') beep(1000, 0.05, 0.05);
            const typeStr = deviceType === 'mobile' ? 'الموبايل 📱' : 'الكمبيوتر 💻';
            const idStr = deviceId && deviceId !== 'undefined' && deviceId !== '' ? deviceId : 'غير مسجل (عملية قديمة)';
            const nameStr = deviceName && deviceName !== 'undefined' ? deviceName : 'غير محدد';

            alert(`🛡️ تفاصيل الجهاز المسؤول:\n--------------------------\n👤 الموظف/الجهاز: ${nameStr}\n📱 نوع الجهاز: ${typeStr}\n🆔 معرف الجهاز: ${idStr}\n\nهذا المعرف يساعدك في مطابقة العمليات بالأجهزة الموثقة لديك.`);
        };

        function updateDeviceIdDisplay() {
            let devId = localStorage.getItem('acc_device_id');
            if (!devId) {
                devId = 'BYN-' + Math.random().toString(36).substr(2, 4).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
                localStorage.setItem('acc_device_id', devId);
            }
            const el = document.getElementById('display-device-id');
            if (el) el.textContent = devId;
        }

        window.copyDeviceId = function () {
            const devId = localStorage.getItem('acc_device_id') || 'Unknown';
            navigator.clipboard.writeText(devId).then(() => {
                if (window.showToast) window.showToast('✅ تم نسخ كود الجهاز بنجاح', 'success');
            });
        };

        window.generateNewDeviceId = function () {
            if (!confirm('⚠️ هل أنت متأكد من تغيير كود الهوية؟ قد يؤثر ذلك على المزامنة السحابية.')) return;
            const newId = 'BYN-' + Math.random().toString(36).substr(2, 4).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
            localStorage.setItem('acc_device_id', newId);
            updateDeviceIdDisplay();
            if (window.showToast) window.showToast('✅ تم تحديث كود الجهاز', 'info');
        };

        // Ensure display is updated when settings are opened
        const originalOpenSettings = window.openSettings;
        // Note: If openSettings is a global function defined elsewhere, we wrap it
        // But since it's likely handled by tab switching, we can just call it in render or initApp

        // Auto-update on load
        updateDeviceIdDisplay();

        // app security is now handled by the Serial Auth Sync block above
        updateDeviceIdDisplay();
        // --- نظام باقات الاشتراك (Subscription System) ---
        window.showSubscriptionModal = function () {
            if (document.getElementById('subscription-modal')) return;
            const modalHTML = `
            <div id="subscription-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:99999999; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(10px); color:#fff; font-family:'El Messiri', sans-serif; direction:rtl; padding:20px;">
                <div style="background:#1e293b; width:100%; max-width:900px; padding:30px; border-radius:30px; border:1px solid rgba(255,255,255,0.1); box-shadow:0 10px 50px rgba(0,0,0,0.5); text-align:center; position:relative; overflow-y:auto; max-height:90vh;">
                    
                    <button onclick="document.getElementById('subscription-modal').remove()" style="position:absolute; top:20px; left:20px; background:rgba(255,255,255,0.05); border:none; color:#fff; width:35px; height:35px; border-radius:50%; cursor:pointer; font-size:20px; display:flex; align-items:center; justify-content:center;">✕</button>

                    <h2 style="color:#d4af37; margin-bottom:10px; font-size:28px;">💎 اختر باقة اشتراكك</h2>
                    <p style="color:#94a3b8; font-size:14px; margin-bottom:40px;">استخدم ميزات برنامج بيان POS الكاملة بأسعار تنافسية وادعم نمو مشروعك</p>
                    
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:25px; margin-bottom:30px;">
                        <!-- باقة شهري -->
                        <div style="background:rgba(255,255,255,0.03); padding:30px; border-radius:25px; border:1px solid rgba(255,255,255,0.08); transition:0.3s; display:flex; flex-direction:column; justify-content:space-between;">
                            <div>
                                <div style="font-size:45px; margin-bottom:15px;">📅</div>
                                <h4 style="margin:0; font-size:22px;">باقة (شهري)</h4>
                                <div style="font-size:35px; font-weight:900; color:#a78bfa; margin:20px 0;">100 <span style="font-size:16px;">ج.م</span></div>
                                <ul style="list-style:none; padding:0; font-size:13px; color:#cbd5e1; line-height:2.5; text-align:right;">
                                    <li>✅ مزامنة سحابية كاملة</li>
                                    <li>✅ دعم فني عبر الواتساب</li>
                                    <li>✅ تقارير يومية مفصلة</li>
                                    <li>✅ إدارة مخازن متقدمة</li>
                                </ul>
                            </div>
                            <button onclick="window.selectPlan('monthly')" style="margin-top:25px; width:100%; padding:12px; border-radius:15px; border:none; background:linear-gradient(45deg, #7c3aed, #a78bfa); color:#fff; font-weight:bold; cursor:pointer; box-shadow:0 5px 15px rgba(124, 58, 237, 0.3);">اختيار الباقة</button>
                        </div>

                        <!-- باقة سنوي -->
                        <div style="background:linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(30, 41, 59, 0.4)); padding:30px; border-radius:25px; border:2px solid #d4af37; transform:scale(1.05); box-shadow:0 0 30px rgba(212, 175, 55, 0.15); position:relative; display:flex; flex-direction:column; justify-content:space-between;">
                            <div style="position:absolute; top:-15px; right:50%; transform:translateX(50%); background:#d4af37; color:#1e293b; font-size:11px; font-weight:900; padding:5px 15px; border-radius:20px; box-shadow:0 5px 15px rgba(212, 175, 55, 0.4); white-space:nowrap;">الأكثر توفيراً 🔥</div>
                            <div>
                                <div style="font-size:45px; margin-bottom:15px;">🌟</div>
                                <h4 style="margin:0; font-size:22px; color:#d4af37;">باقة (سنوي)</h4>
                                <div style="font-size:35px; font-weight:900; color:#d4af37; margin:20px 0;">700 <span style="font-size:16px;">ج.م</span></div>
                                <ul style="list-style:none; padding:0; font-size:13px; color:#cbd5e1; line-height:2.5; text-align:right;">
                                    <li>✅ جميع ميزات الباقة الشهرية</li>
                                    <li>✅ خصم خاص (احصل على 5 أشهر مجاناً)</li>
                                    <li>✅ أولوية في التحديثات</li>
                                    <li>✅ تدريب مباشر للفريق</li>
                                </ul>
                            </div>
                            <button onclick="window.selectPlan('yearly')" style="margin-top:25px; width:100%; padding:12px; border-radius:15px; border:none; background:linear-gradient(45deg, #d4af37, #f59e0b); color:#1e293b; font-weight:bold; cursor:pointer; box-shadow:0 5px 15px rgba(212, 175, 55, 0.3);">اختيار الباقة</button>
                        </div>

                        <!-- باقة دائم -->
                        <div style="background:rgba(255,255,255,0.03); padding:30px; border-radius:25px; border:1px solid rgba(255,255,255,0.08); transition:0.3s; display:flex; flex-direction:column; justify-content:space-between;">
                            <div>
                                <div style="font-size:45px; margin-bottom:15px;">💎</div>
                                <h4 style="margin:0; font-size:22px;">باقة (دائم)</h4>
                                <div style="font-size:35px; font-weight:900; color:#22c55e; margin:20px 0;">1500 <span style="font-size:16px;">ج.م</span></div>
                                <ul style="list-style:none; padding:0; font-size:13px; color:#cbd5e1; line-height:2.5; text-align:right;">
                                    <li>✅ تملك البرنامج للأبد</li>
                                    <li>✅ بدون أي اشتراكات شهرية</li>
                                    <li>✅ ربط مفتوح للأجهزة</li>
                                    <li>✅ ملكية كاملة لقاعدة البيانات</li>
                                </ul>
                            </div>
                            <button onclick="window.selectPlan('permanent')" style="margin-top:25px; width:100%; padding:12px; border-radius:15px; border:none; background:linear-gradient(45deg, #16a34a, #22c55e); color:#fff; font-weight:bold; cursor:pointer; box-shadow:0 5px 15px rgba(34, 197, 94, 0.3);">امتلكه الآن</button>
                        </div>
                    </div>

                    <p style="color:#64748b; font-size:12px; margin-top:10px;">* جميع الأسعار تشمل التحديثات الفنية المستمرة.</p>
                </div>
            </div>
        `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        };

        window.selectPlan = function (plan) {
            let name = '';
            if (plan === 'monthly') name = 'الباقة الشهرية (100ج)';
            if (plan === 'yearly') name = 'الباقة السنوية (700ج)';
            if (plan === 'permanent') name = 'الباقة الدائمة (1500ج)';

            showModernAlert(`📦 شكرًا لاختيارك ${name}<br><br>يرجى إرسال لقطة شاشة لهذه الرسالة للدعم الفني لتفعيل اشتراكك فوراً.`, 'success');

            setTimeout(() => {
                const m = document.getElementById('subscription-modal');
                if (m) m.remove();
            }, 3500);
        };