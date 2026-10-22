// تعريف إصدار التطبيق (يجب أن يتطابق مع version.txt)
const APP_VERSION = '6.0.1';
window.APP_VERSION = APP_VERSION;

        // Global Modern Alert / Toast System (Must be at top)
        window.showToast = function (message, type = 'info') {
            let container = document.getElementById('modern-toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'modern-toast-container';
                container.className = 'modern-toast-container';
                document.body.appendChild(container);
            }

            const toast = document.createElement('div');
            toast.className = `modern-toast ${type}`;

            const icons = {
                success: '✅',
                error: '❌',
                warning: '⚠️',
                info: '🔔'
            };

            const iconDiv = document.createElement('div');
            iconDiv.className = 'modern-toast-icon';
            iconDiv.textContent = icons[type] || icons.info;

            const contentDiv = document.createElement('div');
            contentDiv.className = 'modern-toast-content';
            contentDiv.textContent = String(message || '');

            toast.appendChild(iconDiv);
            toast.appendChild(contentDiv);
            container.appendChild(toast);

            setTimeout(() => {
                toast.classList.add('fade-out');
                setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 400);
            }, 4500);
        };

        window.alert = function (msg) {
            let type = 'info';
            if (msg.includes('خطأ') || msg.includes('عذراً') || msg.includes('لا يمكن')) type = 'warning';
            if (msg.includes('موفق') || msg.includes('تم')) type = 'success';
            window.showToast(msg, type);
        };

        /* ========================================================
           🛡️ BAYAN SECURITY ENGINE (التشفير، التحقق، وتطهير المدخلات)
           ======================================================== */
        (function () {
            const SALT = 'bayan_pos_sec_2026_';

            // 1. خوارزمية التجزئة التشفيرية SHA-256
            async function sha256(str) {
                if (window.crypto && window.crypto.subtle) {
                    const buffer = new TextEncoder().encode(str);
                    const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
                    const hashArray = Array.from(new Uint8Array(hashBuffer));
                    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                }
                // Fallback احتياطي في بيئات المتصفحات القديمة
                let hash = 0;
                for (let i = 0; i < str.length; i++) {
                    const char = str.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash |= 0;
                }
                return 'fb_' + Math.abs(hash).toString(16);
            }

            // 2. تشفير كلمة المرور بملح أمني (Salted SHA-256)
            async function hashPassword(password) {
                if (!password && password !== 0) return '';
                const clean = String(password).trim();
                const hash = await sha256(SALT + clean);
                return 'sha256:' + hash;
            }

            // 3. التحقق الذكي من كلمة المرور مع الترقية التلقائية الفورية للحسابات القديمة
            async function verifyPassword(inputPass, storedPass) {
                if (storedPass === null || storedPass === undefined) {
                    return { valid: false, needMigration: false, newHash: '' };
                }
                const cleanInput = String(inputPass || '').trim();
                const cleanStored = String(storedPass).trim();

                if (!cleanInput) {
                    return { valid: false, needMigration: false, newHash: '' };
                }

                // إذا كانت كلمة المرور مشفرة بالفعل
                if (cleanStored.startsWith('sha256:')) {
                    const inputHash = await hashPassword(cleanInput);
                    return {
                        valid: (inputHash === cleanStored),
                        needMigration: false,
                        newHash: inputHash
                    };
                } else {
                    // حساب قديم غير مشفر: التحقق من النص ثم توليد الـ Hash لترقيته تلقائياً
                    const matches = (cleanInput === cleanStored);
                    if (matches) {
                        const newHash = await hashPassword(cleanInput);
                        return {
                            valid: true,
                            needMigration: true,
                            newHash: newHash
                        };
                    }
                    return { valid: false, needMigration: false, newHash: '' };
                }
            }

            // 4. دالة تنظيف وتطهير النصوص ضد ثغرات XSS
            function escapeHtml(str) {
                if (str === null || str === undefined) return '';
                return String(str)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            }

            window.BayanSecurity = {
                hashPassword,
                verifyPassword,
                escapeHtml,
                sha256
            };
            window.escapeHtml = escapeHtml;
        })();

        (function () {
            // -- تم إيقاف نظام الحماية (Anti-Debugging) مؤقتاً للسماح لك بتطوير التطبيق --
            
            /*
            // 1. منع النقر الأيمن (Context Menu)
            const preventRightClick = event => {
                event.preventDefault();
                return false;
            };
            document.addEventListener('contextmenu', preventRightClick);

            // 2. منع الاختصارات الحساسة للويندوز والماك (بما فيها فتح المصدر وحفظ الصفحة)
            document.addEventListener('keydown', function (e) {
                const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
                const cmdOrAlt = isMac ? e.altKey : e.altKey;

                if (
                    e.keyCode === 123 || // F12
                    (e.shiftKey && e.ctrlKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) || // Ctrl+Shift+I/J/C
                    (e.shiftKey && e.metaKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) || // Cmd+Shift+I/J/C على الماك
                    (cmdOrCtrl && (e.keyCode === 85 || e.keyCode === 83 || e.keyCode === 80 || e.keyCode === 72 || e.keyCode === 78)) || // Ctrl+U/S/P/H/N
                    (cmdOrCtrl && cmdOrAlt && (e.keyCode === 85 || e.keyCode === 73 || e.keyCode === 74)) // Ctrl+Alt+U/I/J
                ) {
                    if (window.showToast) window.showToast('🛡️ تم حظر الوصول لأدوات المطورين وحفظ الصفحة لحماية النظام', 'error');
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }, true);

            // 3. فخ المصحح (Debugger Trap) - يقوم بتجميد الصفحة إذا فُتحت أدوات المطورين
            setInterval(function () {
                const startTime = performance.now();
                debugger;
                const endTime = performance.now();
                if (endTime - startTime > 100) {
                    document.body.innerHTML = \`
                        <div style="height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; background:#0f172a; color:#fff; font-family:'El Messiri', sans-serif; text-align:center; padding:20px;">
                            <div style="font-size:80px; margin-bottom:20px;">🛡️</div>
                            <h1 style="color:#ef4444; font-size:32px;">نظام الحماية نشط</h1>
                            <p style="color:#94a3b8; font-size:18px; max-width:500px; line-height:1.8;">
                                عذراً، تم اكتشاف محاولة لفحص الشفرة البرمجية. <br> 
                                هذا النظام محمي ومشفر بالكامل ضد الاختراق. 
                                <br><br>
                                <span style="color:#38bdf8;">يرجى إغلاق أدوات المطورين وإعادة تحميل الصفحة للمتابعة.</span>
                            </p>
                            <button onclick="window.location.reload()" style="margin-top:30px; padding:12px 30px; border-radius:12px; border:none; background:#38bdf8; color:#0f172a; font-weight:bold; cursor:pointer;">إعادة تحميل الصفحة</button>
                        </div>
                    \`;
                }
            }, 1000);

            // 4. منع السحب والإفلات للمحتوى
            document.addEventListener('dragstart', event => event.preventDefault());
            */
        })();