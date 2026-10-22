const firebaseConfig = {
            apiKey: "AIzaSyAajiGNjaZLq60BWMXuimDsAV_cpG4_LTs",
            authDomain: "ehab-accounting.firebaseapp.com",
            projectId: "ehab-accounting",
            storageBucket: "ehab-accounting.firebasestorage.app",
            messagingSenderId: "492106610625",
            appId: "1:492106610625:web:89b5af9e0de6f145ca6140"
        };

        try {
            firebase.initializeApp(firebaseConfig);
            const db = firebase.firestore();
            window.db = db;
            try {
                db.enablePersistence({ synchronizeTabs: true }).catch(e => {
                    if (e && e.code === 'failed-precondition') {
                        console.log("Persistence active in main tab");
                    } else if (e && e.code === 'unimplemented') {
                        console.log("Browser does not support persistence");
                    } else {
                        console.log("Persistence offline active");
                    }
                });
            } catch (errPersist) {
                console.log("Persistence initialized offline:", errPersist);
            }

            let globalUserId = localStorage.getItem('app_auth_serial') || null;
            let unsubscribeSync = null;

            // سيتم تشغيل startRealtimeSync لاحقاً عبر النسخة الآمنة المحمية بعد تسجيل الدخول

            console.log("✅ Firebase Initialized + Persistence");

            // تحديد نوع الجهاز (للميتاداتا)
            const deviceType = (typeof detectDeviceType === 'function') ? detectDeviceType() : 'Unknown';

            // 3. دالة المزامنة برقم السيريال (Serial Code Auth)

            // Dynamic custom background upload logic
            // Multiple custom backgrounds logic (4 Slots)
            window.currentUploadSlot = 1;

            window.handleBgUpload = function (event) {
                const file = event.target.files[0];
                if (!file) return;

                const slotNum = window.currentUploadSlot || 1;
                const reader = new FileReader();
                reader.onload = function (e) {
                    const img = new Image();
                    img.onload = function() {
                        try {
                            // ضغط وتصغير الصورة تلقائياً بأبعاد الشاشة لتقليل الحجم 90% وحماية الذاكرة من التعليق
                            const canvas = document.createElement('canvas');
                            const maxW = 1920;
                            const maxH = 1080;
                            let width = img.width;
                            let height = img.height;

                            if (width > maxW || height > maxH) {
                                const ratio = Math.min(maxW / width, maxH / height);
                                width = Math.round(width * ratio);
                                height = Math.round(height * ratio);
                            }

                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, width, height);
                            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);

                            localStorage.setItem('acc_custom_bg_slot_' + slotNum, compressedBase64);
                            localStorage.setItem('acc_login_theme', 'theme-uploaded-' + slotNum);

                            window.applyDynamicUploadedBg();

                            // Sync buttons on the active overlays
                            if (typeof window.applyLoginTheme === 'function') {
                                window.applyLoginTheme('theme-uploaded-' + slotNum);
                            }
                            if (typeof window.applyTeamLoginTheme === 'function') {
                                window.applyTeamLoginTheme('theme-uploaded-' + slotNum);
                            }

                            window.showToast(`🎉 تم حفظ وتفعيل الخلفية المخصصة رقم ${slotNum} بنجاح وبحجم خفيف فائق السرعة!`, 'success');
                        } catch (err) {
                            console.error('BG Save error:', err);
                            window.showToast('عذراً، لم نتمكن من حفظ الصورة في ذاكرة المتصفح. يرجى تجربة صورة أصغر حجماً.', 'error');
                        }
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            };

            window.triggerBgUpload = function (slotNum) {
                window.currentUploadSlot = slotNum;
                const input = document.getElementById('bg-upload-input');
                if (input) {
                    input.click();
                } else {
                    const newInput = document.createElement('input');
                    newInput.type = 'file';
                    newInput.id = 'bg-upload-input';
                    newInput.accept = 'image/*';
                    newInput.style.display = 'none';
                    newInput.addEventListener('change', window.handleBgUpload);
                    document.body.appendChild(newInput);
                    newInput.click();
                }
            };

            window.handleSlotClick = function (slotNum) {
                const base64 = localStorage.getItem('acc_custom_bg_slot_' + slotNum);
                if (base64) {
                    // Activate slot
                    const themeClass = 'theme-uploaded-' + slotNum;
                    if (typeof window.applyLoginTheme === 'function') {
                        window.applyLoginTheme(themeClass);
                    }
                    if (typeof window.applyTeamLoginTheme === 'function') {
                        window.applyTeamLoginTheme(themeClass);
                    }
                } else {
                    // Empty: upload to slot
                    window.showToast(`رفع صورة جديدة للخلفية المخصصة رقم ${slotNum}...`, 'info');
                    window.triggerBgUpload(slotNum);
                }
            };

            window.handleSlotDblClick = function (slotNum) {
                window.showToast(`استبدال صورة الخلفية المخصصة رقم ${slotNum}...`, 'info');
                window.triggerBgUpload(slotNum);
            };

            window.applyDynamicUploadedBg = function () {
                let styleTag = document.getElementById('dynamic-uploaded-bg-style');
                if (!styleTag) {
                    styleTag = document.createElement('style');
                    styleTag.id = 'dynamic-uploaded-bg-style';
                    document.head.appendChild(styleTag);
                }

                let css = '';
                for (let i = 1; i <= 4; i++) {
                    const base64 = localStorage.getItem('acc_custom_bg_slot_' + i);
                    if (base64) {
                        css += `
                            #auth-overlay.theme-uploaded-${i} {
                                background-image: url('${base64}') !important;
                                background-size: cover !important;
                                background-position: center !important;
                            }
                            #team-login-overlay.theme-uploaded-${i} {
                                background-image: url('${base64}') !important;
                                background-size: cover !important;
                                background-position: center !important;
                            }
                            .btn-uploaded-slot-${i} {
                                background-image: url('${base64}') !important;
                                background-size: cover !important;
                                background-position: center !important;
                                border: 1px solid rgba(255,255,255,0.4) !important;
                            }
                        `;
                    } else {
                        css += `
                            .btn-uploaded-slot-${i} {
                                background: rgba(255,255,255,0.1) !important;
                                border: 1px dashed rgba(255,255,255,0.3) !important;
                            }
                        `;
                    }
                }
                styleTag.innerHTML = css;
            };

            // Run instantly to pre-load custom background if selected
            window.applyDynamicUploadedBg();

            // --- بناء واجهة السيريال الديناميكية ---
            if (!document.getElementById('auth-overlay')) {
                const savedSerial = localStorage.getItem('app_auth_serial');
                let savedTheme = localStorage.getItem('acc_login_theme') || 'theme-city';

                // Migrate old single-slot uploaded background
                if (savedTheme === 'theme-uploaded') {
                    savedTheme = 'theme-uploaded-1';
                    localStorage.setItem('acc_login_theme', 'theme-uploaded-1');
                    const oldBg = localStorage.getItem('acc_custom_bg_base64');
                    if (oldBg && !localStorage.getItem('acc_custom_bg_slot_1')) {
                        localStorage.setItem('acc_custom_bg_slot_1', oldBg);
                    }
                }
                const startDisplay = savedSerial ? 'none' : 'flex';

                const overlayHTML = `
                <div id="auth-overlay" class="${savedTheme}" style="position:fixed; top:0; left:0; width:100%; height:100%; z-index:20000000; display:${startDisplay}; justify-content:center; align-items:center; direction: rtl; font-family: 'Poppins', 'El Messiri', sans-serif; transition: background 0.8s ease, background-image 0.8s ease; background-size: cover; background-position: center; overflow-y: auto;">
                    <style>
                        #auth-overlay.theme-dark {
                            background: radial-gradient(circle at center, #1e293b 0%, #0f172a 60%, #020617 100%) !important;
                        }
                        #auth-overlay.theme-city {
                            background-image: url('https://images.unsplash.com/photo-1508962914676-134849a727f0?q=80&w=1920') !important;
                            background-size: cover !important;
                            background-position: center !important;
                        }
                        #auth-overlay.theme-cyan {
                            background-image: url('https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=1920') !important;
                            background-size: cover !important;
                            background-position: center !important;
                        }
                        #auth-overlay.theme-purple {
                            background-image: url('https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1920') !important;
                            background-size: cover !important;
                            background-position: center !important;
                        }
                        #auth-overlay.theme-custom {
                            background-image: url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920') !important;
                            background-size: cover !important;
                            background-position: center !important;
                        }
                        #auth-overlay.theme-desert {
                            background-image: url('https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=1920') !important;
                            background-size: cover !important;
                            background-position: center !important;
                        }
                        #auth-overlay.theme-cyberpunk {
                            background-image: url('https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?q=80&w=1920') !important;
                            background-size: cover !important;
                            background-position: center !important;
                        }
                        #auth-overlay.theme-gold {
                            background-image: url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1920') !important;
                            background-size: cover !important;
                            background-position: center !important;
                        }
                        #auth-overlay.theme-white {
                            background: radial-gradient(circle at center, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%) !important;
                        }

                        #auth-login-theme-selector button:hover {
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
                        
                        #auth-overlay .login-card {
                            position: relative;
                            width: 100%;
                            max-width: 440px;
                            background: rgba(17, 24, 39, 0.78);
                            backdrop-filter: blur(25px);
                            -webkit-backdrop-filter: blur(25px);
                            border: 2px solid #00d8ff;
                            border-radius: 35px;
                            padding: 40px 35px;
                            box-shadow: 0 0 45px rgba(0, 216, 255, 0.25), 0 30px 60px rgba(0,0,0,0.8);
                            color: #fff;
                            text-align: center;
                            box-sizing: border-box;
                            animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                        }
                        
                        #auth-overlay .login-input-wrapper {
                            position: relative;
                            margin-bottom: 20px;
                            width: 100%;
                        }
                        
                        #auth-overlay .login-input {
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
                        
                        #auth-overlay .login-input:focus {
                            border-color: #00d8ff !important;
                            box-shadow: 0 0 15px rgba(0, 216, 255, 0.35) !important;
                            background: rgba(255, 255, 255, 0.13) !important;
                        }
                        
                        #auth-overlay .login-btn-cyan {
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
                        
                        #auth-overlay .login-btn-cyan:hover {
                            background: #00f0ff !important;
                            box-shadow: 0 0 25px rgba(0, 240, 255, 0.6) !important;
                            transform: translateY(-2px);
                        }
                        
                        #auth-overlay .login-btn-gold {
                            width: 100%;
                            padding: 14px;
                            background: linear-gradient(90deg, #d4af37, #b8860b) !important;
                            color: #000 !important;
                            border: none !important;
                            border-radius: 30px !important;
                            font-weight: 900 !important;
                            font-size: 16px !important;
                            cursor: pointer !important;
                            transition: 0.3s ease !important;
                            box-shadow: 0 0 20px rgba(212, 175, 55, 0.3) !important;
                        }
                        
                        #auth-overlay .login-btn-gold:hover {
                            transform: translateY(-2px);
                            box-shadow: 0 0 25px rgba(212, 175, 55, 0.5) !important;
                        }
                    </style>

                    <!-- Center Card (Login Card) -->
                    <div class="login-card">
                        <!-- Card Header -->
                        <h2 style="font-size: 26px; font-weight: 900; letter-spacing: 2px; color: #fff; display: flex; align-items: center; justify-content: center; gap: 10px; margin: 0 0 10px 0; font-family: 'Poppins', sans-serif;">
                            <span style="background: #0284c7; color: #fff; padding: 4px 10px; border-radius: 8px; font-size: 14px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(2, 132, 199, 0.5);">➔</span>
                            <span style="text-shadow: 0 0 15px rgba(255,255,255,0.4);">LOGIN</span>
                            <span style="color: #ef4444; filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.6)); animation: heartbeat 1.5s infinite; display: inline-block;">❤️</span>
                        </h2>
                        
                        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 20px;">نظام بيان لإدارة التراخيص والأجهزة السحابية</p>

                        <!-- Tab Selection (Sleek switches) -->
                        <div style="display: flex; background: rgba(0,0,0,0.3); border-radius: 20px; padding: 4px; margin-bottom: 25px; border: 1px solid rgba(255,255,255,0.05);">
                            <button type="button" onclick="window.switchLoginTab('signin')" id="tab-btn-signin" style="flex: 1; padding: 8px 12px; border: none; border-radius: 16px; background: #00d8ff; color: #000; font-weight: bold; cursor: pointer; transition: 0.3s; font-size: 13px;">تسجيل الدخول</button>
                            <button type="button" onclick="window.switchLoginTab('signup')" id="tab-btn-signup" style="flex: 1; padding: 8px 12px; border: none; border-radius: 16px; background: transparent; color: #8f8f96; font-weight: bold; cursor: pointer; transition: 0.3s; font-size: 13px;">حساب جديد</button>
                        </div>

                        <!-- SECTION 1: SIGN IN (Default) -->
                        <div id="sec-signin" style="display: block;">
                            <div class="login-input-wrapper">
                                <input type="password" id="existing-serial" class="login-input" placeholder="أدخل كود السريال (مثال: BYN-XXXX)" style="text-transform: uppercase;">
                                <span onclick="window.toggleSerialVisibility()" style="position: absolute; left: 20px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #94a3b8; font-size: 16px; transition: 0.2s;" id="serial-eye-icon">👁️</span>
                            </div>
                            
                            <button id="login-serial-btn" class="login-btn-cyan">Sign In</button>
                            
                            <div style="margin-top: 20px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 15px;">
                                <a href="#" id="emergency-reset-link" style="color: #ff3b7e; font-size: 11px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 5px;">
                                    🔒 نسيت كود السريال؟ (Forgot Password)
                                </a>
                            </div>
                        </div>

                        <!-- SECTION 2: SIGN UP -->
                        <div id="sec-signup" style="display: none;">
                            <div class="login-input-wrapper">
                                <input type="text" id="new-user-name" class="login-input" placeholder="اسم المنشأة / المدير (مثال: اسم محلك أو شركتك أو اسمك)">
                            </div>
                            
                            <div class="login-input-wrapper">
                                <input type="tel" id="new-user-phone" class="login-input" placeholder="رقم الهاتف (لتأمين حسابك)">
                            </div>

                            <div class="login-input-wrapper" style="position: relative;">
                                <input type="password" id="new-user-pass" class="login-input" placeholder="كلمة سر المدير العام (4 أرقام أو حروف على الأقل)">
                                <span onclick="const p = document.getElementById('new-user-pass'); if(p){ p.type = p.type==='password'?'text':'password'; this.textContent = p.type==='password'?'👁️':'🔒'; }" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #94a3b8; font-size: 14px; user-select: none;">👁️</span>
                            </div>
                            
                            <button id="generate-serial-btn" class="login-btn-gold">إنشاء حساب وتوليد كود</button>
                        </div>
                    </div>

                    <!-- Side Vertical Background Theme Selector (Sleek Luxury Edge Dock) -->
                    <div id="auth-login-theme-selector" style="position: fixed; left: 0; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 8px; background: rgba(15, 23, 42, 0.88); backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px); padding: 14px 10px 14px 8px; border-radius: 0 24px 24px 0; border: 1.5px solid rgba(0, 216, 255, 0.4); border-left: none; z-index: 10000; align-items: center; justify-content: flex-start; box-shadow: 12px 0 35px rgba(0,0,0,0.7), 0 0 25px rgba(0,216,255,0.2); max-height: calc(100vh - 40px); overflow-y: auto; overflow-x: hidden; scrollbar-width: none;">
                        <!-- Theme Header Icon & Glow Accent -->
                        <div style="font-size: 15px; margin-bottom: 2px; user-select: none; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 0 6px rgba(0, 216, 255, 0.6));" title="اختر مظهر وخلفية الشاشة">🎨</div>
                        <div style="width: 20px; height: 1.5px; background: linear-gradient(90deg, #00d8ff, rgba(0, 216, 255, 0.2)); margin-bottom: 6px; border-radius: 2px;"></div>

                        <!-- 1. City Sunset -->
                        <button onclick="window.applyLoginTheme('theme-city')" style="border: none; width: 34px; height: 34px; border-radius: 11px; background-image: url('https://images.unsplash.com/photo-1508962914676-134849a727f0?q=80&w=150'); background-size: cover; background-position: center; cursor: pointer; border: 1.5px solid rgba(255,255,255,0.25); transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); flex-shrink: 0;" title="🌆 غروب المدينة الحديثة" id="btn-theme-city"></button>

                        <!-- 2. Dark Luxury -->
                        <button onclick="window.applyLoginTheme('theme-dark')" style="border: none; width: 34px; height: 34px; border-radius: 11px; background: radial-gradient(circle at center, #334155 0%, #0f172a 100%); cursor: pointer; border: 1.5px solid rgba(255,255,255,0.25); transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); flex-shrink: 0;" title="🖤 الفخامة الداكنة الملكية" id="btn-theme-dark"></button>

                        <!-- 3. Emerald Aurora -->
                        <button onclick="window.applyLoginTheme('theme-cyan')" style="border: none; width: 34px; height: 34px; border-radius: 11px; background-image: url('https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=150'); background-size: cover; background-position: center; cursor: pointer; border: 1.5px solid rgba(255,255,255,0.25); transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); flex-shrink: 0;" title="✨ الشفق القطبي الزمردي" id="btn-theme-cyan"></button>

                        <!-- 4. Cosmic Purple Nebula -->
                        <button onclick="window.applyLoginTheme('theme-purple')" style="border: none; width: 34px; height: 34px; border-radius: 11px; background-image: url('https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=150'); background-size: cover; background-position: center; cursor: pointer; border: 1.5px solid rgba(255,255,255,0.25); transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); flex-shrink: 0;" title="🔮 سديم الفضاء الأرجواني" id="btn-theme-purple"></button>

                        <!-- 5. Cyber Earth Space -->
                        <button onclick="window.applyLoginTheme('theme-custom')" style="border: none; width: 34px; height: 34px; border-radius: 11px; background-image: url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=150'); background-size: cover; background-position: center; cursor: pointer; border: 1.5px solid rgba(255,255,255,0.25); transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); flex-shrink: 0;" title="🌐 فضاء النيون الرقمي" id="btn-theme-custom"></button>

                        <!-- 6. Desert Night -->
                        <button onclick="window.applyLoginTheme('theme-desert')" style="border: none; width: 34px; height: 34px; border-radius: 11px; background-image: url('https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=150'); background-size: cover; background-position: center; cursor: pointer; border: 1.5px solid rgba(255,255,255,0.25); transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); flex-shrink: 0;" title="🏜️ ليلة الصحراء الذهبية" id="btn-theme-desert"></button>

                        <!-- 7. Tokyo Cyberpunk -->
                        <button onclick="window.applyLoginTheme('theme-cyberpunk')" style="border: none; width: 34px; height: 34px; border-radius: 11px; background-image: url('https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?q=80&w=150'); background-size: cover; background-position: center; cursor: pointer; border: 1.5px solid rgba(255,255,255,0.25); transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); flex-shrink: 0;" title="⚡ طوكيو نيون سايبربانك" id="btn-theme-cyberpunk"></button>

                        <!-- 8. Liquid Gold Waves -->
                        <button onclick="window.applyLoginTheme('theme-gold')" style="border: none; width: 34px; height: 34px; border-radius: 11px; background-image: url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=150'); background-size: cover; background-position: center; cursor: pointer; border: 1.5px solid rgba(255,255,255,0.25); transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); flex-shrink: 0;" title="👑 تموجات الذهب الملكية" id="btn-theme-gold"></button>

                        <!-- 9. Pearl White Modern -->
                        <button onclick="window.applyLoginTheme('theme-white')" style="border: none; width: 34px; height: 34px; border-radius: 11px; background: radial-gradient(circle at center, #ffffff 0%, #cbd5e1 100%); cursor: pointer; border: 1.5px solid rgba(255,255,255,0.25); transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1); flex-shrink: 0;" title="🤍 اللؤلؤ الأبيض النقي" id="btn-theme-white"></button>
                    </div>

                    <!-- Bottom-Right Luxury Clock Widget -->
                    <div id="login-bottom-widget" style="position: absolute; bottom: 20px; right: 20px; left: auto; background: rgba(17, 24, 39, 0.75); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); padding: 8px 18px; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); text-align: center; color: #fff; z-index: 1000; min-width: 160px;">
                        <div id="login-widget-date-btm" style="font-size: 13px; font-weight: bold; color: #cbd5e1; margin-bottom: 2px;">...</div>
                        <div id="login-widget-time-btm" style="font-size: 22px; font-weight: 900; font-family: 'Poppins', sans-serif; color: #00d8ff; text-shadow: 0 0 15px rgba(0, 216, 255, 0.6); letter-spacing: 1px;">...</div>
                    </div>
                </div>`;

                document.body.insertAdjacentHTML('beforeend', overlayHTML);

                // Clock logic for bottom widget
                function updateLoginBottomWidgetTime() {
                    const timeEl = document.getElementById('login-widget-time-btm');
                    const dateEl = document.getElementById('login-widget-date-btm');

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

                // Toggle between Sign In / Sign Up tabs
                window.switchLoginTab = function (tabName) {
                    const signinSec = document.getElementById('sec-signin');
                    const signupSec = document.getElementById('sec-signup');
                    const btnSignin = document.getElementById('tab-btn-signin');
                    const btnSignup = document.getElementById('tab-btn-signup');

                    if (!signinSec || !signupSec || !btnSignin || !btnSignup) return;

                    if (tabName === 'signin') {
                        signinSec.style.display = 'block';
                        signupSec.style.display = 'none';
                        btnSignin.style.background = '#00d8ff';
                        btnSignin.style.color = '#000';
                        btnSignup.style.background = 'transparent';
                        btnSignup.style.color = '#8f8f96';
                    } else {
                        signinSec.style.display = 'none';
                        signupSec.style.display = 'block';
                        btnSignup.style.background = 'linear-gradient(90deg, #d4af37, #b8860b)';
                        btnSignup.style.color = '#000';
                        btnSignin.style.background = 'transparent';
                        btnSignin.style.color = '#8f8f96';
                    }
                };

                // Show / hide serial password
                window.toggleSerialVisibility = function () {
                    const input = document.getElementById('existing-serial');
                    const eye = document.getElementById('serial-eye-icon');
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

                // Theme switching logic inside auth overlay
                window.applyLoginTheme = function (themeClass) {
                    const overlay = document.getElementById('auth-overlay');
                    if (!overlay) return;

                    overlay.className = ''; // Reset classes
                    overlay.classList.add(themeClass);

                    localStorage.setItem('acc_login_theme', themeClass);

                    // Highlight active border on selector preview buttons
                    const buttons = overlay.querySelectorAll('#auth-login-theme-selector button');
                    buttons.forEach(btn => {
                        const btnId = btn.id || '';
                        const isMatch = btnId === 'btn-' + themeClass;
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
                setInterval(updateLoginBottomWidgetTime, 1000);
                updateLoginBottomWidgetTime();
                setTimeout(() => {
                    let activeTheme = localStorage.getItem('acc_login_theme') || 'theme-city';
                    if (activeTheme.startsWith('theme-uploaded')) {
                        activeTheme = 'theme-city';
                        localStorage.setItem('acc_login_theme', 'theme-city');
                    }
                    window.applyLoginTheme(activeTheme);
                }, 50);

                // منظومة توليد حساب جديد وترخيص نظيف بالكامل
                window.handleGenerateNewFacilityAccount = async function (sourceNameInputId, sourcePhoneInputId, sourcePassInputId) {
                    const nameInput = document.getElementById(sourceNameInputId || 'new-user-name') || document.getElementById('team-new-user-name');
                    const phoneInput = document.getElementById(sourcePhoneInputId || 'new-user-phone') || document.getElementById('team-new-user-phone');
                    const passInput = document.getElementById(sourcePassInputId || 'new-user-pass') || document.getElementById('team-new-user-pass');

                    const name = nameInput ? nameInput.value.trim() : '';
                    const phone = phoneInput ? phoneInput.value.trim() : '';
                    const rawPass = passInput ? passInput.value.trim() : '';

                    if (!name) {
                        if (typeof showToast === 'function') showToast('⚠️ يرجى إدخال اسم المنشأة أو المدير للمتابعة', 'warning');
                        else if (typeof showModernAlert === 'function') showModernAlert('يرجى إدخال اسم المنشأة أو المدير للمتابعة', 'warning');
                        else alert('يرجى إدخال اسم المنشأة أو المدير للمتابعة');
                        if (nameInput) nameInput.focus();
                        return;
                    }

                    if (!rawPass || rawPass.length < 4) {
                        if (typeof showToast === 'function') showToast('⚠️ يرجى تحديد كلمة سر قوية للمدير (4 خانات على الأقل لتأمين حسابك)', 'warning');
                        else alert('يرجى تحديد كلمة سر قوية للمدير (4 خانات على الأقل)');
                        if (passInput) passInput.focus();
                        return;
                    }

                    // توليد سيريال قوي واحترافي (Alphanumeric BYN-XXXX-XXXX)
                    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                    const generatePart = (len) => {
                        let part = '';
                        for (let i = 0; i < len; i++) part += chars.charAt(Math.floor(Math.random() * chars.length));
                        return part;
                    };
                    const newSerial = `BYN-${generatePart(4)}-${generatePart(4)}`;

                    // 1. تصفير قاعدة بيانات دكسي (IndexedDB) بالكامل لضمان فتح صفحة بيضاء نظيفة
                    if (window.BayanDB && typeof window.BayanDB.resetForNewAccount === 'function') {
                        try { await window.BayanDB.resetForNewAccount(); } catch (e) { }
                    }

                    // 2. تنظيف السجلات اليومية والبيانات القديمة من التخزين المحلي
                    const keysToRemove = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const k = localStorage.key(i);
                        if (!k) continue;
                        if (k.startsWith('acc_') && /^acc_\d{4}-\d{2}-\d{2}$/.test(k)) {
                            keysToRemove.push(k);
                        } else if (k.startsWith('acc_inv_')) {
                            keysToRemove.push(k);
                        } else if (k.startsWith('acc_ext_')) {
                            keysToRemove.push(k);
                        } else if (k.startsWith('acc_saved_pass_')) {
                            keysToRemove.push(k);
                        }
                    }
                    keysToRemove.forEach(k => localStorage.removeItem(k));
                    localStorage.removeItem('records');
                    localStorage.removeItem('acc_bayan_notifications');
                    localStorage.removeItem('acc_notifications');
                    localStorage.removeItem('acc_user_activity_logs');

                    // 3. إنشاء حساب المدير العام المشفر والآمن
                    const finalAdminName = name.includes('المدير') ? name : `المدير العام ${name}`;
                    const hashedAdminPass = (window.BayanSecurity && typeof window.BayanSecurity.hashPassword === 'function')
                        ? await window.BayanSecurity.hashPassword(rawPass)
                        : rawPass;

                    const newUsers = [{
                        id: 'admin1',
                        name: finalAdminName,
                        role: 'admin',
                        pass: hashedAdminPass
                    }];

                    localStorage.setItem('acc_bayan_users', JSON.stringify(newUsers));
                    localStorage.setItem('acc_last_emp_id', 'admin1');
                    localStorage.setItem('acc_saved_pass_admin1', hashedAdminPass);
                    localStorage.setItem('acc_current_user_id', 'admin1');
                    localStorage.setItem('acc_current_user_name', finalAdminName);
                    localStorage.setItem('acc_current_user_role', 'admin');
                    localStorage.setItem('acc_user_name', name);
                    localStorage.setItem('acc_user_phone', phone);
                    localStorage.setItem('app_auth_serial', newSerial);
                    localStorage.setItem('acc_session_timestamp', Date.now().toString());

                    // تسجيل السيريال في السيرفر المحلي (SQLite إن وجد)
                    if (typeof DB_API !== 'undefined' && typeof DB_API.saveUser === 'function') {
                        try {
                            DB_API.saveUser({
                                serial: newSerial,
                                name: name,
                                phone: phone,
                                role: 'master',
                                createdAt: new Date().toISOString()
                            });
                        } catch (e) { }
                    }

                    // تسجيل السيريال في السيرفر السحابي (Firebase)
                    if (typeof db !== 'undefined' && navigator.onLine) {
                        db.collection("users").doc(newSerial).set({
                            registered: true,
                            ownerName: name,
                            ownerPhone: phone,
                            createdAt: new Date().toISOString(),
                            role: 'master'
                        }, { merge: true }).catch(e => console.error("Cloud registration error:", e));

                        const deviceId = localStorage.getItem('acc_device_id') || 'BYN-' + Math.random().toString(36).substr(2, 9).toUpperCase();
                        localStorage.setItem('acc_device_id', deviceId);

                        db.collection("users").doc(newSerial).collection("devices").doc(deviceId).set({
                            id: deviceId,
                            name: 'الجهاز الرئيسي (Master)',
                            status: 'authorized',
                            role: 'master',
                            lastSeen: new Date().toISOString(),
                            isMaster: true
                        }, { merge: true }).catch(e => { });
                    }

                    // إظهار كارت الترخيص الملكي الفاخر
                    const existingModal = document.getElementById('serial-save-modal');
                    if (existingModal) existingModal.remove();

                    const modalHtml = `
                    <div id="serial-save-modal" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.92); z-index:21000000; display:flex; justify-content:center; align-items:center; direction:rtl; font-family:'Readex Pro', 'Tajawal', 'El Messiri', sans-serif; backdrop-filter:blur(15px); -webkit-backdrop-filter:blur(15px);">
                        <div id="serial-card-premium" style="background:linear-gradient(145deg, #1e293b, #0f172a); padding:38px 32px; border-radius:30px; text-align:center; border:2px solid #d4af37; max-width:460px; width:92%; box-shadow:0 0 50px rgba(212, 175, 55, 0.35), 0 30px 60px rgba(0,0,0,0.85); color:#fff; position:relative; box-sizing:border-box;">
                            <div style="width:68px; height:68px; margin:0 auto 16px auto; border-radius:22px; background:linear-gradient(135deg, rgba(212, 175, 55, 0.25), rgba(184, 134, 11, 0.45)); border:2px solid #d4af37; display:flex; align-items:center; justify-content:center; font-size:32px; box-shadow:0 0 25px rgba(212, 175, 55, 0.45);">👑</div>
                            <h2 style="color:#d4af37; margin:0 0 8px 0; font-size:24px; font-weight:900;">تم إنشاء الحساب بنجاح!</h2>
                            <p style="color:#cbd5e1; font-size:14px; margin-bottom:22px; line-height:1.6;">أهلاً بك يا <b>${name}</b> في بيان POS.<br>هذا هو كود الترخيص الخاص بك، احتفظ به جيداً:</p>
                            
                            <div style="background:rgba(0,0,0,0.45); border:1.5px dashed #d4af37; padding:20px; border-radius:20px; margin-bottom:26px; box-shadow:inset 0 0 20px rgba(0,0,0,0.5);">
                                <div style="font-size:11px; color:#94a3b8; text-transform:uppercase; letter-spacing:2px; margin-bottom:8px; font-weight:bold;">Your Private License Key</div>
                                <div id="display-serial-text" style="font-size:28px; font-weight:900; color:#f8fafc; letter-spacing:4px; font-family:'Poppins', monospace;">${newSerial}</div>
                            </div>
                            
                            <div style="display:flex; gap:12px; justify-content:center;">
                                <button id="download-serial-img" onclick="window.saveLicenseCardAsImage('${newSerial}')" style="flex:1; padding:14px; background:linear-gradient(90deg, #d4af37, #b8860b); color:#000; border:none; border-radius:16px; font-weight:900; cursor:pointer; font-size:14px; box-shadow:0 0 18px rgba(212,175,55,0.4); font-family:inherit; transition:0.25s;">📸 حفظ الصورة</button>
                                <button id="start-app-btn" onclick="window.enterAppWithNewAccount()" style="flex:1; padding:14px; background:linear-gradient(90deg, #10b981, #059669); color:#fff; border:none; border-radius:16px; font-weight:900; cursor:pointer; font-size:14px; box-shadow:0 0 18px rgba(16,185,129,0.4); font-family:inherit; transition:0.25s;">دخول التطبيق 🚀</button>
                            </div>
                        </div>
                    </div>`;

                    document.body.insertAdjacentHTML('beforeend', modalHtml);
                };

                window.saveLicenseCardAsImage = function (serial) {
                    const card = document.getElementById('serial-card-premium');
                    if (!card) return;
                    const btnGroup = card.querySelector('div[style*="display:flex"]');
                    if (btnGroup) btnGroup.style.opacity = '0';

                    if (typeof html2canvas !== 'undefined') {
                        html2canvas(card, { backgroundColor: '#0f172a', borderRadius: 30 }).then(canvas => {
                            const link = document.createElement('a');
                            link.download = `License-${serial}.png`;
                            link.href = canvas.toDataURL();
                            link.click();
                            if (btnGroup) btnGroup.style.opacity = '1';
                            if (typeof showToast === 'function') showToast('✅ تم حفظ صورة كارت الترخيص بنجاح', 'success');
                        }).catch(err => {
                            if (btnGroup) btnGroup.style.opacity = '1';
                            console.error('html2canvas error', err);
                        });
                    } else {
                        if (btnGroup) btnGroup.style.opacity = '1';
                        if (typeof showToast === 'function') showToast('كود السيريال: ' + serial, 'info');
                    }
                };

                window.enterAppWithNewAccount = function () {
                    sessionStorage.setItem('acc_auto_enter', 'true');
                    const modal = document.getElementById('serial-save-modal');
                    if (modal) modal.remove();
                    const teamOverlay = document.getElementById('team-login-overlay');
                    if (teamOverlay) teamOverlay.remove();
                    const authOverlay = document.getElementById('auth-overlay');
                    if (authOverlay) authOverlay.style.display = 'none';

                    window.location.reload();
                };

                const genSerialBtn = document.getElementById('generate-serial-btn');
                if (genSerialBtn) {
                    genSerialBtn.addEventListener('click', () => {
                        window.handleGenerateNewFacilityAccount('new-user-name', 'new-user-phone', 'new-user-pass');
                    });
                }

                // دعم الضغط على Enter في حقول تسجيل الدخول
                const serialInput = document.getElementById('existing-serial');
                if (serialInput) {
                    serialInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            document.getElementById('login-serial-btn').click();
                        }
                    });
                }

                const newUserNameInput = document.getElementById('new-user-name');
                const newUserPhoneInput = document.getElementById('new-user-phone');
                [newUserNameInput, newUserPhoneInput].forEach(inp => {
                    if (inp) {
                        inp.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                document.getElementById('generate-serial-btn').click();
                            }
                        });
                    }
                });

                document.getElementById('login-serial-btn').addEventListener('click', () => {
                    let serial = document.getElementById('existing-serial').value.trim().toUpperCase();
                    if (!serial) {
                        if (typeof showToast === 'function') showToast('⚠️ يرجى إدخال السيريال للمتابعة', 'warning');
                        else showModernAlert('يرجى إدخال السيريال للمتابعة', 'warning');
                        return;
                    }

                    if (window.showToast) showToast('🚀 جاري التحقق وتسجيل الدخول بالسيريال...', 'info');
                    loginWithSerial(serial, true);
                });

                // --- زر الطوارئ (تصفير الجلسة عبر ميزة الهاتف) ---
                const emergencyLink = document.getElementById('emergency-reset-link');
                if (emergencyLink) {
                    emergencyLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        const serial = document.getElementById('existing-serial').value.trim().toUpperCase();
                        if (!serial) {
                            showModernAlert('⚠️ يرجى إدخال كود السيريال أولاً لكي نعرف الحساب المطلوب تصفيره.', 'warning');
                            return;
                        }

                        // طلب رقم الهاتف وكلمة سر المدير لتأكيد الهوية ومنع الاختراق
                        showModernAlert({
                            title: '🆘 استعادة جلسة الطوارئ',
                            body: `أدخل رقم الهاتف المسجل كاملاً لتأكيد ملكيتك للسيريال (${serial}) وتفعيل هذا الجهاز بأمان.`,
                            type: 'info',
                            confirmText: 'متابعة التحقق',
                            cancelText: 'إلغاء',
                            hasInput: true,
                            inputPlaceholder: 'رقم الهاتف المسجل كاملاً (مثال: 010xxxxxxxx)',
                            onConfirm: (phone) => {
                                if (!phone || phone.trim().length < 8) {
                                    if (typeof showToast === 'function') showToast('⚠️ يرجى إدخال رقم الهاتف المسجل كاملاً', 'error');
                                    return;
                                }
                                const pass = prompt('🔐 يرجى إدخال كلمة سر المدير العام للمنشأة لتأكيد الهوية:');
                                if (!pass) {
                                    if (typeof showToast === 'function') showToast('⚠️ كلمة سر المدير مطلوبة للمتابعة', 'warning');
                                    return;
                                }
                                if (typeof handleEmergencyReset === 'function') {
                                    handleEmergencyReset(serial, phone.trim(), pass.trim());
                                }
                            }
                        });
                    });
                }
            }

            window.showLoginModal = function () {
                const authOverlay = document.getElementById('auth-overlay');
                if (authOverlay) {
                    const appContainer = document.getElementById('app');
                    if (appContainer) appContainer.style.display = 'none';
                    const teamOverlay = document.getElementById('team-login-overlay');
                    if (teamOverlay) teamOverlay.remove();
                    
                    authOverlay.style.display = 'flex';
                    const serialInput = document.getElementById('existing-serial');
                    if (serialInput) {
                        serialInput.value = localStorage.getItem('app_auth_serial') || '';
                        setTimeout(() => serialInput.focus(), 100);
                    }
                } else {
                    window.location.reload();
                }
            };

            window.logoutFromSerial = function () {
                if (!confirm('هل أنت متأكد من تسجيل الخروج من هذا السيريال؟ سيتم قفل الوصول للبيانات السحابية من هذا الجهاز.')) return;

                // تنظيف شامل للبيانات قبل الخروج
                if (typeof clearLocalCache === 'function') clearLocalCache();

                localStorage.removeItem('app_auth_serial');
                localStorage.removeItem('acc_current_user_id');
                localStorage.removeItem('acc_current_user_name');
                localStorage.removeItem('acc_current_user_role');
                // Clear any other login related keys
                localStorage.removeItem('acc_logged_in_user');
                sessionStorage.clear();
                if (unsubscribeSync) unsubscribeSync();
                window.location.reload();
            };

            // إضافة زر تسجيل خروج للأعلى (في شريط الأدوات بتصميم مميز)
            const toolsContainer = document.querySelector('.system-tools');
            if (toolsContainer) {
                // Remove if already exists
                const existing = document.getElementById('header-logout-btn');
                if (existing) existing.remove();

                const userName = localStorage.getItem('acc_user_name') || 'المستخدم';
                const isAuth = localStorage.getItem('app_auth_serial');
                const logoutBtnHtml = `
                    <button id="header-logout-btn" class="btn-logout-premium" title="حساب: ${userName}" 
                        style="display: ${isAuth ? 'inline-flex' : 'none'};"
                        onclick="if(window.logoutFromSerial) window.logoutFromSerial();">
                        <div class="user-info-mini">
                            <span class="user-name-text" style="font-size: 11px; opacity: 0.8; margin-left: 5px;">${userName}</span>
                        </div>
                        <div class="logout-icon-box">
                           <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        </div>
                        <span class="logout-text">خروج</span>
                    </button>
                    <style>
                        .btn-logout-premium {
                            align-items: center;
                            gap: 6px;
                            padding: 6px 14px;
                            background: linear-gradient(135deg, rgba(239, 68, 68, 0.4), rgba(239, 68, 68, 0.6));
                            border: 1px solid rgba(239, 68, 68, 0.5);
                            border-radius: 12px;
                            color: #fff;
                            cursor: pointer;
                            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                            font-size: 13px;
                            font-weight: 700;
                            backdrop-filter: blur(15px);
                            box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
                            margin-right: 10px;
                        }
                        .btn-logout-premium:hover {
                            background: #ef4444;
                            border-color: #ef4444;
                            box-shadow: 0 6px 20px rgba(239, 68, 68, 0.5);
                            transform: translateY(-2px);
                        }
                        .user-info-mini {
                            display: flex;
                            align-items: center;
                            border-left: 1px solid rgba(239,68,68,0.2);
                            margin-left: 8px;
                            padding-left: 8px;
                        }
                        .logout-icon-box {
                            display: flex;
                            align-items: center;
                            transition: transform 0.3s;
                        }
                        .btn-logout-premium:hover .logout-icon-box {
                            transform: translateX(-3px);
                        }
                        @media (max-width: 800px) {
                            .user-name-text, .logout-text { display: none; }
                            .user-info-mini { border: none; margin: 0; padding: 0; }
                            .btn-logout-premium { padding: 10px; border-radius: 50%; }
                        }
                    </style>
                    `;
                toolsContainer.insertAdjacentHTML('beforeend', logoutBtnHtml);

                // Login handled by window.logoutFromSerial via onclick
                const btn = document.getElementById('header-logout-btn');

                // Add a small device count badge next to logout if possible
                const badgeHtml = `<span id="header-device-badge" title="الأجهزة المتصلة" style="position: absolute; top: -5px; right: -5px; background: var(--success); color: white; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; display: none; align-items: center; justify-content: center; border: 2px solid var(--neu-bg); font-weight: bold; z-index: 5;">0</span>`;
                btn.style.position = 'relative';
                btn.insertAdjacentHTML('beforeend', badgeHtml);
            }

            globalUserId = localStorage.getItem('app_auth_serial') || null;
            unsubscribeSync = null;

            // دالة لتنظيف الذاكرة المحلية لضمان استقلالية البيانات لكل سيريال
            function clearLocalCache() {
                const keysToKeep = [
                    'app_auth_serial',
                    'acc_device_id',
                    'acc_user_name',
                    'acc_user_phone',
                    'acc_registered_serials',
                    'acc_current_user_id',
                    'acc_current_user_name',
                    'acc_current_user_role'
                ];

                const keys = Object.keys(localStorage);
                keys.forEach(key => {
                    if (!keysToKeep.includes(key) && (key.startsWith('acc_') || key.startsWith('app_') || key.includes('data_'))) {
                        localStorage.removeItem(key);
                    }
                });
                console.log("🧹 Local cache cleared for new serial session.");
            }

            async function getDeviceFingerprint() {
                const nav = window.navigator;
                const screen = window.screen;
                const fingerprint = [
                    nav.userAgent,
                    nav.language,
                    nav.platform,
                    screen.width + 'x' + screen.height,
                    screen.colorDepth,
                    new Date().getTimezoneOffset(),
                    !!window.indexedDB,
                    !!window.sessionStorage,
                    !!window.localStorage
                ].join('|');

                let hash = 0;
                for (let i = 0; i < fingerprint.length; i++) {
                    const char = fingerprint.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash;
                }
                return 'PRINT-' + Math.abs(hash).toString(16).toUpperCase();
            }

            async function handleEmergencyReset(serial, phone, adminPass) {
                if (typeof showToast === 'function') showToast('⏳ جاري التحقق من البيانات...', 'info');

                try {
                    const userDoc = await db.collection("users").doc(serial).get();
                    if (!userDoc.exists) {
                        showModernAlert('❌ هذا السيريال غير موجود في السجلات لدينا.', 'error');
                        return;
                    }

                    const userData = userDoc.data();
                    const registeredPhone = String(userData.ownerPhone || userData.phone || '').replace(/\D/g, '');
                    const inputPhone = String(phone).replace(/\D/g, '');

                    // التحقق من رقم الهاتف بالكامل
                    const isPhoneMatch = (registeredPhone && inputPhone && (registeredPhone === inputPhone || (registeredPhone.endsWith(inputPhone) && inputPhone.length >= 9)));
                    if (!isPhoneMatch) {
                        showModernAlert('❌ عذراً، رقم الهاتف غير مطابق للرقم المسجل لهذا السيريال.', 'error');
                        return;
                    }

                    // التحقق من كلمة سر المدير المسجلة
                    let isPassValid = true;
                    if (userData.ownerPass) {
                        if (window.BayanSecurity && typeof window.BayanSecurity.verifyPassword === 'function') {
                            const check = await window.BayanSecurity.verifyPassword(adminPass, userData.ownerPass);
                            isPassValid = check.valid;
                        } else {
                            isPassValid = (adminPass === userData.ownerPass);
                        }
                    }

                    if (!isPassValid) {
                        showModernAlert('❌ كلمة سر المدير غير صحيحة. تم رفض استعادة الجلسة.', 'error');
                        return;
                    }

                    const currentDeviceId = localStorage.getItem('acc_device_id') || 'BYN-' + Math.random().toString(36).substr(2, 9).toUpperCase();
                    localStorage.setItem('acc_device_id', currentDeviceId);
                    const fingerprint = await getDeviceFingerprint();

                    await db.collection("users").doc(serial).collection("devices").doc(currentDeviceId).set({
                        id: currentDeviceId,
                        name: (userData.ownerName || 'جهاز طوارئ') + ' (Reset)',
                        status: 'authorized',
                        role: 'master',
                        lastSeen: new Date().toISOString(),
                        fingerprint: fingerprint,
                        platform: navigator.platform || 'unknown'
                    }, { merge: true });

                    showModernAlert('✅ تم التحقق بنجاح! تم تفعيل هذا الجهاز كجهاز رئيسي (Master)، يمكنك الدخول الآن.', 'success');
                    loginWithSerial(serial, true);
                } catch (err) {
                    console.error("Emergency Reset Error:", err);
                    showModernAlert('❌ حدث خطأ أثناء عملية التحقق. تأكد من الإنترنت وحاول ثانية.', 'error');
                }
            }

            async function loginWithSerial(serialString, isExplicitLogin = false) {
                serialString = (serialString || '').trim().toUpperCase();
                if (!serialString) {
                    if (isExplicitLogin) {
                        if (typeof showToast === 'function') showToast('⚠️ يرجى إدخال كود السيريال للمتابعة', 'warning');
                        else if (typeof showModernAlert === 'function') showModernAlert('يرجى إدخال كود السيريال للمتابعة', 'warning');
                    }
                    return;
                }

                if (isExplicitLogin && typeof showToast === 'function') {
                    showToast('🔍 جاري التحقق وتسجيل الدخول بالسيريال...', 'info');
                }

                const prevSerial = localStorage.getItem('app_auth_serial');
                const isSwitching = Boolean(prevSerial && prevSerial !== serialString);

                const currentDeviceId = localStorage.getItem('acc_device_id') || 'BYN-' + Math.random().toString(36).substr(2, 9).toUpperCase();
                localStorage.setItem('acc_device_id', currentDeviceId);

                let ownerName = null;
                let ownerPhone = null;

                // الخطوة 1: فحص قاعدة البيانات المحلية DB_API (SQLite/Local) إن وجدت
                if (typeof DB_API !== 'undefined' && typeof DB_API.getAllUsers === 'function') {
                    try {
                        const localUsers = await DB_API.getAllUsers();
                        if (Array.isArray(localUsers)) {
                            const matched = localUsers.find(u => u.serial === serialString || (u.id && u.id === serialString));
                            if (matched) {
                                if (matched.name) ownerName = matched.name;
                                if (matched.phone) ownerPhone = matched.phone;
                            }
                        }
                    } catch (e) {
                        console.warn("DB_API user check:", e);
                    }
                }

                // الخطوة 2: محاولة التحقق والمزامنة السحابية عبر Firebase إذا كان هناك إنترنت
                if (typeof db !== 'undefined' && navigator.onLine) {
                    try {
                        const userDoc = await db.collection("users").doc(serialString).get();
                        if (userDoc.exists) {
                            const uData = userDoc.data();
                            if (uData.ownerName) ownerName = uData.ownerName;
                            if (uData.ownerPhone) ownerPhone = uData.ownerPhone;
                        } else {
                            // تسجيل الحساب الجديد سحابياً لضمان المزامنة المستقبلية
                            await db.collection("users").doc(serialString).set({
                                registered: true,
                                ownerName: ownerName || 'المدير العام',
                                ownerPhone: ownerPhone || '',
                                createdAt: new Date().toISOString(),
                                role: 'master'
                            }, { merge: true }).catch(() => {});
                        }

                        // تسجيل هذا الجهاز وتحديث نشاطه كجهاز رئيسي مصرح له
                        await db.collection("users").doc(serialString).collection("devices").doc(currentDeviceId).set({
                            id: currentDeviceId,
                            name: ownerName || localStorage.getItem('acc_user_name') || 'جهاز رئيسي مصرح',
                            status: 'authorized',
                            role: 'master',
                            lastSeen: new Date().toISOString(),
                            platform: navigator.platform || 'unknown'
                        }, { merge: true }).catch(() => {});
                    } catch (err) {
                        console.warn("Cloud check warning (offline fallback active):", err);
                    }
                }

                // الخطوة 3: إتمام تسجيل الدخول بشكل فوري وموثوق
                await completeLogin(serialString, { role: 'master', status: 'authorized', ownerName, ownerPhone }, isSwitching, isExplicitLogin);
            }

            window.loginWithSerial = loginWithSerial;

            async function completeLogin(serial, currentDeviceData = null, isSwitching = false, isExplicitLogin = false) {
                const prevSerial = localStorage.getItem('app_auth_serial');
                const needReset = isSwitching || (prevSerial && prevSerial !== serial);

                // تنظيف كاش الحساب القديم وتصفير جداول المحاسبة لتبدأ جلسة الحساب الجديد نظيفة ومستقلة
                if (needReset) {
                    if (window.BayanDB && typeof window.BayanDB.resetForNewAccount === 'function') {
                        try { await window.BayanDB.resetForNewAccount(); } catch (e) { }
                    }

                    const keysToRemove = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const k = localStorage.key(i);
                        if (!k) continue;
                        if (k.startsWith('acc_') && /^acc_\d{4}-\d{2}-\d{2}$/.test(k)) {
                            keysToRemove.push(k);
                        } else if (k.startsWith('acc_inv_') || k.startsWith('acc_ext_') || k.startsWith('acc_saved_pass_')) {
                            keysToRemove.push(k);
                        }
                    }
                    keysToRemove.forEach(k => localStorage.removeItem(k));
                    localStorage.removeItem('records');
                    localStorage.removeItem('acc_bayan_notifications');
                    localStorage.removeItem('acc_notifications');
                    localStorage.removeItem('acc_user_activity_logs');
                }

                localStorage.setItem('app_auth_serial', serial);
                globalUserId = serial;

                // حفظ في قائمة السيريالات المسجلة على هذا الجهاز
                try {
                    let regList = JSON.parse(localStorage.getItem('acc_registered_serials') || '[]');
                    if (!regList.includes(serial)) {
                        regList.push(serial);
                        localStorage.setItem('acc_registered_serials', JSON.stringify(regList));
                    }
                } catch (e) { }

                // تحديد وتحديث اسم المنشأة / المدير
                let ownerName = (currentDeviceData && currentDeviceData.ownerName) ? currentDeviceData.ownerName : localStorage.getItem('acc_user_name');
                if (!ownerName || needReset) {
                    ownerName = (currentDeviceData && currentDeviceData.ownerName) || 'المدير العام';
                    localStorage.setItem('acc_user_name', ownerName);
                }
                if (currentDeviceData && currentDeviceData.ownerPhone) {
                    localStorage.setItem('acc_user_phone', currentDeviceData.ownerPhone);
                }

                // إنشاء مستخدم المدير الافتراضي للسيريال الجديد فقط إن لم تكن هناك حسابات مسجلة مسبقاً (مشفر)
                let existingUsers = [];
                try { existingUsers = JSON.parse(localStorage.getItem('acc_bayan_users') || '[]'); } catch (e) { }

                if (needReset || existingUsers.length === 0) {
                    const finalAdminName = ownerName.includes('المدير') ? ownerName : `المدير العام ${ownerName}`;
                    const initialPass = (currentDeviceData && currentDeviceData.ownerPass) ? currentDeviceData.ownerPass : '123';
                    const hashedPass = (window.BayanSecurity && typeof window.BayanSecurity.hashPassword === 'function')
                        ? await window.BayanSecurity.hashPassword(initialPass)
                        : initialPass;
                    const newUsers = [{
                        id: 'admin1',
                        name: finalAdminName,
                        role: 'admin',
                        pass: hashedPass
                    }];
                    localStorage.setItem('acc_bayan_users', JSON.stringify(newUsers));
                    localStorage.setItem('acc_last_emp_id', 'admin1');
                    localStorage.setItem('acc_saved_pass_admin1', hashedPass);
                    localStorage.setItem('acc_current_user_id', 'admin1');
                    localStorage.setItem('acc_current_user_name', finalAdminName);
                    localStorage.setItem('acc_current_user_role', 'admin');
                }

                // إغلاق وإزالة نوافذ السيريال المؤقتة
                const quickModal = document.getElementById('quick-serial-modal');
                if (quickModal) quickModal.remove();

                const authOverlay = document.getElementById('auth-overlay');
                if (authOverlay) authOverlay.style.display = 'none';

                const logoutBtn = document.getElementById('header-logout-btn');
                if (logoutBtn) logoutBtn.style.display = 'inline-flex';

                // في حالة تسجيل الدخول الصريح من المستخدم أو التبديل لسيريال آخر:
                // تفعيل الدخول المباشر والانتقال إلى لوحة التحكم فوراً
                if (isExplicitLogin || needReset) {
                    const teamOverlay = document.getElementById('team-login-overlay');
                    if (teamOverlay) teamOverlay.remove();

                    const appEl = document.getElementById('app');
                    if (appEl) appEl.style.display = 'block';

                    sessionStorage.setItem('acc_auto_enter', 'true');
                    sessionStorage.setItem('acc_logged_in_session', 'true');
                    if (typeof showToast === 'function') {
                        showToast('✅ تم تسجيل الدخول بالسيريال بنجاح! جاري فتح البرنامج...', 'success');
                    }
                    setTimeout(() => {
                        window.location.reload();
                    }, 350);
                    return;
                }

                // إذا كان فحصاً روتينياً صامتاً في الخلفية عند بدء تشغيل البرنامج / ريلود المتصفح:
                console.log("👤 Device Authorized with Serial:", globalUserId);
                if (typeof updateHeaderName === 'function') updateHeaderName();

                // حماية حاسمة: منع الشاشة البيضاء عند ريلود المتصفح
                const hasActiveSession = Boolean(
                    localStorage.getItem('acc_current_user_id') &&
                    (sessionStorage.getItem('acc_logged_in_session') === 'true' || sessionStorage.getItem('acc_auto_enter') === 'true')
                );
                const appEl = document.getElementById('app');
                const teamOverlay = document.getElementById('team-login-overlay');

                if (hasActiveSession) {
                    // المستخدم في جلسة عمل مسبقة وعمل ريلود: نزيل شاشة القفل ونظهر البرنامج فوراً
                    if (teamOverlay) teamOverlay.remove();
                    if (appEl && appEl.style.display === 'none') {
                        appEl.style.display = 'block';
                        if (typeof render === 'function') requestAnimationFrame(render);
                    }
                } else {
                    // إذا لم يكن هناك جلسة نشطة، نتأكد أن شاشة تسجيل الدخول موجودة ولا نحذفها في الخلفية
                    if (!teamOverlay && appEl && appEl.style.display === 'none') {
                        if (typeof window.showTeamLogin === 'function') {
                            window.showTeamLogin();
                        }
                    }
                }

                startRealtimeSync();

                const currentDeviceId = localStorage.getItem('acc_device_id');
                if (currentDeviceId) {
                    listenToDeviceStatus(serial, currentDeviceId);
                }
                window.currentDeviceRole = (currentDeviceData && currentDeviceData.role) ? currentDeviceData.role : 'master';
                if (typeof startPendingDevicesListener === 'function') {
                    startPendingDevicesListener(serial);
                }
            }

            let deviceHasExisted = false;
            function listenToDeviceStatus(serial, devId) {
                if (window.deviceStatusUnsubscribe) window.deviceStatusUnsubscribe();
                deviceHasExisted = false;
                window.deviceStatusUnsubscribe = db.collection("users").doc(serial).collection("devices").doc(devId).onSnapshot(doc => {
                    if (doc.exists) {
                        deviceHasExisted = true;
                        const data = doc.data();

                        // تحديث الحالة (حظر/نشط)
                        if (data.status === 'blocked') {
                            if (typeof showModernAlert === 'function') {
                                showModernAlert('🔴 تم إنهاء جلستك: تم حظر هذا الجهاز من قبل المسؤول.', 'error');
                            } else {
                                alert('⚠️ تم حظر هذا الجهاز من قبل المسؤول.');
                            }
                            setTimeout(() => window.location.reload(), 3000);
                            return;
                        }

                        // تحقق من صلاحية الجهاز
                        if (data.expiryDate && new Date(data.expiryDate) < new Date()) {
                            if (typeof showModernAlert === 'function') {
                                showModernAlert('🔴 تم إنهاء جلستك: انتهت صلاحية هذا الجهاز.', 'error');
                            } else {
                                alert('⚠️ انتهت صلاحية هذا الجهاز.');
                            }
                            localStorage.removeItem('app_auth_serial');
                            localStorage.removeItem('acc_device_id');
                            localStorage.removeItem('acc_device_role');
                            setTimeout(() => window.location.reload(), 3000);
                            return;
                        }

                        // تحديث الاسم إذا قام المدير بتغييره
                        if (data.name && data.name !== localStorage.getItem('acc_current_user_name')) {
                            console.log('🔄 تم تحديث اسم الجهاز من قبل المدير إلى:', data.name);
                            localStorage.setItem('acc_current_user_name', data.name);
                            localStorage.setItem('acc_user_name', data.name);
                            if (typeof updateHeaderName === 'function') updateHeaderName();
                            if (typeof showToast === 'function') showToast(`👤 تم تغيير اسمك إلى: ${data.name}`, 'info');
                        }
                    } else if (deviceHasExisted) {
                        // The device was deleted completely by the master AFTER it existed
                        if (typeof showModernAlert === 'function') {
                            showModernAlert('🔴 تم إنهاء جلستك: تم حذف ترخيص هذا الجهاز من قبل المسؤول.', 'error');
                        } else {
                            alert('⚠️ تم حذف ترخيص هذا الجهاز من قبل المسؤول.');
                        }
                        localStorage.removeItem('app_auth_serial');
                        localStorage.removeItem('acc_device_id');
                        localStorage.removeItem('acc_device_role');
                        setTimeout(() => window.location.reload(), 3000);
                    }
                }, err => {
                    console.warn("Device status listener offline stream:", err);
                });
            }

            window.updateMaxDevicesLimit = function (val) {
                const limit = parseInt(val) || 1;
                localStorage.setItem('acc_max_devices_limit', limit);
                if (window.showToast) window.showToast(`✅ تم تحديث الحد الأقصى إلى ${limit} أجهزة`, 'success');
                fetchConnectedDevices();
            };

            window.currentDeviceSubTab = 'connected';
            window.switchDeviceSubTab = function (tab) {
                window.currentDeviceSubTab = tab;
                const tabConnected = document.getElementById('subTabConnected');
                const tabBlocked = document.getElementById('subTabBlocked');
                const tabDeleted = document.getElementById('subTabDeleted');

                if (tabConnected && tabBlocked && tabDeleted) {
                    [tabConnected, tabBlocked, tabDeleted].forEach(btn => {
                        btn.style.background = 'rgba(255,255,255,0.02)';
                        btn.style.borderColor = 'rgba(255,255,255,0.05)';
                        btn.style.color = '#94a3b8';
                    });

                    if (tab === 'connected') {
                        tabConnected.style.background = 'rgba(34, 197, 94, 0.15)';
                        tabConnected.style.borderColor = 'rgba(34, 197, 94, 0.4)';
                        tabConnected.style.color = '#4ade80';
                    } else if (tab === 'blocked') {
                        tabBlocked.style.background = 'rgba(239, 68, 68, 0.15)';
                        tabBlocked.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                        tabBlocked.style.color = '#f87171';
                    } else if (tab === 'deleted') {
                        tabDeleted.style.background = 'rgba(100, 116, 139, 0.2)';
                        tabDeleted.style.borderColor = 'rgba(100, 116, 139, 0.4)';
                        tabDeleted.style.color = '#cbd5e1';
                    }
                }

                fetchConnectedDevices();
            };
            // دوال التحكم بالأجهزة وتحديث حالتها (تفعيل / حظر / حذف)
            window.updateDeviceStatus = function (devId, newStatus) {
                if (!globalUserId || !db) return;

                const actionAr = newStatus === 'authorized' ? 'تفعيل' : 'حظر';
                if (window.showToast) window.showToast(`⏳ جاري ${actionAr} الجهاز...`, 'info');

                db.collection("users").doc(globalUserId).collection("devices").doc(devId).update({
                    status: newStatus,
                    updatedAt: new Date().toISOString()
                }).then(() => {
                    if (window.showToast) window.showToast(`✅ تم ${actionAr} الجهاز بنجاح`, 'success');
                }).catch(err => {
                    console.error("Error updating device:", err);
                    if (window.showToast) window.showToast(`❌ حدث خطأ أثناء ${actionAr} الجهاز`, 'error');
                });
            };

            window.deleteDeviceRecord = function (devId) {
                if (!globalUserId || !db) return;

                if (confirm('هل أنت متأكد من نقل هذا الجهاز إلى الأرشيف المحذوف؟')) {
                    if (window.showToast) window.showToast('⏳ جاري النقل للمحذوفات...', 'info');
                    db.collection("users").doc(globalUserId).collection("devices").doc(devId).update({
                        status: 'deleted',
                        updatedAt: new Date().toISOString()
                    }).then(() => {
                        if (window.showToast) window.showToast('🗑️ تم نقل الجهاز للمحذوفات بنجاح', 'success');
                    }).catch(err => {
                        console.error("Error soft-deleting device:", err);
                        if (window.showToast) window.showToast('❌ حدث خطأ أثناء النقل للمحذوفات', 'error');
                    });
                }
            };

            window.permanentlyDeleteDevice = function (devId) {
                if (!globalUserId || !db) return;

                if (confirm('⚠️ تنبيه: هل أنت متأكد من حذف هذا الجهاز نهائياً؟ لا يمكن استرجاعه بعد ذلك.')) {
                    if (window.showToast) window.showToast('⏳ جاري الحذف النهائي...', 'info');
                    db.collection("users").doc(globalUserId).collection("devices").doc(devId).delete().then(() => {
                        if (window.showToast) window.showToast('🗑️ تم حذف الجهاز نهائياً', 'success');
                    }).catch(err => {
                        console.error("Error permanently deleting device:", err);
                        if (window.showToast) window.showToast('❌ حدث خطأ أثناء الحذف النهائي', 'error');
                    });
                }
            };

            window.restoreDeviceRecord = function (devId) {
                if (!globalUserId || !db) return;

                if (window.showToast) window.showToast('⏳ جاري استعادة الجهاز...', 'info');
                db.collection("users").doc(globalUserId).collection("devices").doc(devId).update({
                    status: 'authorized',
                    updatedAt: new Date().toISOString()
                }).then(() => {
                    if (window.showToast) window.showToast('🟢 تم استعادة وتفعيل الجهاز بنجاح', 'success');
                }).catch(err => {
                    console.error("Error restoring device:", err);
                    if (window.showToast) window.showToast('❌ حدث خطأ أثناء استعادة الجهاز', 'error');
                });
            };

            // نافذة تعديل بيانات وصلاحيات الجهاز
            window.openEditDeviceModal = function (devId, currentName, currentUser, currentExpiry) {
                const existing = document.getElementById('edit-device-modal');
                if (existing) existing.remove();

                const users = JSON.parse(localStorage.getItem('acc_bayan_users') || '[]');
                const safeEsc = typeof escapeHtml === 'function' ? escapeHtml : (s) => String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                const employeeOptions = users.map(u => `<option value="${safeEsc(u.name)}" ${currentUser === u.name ? 'selected' : ''}>${safeEsc(u.name)} (${u.role === 'admin' ? 'مدير' : 'موظف'})</option>`).join('');

                const modal = document.createElement('div');
                modal.id = 'edit-device-modal';
                modal.className = 'modal-overlay';
                modal.style.zIndex = '100000';

                let expiryValue = '';
                if (currentExpiry) {
                    try {
                        const d = new Date(currentExpiry);
                        const tzoffset = d.getTimezoneOffset() * 60000;
                        const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
                        expiryValue = localISOTime;
                    } catch (e) { }
                }

                modal.innerHTML = `
                <div class="modal-box" style="width:90%; max-width:400px; padding:20px; background:rgba(15, 23, 42, 0.98); border: 1px solid rgba(212, 175, 55, 0.3); border-radius:16px; font-family:'El Messiri', sans-serif;">
                    <h4 style="margin-top:0; color:#fbbf24; border-bottom:1px solid rgba(212,175,55,0.2); padding-bottom:10px; display:flex; align-items:center; gap:8px;">⚙️ تعديل صلاحيات الجهاز</h4>
                    
                    <div style="display:flex; flex-direction:column; gap:12px; margin-top:15px; text-align: right;" dir="rtl">
                        <div>
                            <label style="font-size:12px; color:#94a3b8; display:block; margin-bottom:5px;">اسم الجهاز:</label>
                            <input type="text" id="editDevName" class="custom-input" value="${safeEsc(currentName || '')}" style="width:100%; box-sizing:border-box; background:rgba(0,0,0,0.3); color:#fff; border: 1px solid rgba(255,255,255,0.1); padding:8px; border-radius:8px;">
                        </div>
                        
                        <div>
                            <label style="font-size:12px; color:#94a3b8; display:block; margin-bottom:5px;">الموظف المسؤول:</label>
                            <select id="editDevUser" class="custom-input" style="width:100%; box-sizing:border-box; background:rgba(0,0,0,0.3); color:#fff; border: 1px solid rgba(255,255,255,0.1); padding:8px; border-radius:8px;">
                                <option value="" ${!currentUser ? 'selected' : ''}>غير محدد</option>
                                ${employeeOptions}
                            </select>
                        </div>
                        
                        <div>
                            <label style="font-size:12px; color:#94a3b8; display:block; margin-bottom:5px;">مدة صلاحية التشغيل:</label>
                            <select id="editDevDurationPreset" class="custom-input" onchange="window.handleDeviceDurationPresetChange(this.value)" style="width:100%; box-sizing:border-box; background:rgba(0,0,0,0.3); color:#fff; border: 1px solid rgba(255,255,255,0.1); padding:8px; border-radius:8px; margin-bottom:8px;">
                                <option value="permanent" ${!currentExpiry ? 'selected' : ''}>دائمة (مفتوحة) ♾️</option>
                                <option value="1h">ساعة واحدة 🕐</option>
                                <option value="12h">12 ساعة ⏰</option>
                                <option value="1d">يوم واحد 📅</option>
                                <option value="3d">3 أيام 🗓️</option>
                                <option value="1w">أسبوع 📆</option>
                                <option value="1m">شهر ⏳</option>
                                <option value="custom" ${currentExpiry ? 'selected' : ''}>تاريخ ووقت مخصص ⚙️</option>
                            </select>
                            
                            <div id="customExpiryContainer" style="display: ${currentExpiry ? 'block' : 'none'};">
                                <input type="datetime-local" id="editDevExpiry" class="custom-input" value="${expiryValue}" style="width:100%; box-sizing:border-box; background:rgba(0,0,0,0.3); color:#fff; border: 1px solid rgba(255,255,255,0.1); padding:8px; border-radius:8px;">
                            </div>
                        </div>
                    </div>
                    
                    <div style="display:flex; gap:10px; margin-top:20px; justify-content:flex-end;">
                        <button class="btn" onclick="document.getElementById('edit-device-modal').remove()" style="background:rgba(255,255,255,0.05); color:#ccc; padding:8px 15px; border-radius:8px; border:none; cursor:pointer;">إلغاء</button>
                        <button class="btn" onclick="window.saveDeviceEdit('${devId}')" style="background:#fbbf24; color:#000; font-weight:bold; padding:8px 20px; border-radius:8px; border:none; cursor:pointer;">حفظ التغييرات</button>
                    </div>
                </div>`;

                document.body.appendChild(modal);
            };

            window.handleDeviceDurationPresetChange = function (val) {
                const container = document.getElementById('customExpiryContainer');
                if (container) {
                    container.style.display = val === 'custom' ? 'block' : 'none';
                }
            };

            window.saveDeviceEdit = function (devId) {
                if (!globalUserId || !db) return;

                const name = document.getElementById('editDevName').value.trim();
                const user = document.getElementById('editDevUser').value;
                const preset = document.getElementById('editDevDurationPreset').value;

                let expiryDate = null;

                if (preset === 'custom') {
                    const customVal = document.getElementById('editDevExpiry').value;
                    if (customVal) {
                        expiryDate = new Date(customVal).toISOString();
                    }
                } else if (preset !== 'permanent') {
                    const now = new Date();
                    if (preset === '1h') now.setHours(now.getHours() + 1);
                    else if (preset === '12h') now.setHours(now.getHours() + 12);
                    else if (preset === '1d') now.setDate(now.getDate() + 1);
                    else if (preset === '3d') now.setDate(now.getDate() + 3);
                    else if (preset === '1w') now.setDate(now.getDate() + 7);
                    else if (preset === '1m') now.setMonth(now.getMonth() + 1);
                    expiryDate = now.toISOString();
                }

                if (window.showToast) window.showToast('⏳ جاري حفظ التعديلات...', 'info');

                const updateData = {
                    name: name || 'جهاز جديد',
                    currentUser: user || 'غير محدد',
                    expiryDate: expiryDate,
                    updatedAt: new Date().toISOString()
                };

                db.collection("users").doc(globalUserId).collection("devices").doc(devId).update(updateData).then(() => {
                    if (window.showToast) window.showToast('✅ تم تحديث الجهاز بنجاح', 'success');
                    const modal = document.getElementById('edit-device-modal');
                    if (modal) modal.remove();
                }).catch(err => {
                    console.error("Error updating device details:", err);
                    if (window.showToast) window.showToast('❌ حدث خطأ أثناء الحفظ', 'error');
                });
            };

            function fetchConnectedDevices() {
                const container = document.getElementById('connectedDevicesList');
                if (!container || !globalUserId) return;

                db.collection("users").doc(globalUserId).collection("devices").onSnapshot(snap => {
                    const countEl = document.getElementById('connected-devices-count');
                    const isMaster = window.currentDeviceRole === 'master' || localStorage.getItem('acc_device_role') === 'master';
                    const maxLimit = parseInt(localStorage.getItem('acc_max_devices_limit')) || 15;

                    const currentUserRole = typeof getCurrentUserRole === 'function' ? getCurrentUserRole() : (localStorage.getItem('acc_current_user_role') || 'staff');
                    const isTempUnlocked = typeof isTempAdminUnlocked === 'function' ? isTempAdminUnlocked() : (sessionStorage.getItem('acc_admin_temp_unlocked') === 'true');
                    const isAdmin = (currentUserRole === 'admin') || isTempUnlocked;
                    const canManage = isMaster || isAdmin;

                    if (countEl) {
                        if (isMaster) {
                            countEl.textContent = `(${snap.size} / ${maxLimit})`;
                            countEl.style.color = snap.size > maxLimit ? '#ef4444' : '#4ade80';
                        } else {
                            countEl.textContent = `(عدد الأجهزة المتصلة: ${snap.size})`;
                            countEl.style.color = '#4ade80';
                        }
                    }

                    if (snap.empty) {
                        container.innerHTML = '<div style="text-align:center; padding:20px; color:#64748b; font-size:12px;">🟢 لا يوجد أجهزة نشطة حالياً</div>';
                        return;
                    }

                    let html = '';
                    let renderedCount = 0;
                    const activeSubTab = window.currentDeviceSubTab || 'connected';

                    snap.forEach(doc => {
                        const device = doc.data();
                        const devId = device.id || doc.id;
                        const devName = device.name || device.deviceName || 'جهاز مجهول';
                        const isCurrent = devId === localStorage.getItem('acc_device_id');

                        // filtering logic for tabs
                        if (activeSubTab === 'connected' && (device.status === 'blocked' || device.status === 'deleted')) return;
                        if (activeSubTab === 'blocked' && device.status !== 'blocked') return;
                        if (activeSubTab === 'deleted' && device.status !== 'deleted') return;

                        const statusColor = device.status === 'authorized' ? '#22c55e' : (device.status === 'blocked' ? '#ef4444' : (device.status === 'deleted' ? '#94a3b8' : '#eab308'));
                        const statusAr = device.status === 'authorized' ? 'نشط' : (device.status === 'blocked' ? 'محظور' : (device.status === 'deleted' ? 'محذوف' : 'انتظار'));

                        renderedCount++;

                        let expiryText = '';
                        if (device.expiryDate) {
                            const diff = new Date(device.expiryDate) - new Date();
                            if (diff <= 0) {
                                expiryText = `<div style="font-size:10px; color:#ef4444; margin-top:2px;">⏳ انتهت فترة الصلاحية ❌</div>`;
                            } else {
                                const diffMins = Math.floor(diff / 60000);
                                if (diffMins < 60) {
                                    expiryText = `<div style="font-size:10px; color:#f59e0b; margin-top:2px;">⏳ متبقي: ${diffMins} دقيقة</div>`;
                                } else {
                                    const diffHours = Math.floor(diffMins / 60);
                                    if (diffHours < 24) {
                                        expiryText = `<div style="font-size:10px; color:#f59e0b; margin-top:2px;">⏳ متبقي: ${diffHours} ساعة</div>`;
                                    } else {
                                        const diffDays = Math.floor(diffHours / 24);
                                        expiryText = `<div style="font-size:10px; color:#f59e0b; margin-top:2px;">⏳ متبقي: ${diffDays} يوم</div>`;
                                    }
                                }
                            }
                        }

                        const safeEsc = typeof escapeHtml === 'function' ? escapeHtml : (s) => String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                        const safeDevName = safeEsc(devName);
                        const safeDevId = safeEsc(devId);
                        const safeCurrentUser = safeEsc(device.currentUser || 'غير محدد');

                        html += `
                        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); padding:12px; border-radius:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <div style="font-size:13px; font-weight:bold; color:#fff;">${safeDevName} ${isCurrent ? '<span style="color:#a78bfa; font-size:10px;">(هذا الجهاز)</span>' : ''}</div>
                                <div style="font-size:11px; color:#64748b;">ID: ${safeDevId} | ${(device.role === 'master' || device.isMaster) ? '👑 رئيسي' : '👤 فرعي'}</div>
                                <div style="font-size:11px; color:#64748b; margin-top:2px;">👤 الموظف المسئول: <span style="color:#cbd5e1;">${safeCurrentUser}</span></div>
                                ${expiryText}
                                <div style="display:inline-block; font-size:10px; color:${statusColor}; border:1px solid ${statusColor}; padding:1px 6px; border-radius:4px; margin-top:5px;">${statusAr}</div>
                            </div>
                            <div style="display:flex; gap:5px; align-items:center;">
                                ${canManage ? `
                                    ${activeSubTab === 'deleted' ? `
                                        <button class="btn" onclick="restoreDeviceRecord('${safeDevId}')" style="padding:5px 10px; background:rgba(34, 197, 94, 0.1); color:#22c55e; border:1px solid rgba(34, 197, 94, 0.2); font-size:11px; border-radius:6px; cursor:pointer;">
                                            استعادة 🟢
                                        </button>
                                        <button class="btn" onclick="permanentlyDeleteDevice('${safeDevId}')" style="padding:5px 10px; background:rgba(239, 68, 68, 0.1); color:#ef4444; border:1px solid rgba(239, 68, 68, 0.2); font-size:11px; border-radius:6px; cursor:pointer;">
                                            حذف نهائي 🗑️
                                        </button>
                                    ` : `
                                        <button class="btn" onclick="window.openEditDeviceModal('${safeDevId}', '${devName.replace(/'/g, "\\'")}', '${(device.currentUser || '').replace(/'/g, "\\'")}', '${device.expiryDate || ''}')" style="padding:5px 10px; background:rgba(245, 158, 11, 0.1); color:#f59e0b; border:1px solid rgba(245, 158, 11, 0.2); font-size:11px; border-radius:6px; cursor:pointer;">
                                            تعديل ⚙️
                                        </button>
                                        ${(device.role !== 'master' && !isCurrent) ? `
                                            <button class="btn" onclick="updateDeviceStatus('${safeDevId}', '${device.status === 'authorized' ? 'blocked' : 'authorized'}')" style="padding:5px 10px; background:${device.status === 'authorized' ? '#ef4444' : '#22c55e'}22; color:${device.status === 'authorized' ? '#ef4444' : '#22c55e'}; border:1px solid ${device.status === 'authorized' ? '#ef4444' : '#22c55e'}44; font-size:11px; border-radius:6px; cursor:pointer;">
                                                ${device.status === 'authorized' ? 'حظر' : 'تفعيل'}
                                            </button>
                                            <button class="btn" onclick="deleteDeviceRecord('${safeDevId}')" style="padding:5px 10px; background:rgba(239, 68, 68, 0.1); color:#ef4444; border:1px solid rgba(239, 68, 68, 0.2); font-size:11px; border-radius:6px; cursor:pointer;">🗑️</button>
                                        ` : ''}
                                    ` }
                                ` : ''}
                            </div>
                        </div>`;
                    });

                    if (renderedCount === 0) {
                        if (activeSubTab === 'connected') {
                            container.innerHTML = '<div style="text-align:center; padding:20px; color:#64748b; font-size:12px;">🟢 لا يوجد أجهزة نشطة حالياً</div>';
                        } else if (activeSubTab === 'blocked') {
                            container.innerHTML = '<div style="text-align:center; padding:20px; color:#64748b; font-size:12px;">🚫 لا يوجد أجهزة محظورة حالياً</div>';
                        } else {
                            container.innerHTML = '<div style="text-align:center; padding:20px; color:#64748b; font-size:12px;">🗑️ لا يوجد أجهزة محذوفة حالياً</div>';
                        }
                        return;
                    }

                    container.innerHTML = html;
                });
            }

            function startPendingDevicesListener(serial) {
                if (window.isPendingListenerActive) return;
                window.isPendingListenerActive = true;
                console.log("📡 Master Radar Active: Listening for pending devices...");

                db.collection("users").doc(serial).collection("devices").where("status", "==", "pending").onSnapshot(snap => {
                    snap.docChanges().forEach(change => {
                        if (change.type === "added") {
                            const device = change.doc.data();
                            const devId = change.doc.id;

                            console.log("🔔 New Pending Device Detected:", devId);

                            if (typeof showModernAlert === 'function') {
                                if (typeof beep === 'function') beep(600, 0.1, 0.3);

                                const maxLimit = parseInt(localStorage.getItem('acc_max_devices_limit')) || 15;
                                const limitWarning = snap.size >= maxLimit ? `\n\n⚠️ تنبيه: لقد وصلت للحد الأقصى للأجهزة (${maxLimit}). يرجى ترقية ترخيصك أو حذف جهاز قديم لتتمكن من تفعيل هذا الجهاز.` : '';

                                showModernAlert({
                                    title: '🚨 طلب انضمام جهاز جديد',
                                    body: `هناك جهاز جديد يحاول الدخول بالسيريال الخاص بك:\n\n👤 المالك/المدير: ${localStorage.getItem('acc_user_name')}\n📱 الجهاز: ${device.name || 'جهاز فرعي'}\n🆔 كود الجهاز: ${devId.substring(0, 10)}...${limitWarning}\n\nهل تسمح لهذا الجهاز بالوصول لبياناتك السحابية؟`,
                                    type: snap.size >= maxLimit ? 'warning' : 'info',
                                    confirmText: snap.size >= maxLimit ? 'تفعيل رغم التجاوز' : '✅ تفعيل وصلاحية',
                                    cancelText: '❌ حظر الوصول',
                                    onConfirm: () => {
                                        db.collection("users").doc(serial).collection("devices").doc(devId).update({ status: 'authorized' });
                                        if (window.showToast) showToast('✅ تم تفعيل الجهاز بنجاح', 'success');
                                    },
                                    onCancel: () => {
                                        db.collection("users").doc(serial).collection("devices").doc(devId).update({ status: 'blocked' });
                                        if (window.showToast) showToast('🚫 تم حظر الجهاز', 'error');
                                    }
                                });
                            }
                        }
                    });
                }, err => {
                    console.warn("Pending devices listener offline stream:", err);
                });
            }

            window.updateDeviceStatus = function (devId, newStatus) {
                if (!globalUserId) return;
                db.collection("users").doc(globalUserId).collection("devices").doc(devId).update({
                    status: newStatus
                }).then(() => {
                    if (typeof showToast === 'function') showToast(`✅ تم تحديث حالة الجهاز إلى ${newStatus === 'authorized' ? 'نشط' : 'محظور'}`, 'success');
                });
            };

            window.deleteDeviceRecord = function (devId) {
                if (!confirm('هل أنت متأكد من حذف سجل هذا الجهاز بالكامل؟')) return;
                db.collection("users").doc(globalUserId).collection("devices").doc(devId).delete().then(() => {
                    if (typeof showToast === 'function') showToast('🗑️ تم حذف الجهاز بنجاح', 'success');
                });
            };

            // الاستماع لحالة تسجيل الدخول محلياً عند فتح التطبيق
            const savedSerial = localStorage.getItem('app_auth_serial');
            if (savedSerial) {
                // إخفاء واجهة السيريال الرئيسية
                const authOverlay = document.getElementById('auth-overlay');
                if (authOverlay) authOverlay.style.display = 'none';

                const logoutBtn = document.getElementById('header-logout-btn');
                if (logoutBtn) logoutBtn.style.display = 'inline-flex';

                const hasActiveSession = Boolean(
                    localStorage.getItem('acc_current_user_id') && 
                    (sessionStorage.getItem('acc_logged_in_session') === 'true' || sessionStorage.getItem('acc_auto_enter') === 'true')
                );

                if (hasActiveSession) {
                    const appEl = document.getElementById('app');
                    if (appEl) appEl.style.display = 'block';
                    const teamOverlay = document.getElementById('team-login-overlay');
                    if (teamOverlay) teamOverlay.remove();
                } else {
                    // إظهار شاشة تسجيل الدخول عند بدء تشغيل التطبيق فقط إن لم تكن هناك جلسة نشطة
                    if (!document.getElementById('team-login-overlay')) {
                        if (typeof window.showTeamLogin === 'function') {
                            window.showTeamLogin();
                        } else {
                            setTimeout(() => { 
                                if (!document.getElementById('team-login-overlay') && typeof window.showTeamLogin === 'function') {
                                    window.showTeamLogin();
                                }
                            }, 100);
                        }
                    }
                }

                // التحقق من السيريال سحابياً في الخلفية
                loginWithSerial(savedSerial);
                setTimeout(fetchConnectedDevices, 1000);
            } else {
                // مستخدم جديد أو مسجل خروج نهائي
                const authOverlay = document.getElementById('auth-overlay');
                if (authOverlay) authOverlay.style.display = 'flex';
                globalUserId = null;
            }

            // نستمع للوثيقة الخاصة بهذا المستخدم فقط
            let _lastSyncDate = null;
            let _lastSyncTime = 0;
            let _syncDebounceTimer = null;

            function startRealtimeSync() {
                if (!globalUserId || !db) return;

                const selectedDate = document.getElementById('dateInput')?.value;
                if (!selectedDate) return;

                // حماية من التكرار اللحظي المتزامن أثناء إقلاع البرنامج
                const now = Date.now();
                if (now - _lastSyncTime < 350 && _lastSyncDate === selectedDate && unsubscribeSync) {
                    clearTimeout(_syncDebounceTimer);
                    _syncDebounceTimer = setTimeout(startRealtimeSync, 380);
                    return;
                }
                _lastSyncTime = now;
                _lastSyncDate = selectedDate;

                const docId = `data_${selectedDate}`; // Use date-specific document ID

                if (unsubscribeSync) {
                    console.log("📡 Unsubscribing from previous sync session...");
                    unsubscribeSync();
                }

                console.log(`📡 Starting Realtime Sync for date: ${selectedDate}`);

                unsubscribeSync = db.collection("users").doc(globalUserId).collection("accounting").doc(docId).onSnapshot({ includeMetadataChanges: true }, (doc) => {
                    // Logic to prevent overwriting local unsaved changes
                    if (doc.metadata.hasPendingWrites) {
                        console.log("⏳ Local mutation pending... skipping snapshot Update to avoid flicker.");
                        return;
                    }

                    if (doc.exists) {
                        const data = doc.data();
                        const currentDate = document.getElementById('dateInput').value;
                        const dateKey = 'acc_' + currentDate;

                        console.log(`📥 Server Update Received for ${currentDate} (Confirmed)`, data);

                        // A. تحديث السجلات (Records) - منطق الحماية الذكية 🛡️
                        if (data.records && data.date === currentDate) {
                            const localRecordsStr = JSON.stringify(records); // السجلات الحالية في الذاكرة
                            const cloudRecords = data.records;
                            const cloudRecordsStr = JSON.stringify(cloudRecords);

                            const localCount = records.length;
                            const cloudCount = cloudRecords.length;

                            // 1. قاعدة الحماية من المسح (Anti-Wipe)
                            // إذا كان السيرفر يرسل بيانات فارغة أو أقل من الموجود محلياً بفارق كبير، نتجاهله
                            if (cloudCount === 0 && localCount > 0) {
                                console.warn("⚠️ تحذير: السيرفر يحاول مسح البيانات! تم رفض التحديث، وسأقوم برفع النسخة المحلية بدلاً منه.");
                                if (window.saveToCloud) window.saveToCloud(); // تصحيح السيرفر
                                return;
                            }

                            // 2. إذا كان السيرفر لديه بيانات أقل، فهذا يمكن أن يكون بسبب حذف متعمد!
                            // قمنا بتعطيل جزء رفض البيانات إذا كان السيرفر أقل لنسمح بعمليات الحذف بالتزامن
                            /*
                            if (cloudCount <localCount) {
                                console.warn(`⚠️ تجاهل تحديث السيرفر: المحلي (${localCount}) أكثر من السيرفر (${cloudCount}).`);
                                if (window.saveToCloud) window.saveToCloud();
                                return;
                            }
                            */

                            // 3. التحديث الطبيعي (فقط إذا كان هناك اختلاف والسيرفر موثوق)
                            if (localRecordsStr !== cloudRecordsStr) {
                                console.log("🔄 استقبال تحديث آمن من السيرفر...");

                                // 🛑 Backup BEFORE Overwrite
                                localStorage.setItem('acc_backup_' + dateKey, localRecordsStr);

                                records = cloudRecords;
                                if (typeof window.setRecords === 'function') {
                                    window.setRecords(cloudRecords);
                                } else {
                                    window.records = cloudRecords;
                                }

                                // حفظ فوري في IndexedDB لضمان استقرار وسرعة البيانات
                                if (window.BayanDB && typeof window.BayanDB.bulkSaveTransactions === 'function') {
                                    window.BayanDB.bulkSaveTransactions(cloudRecords);
                                }

                                // فحص فوري للإشعارات والتنبيهات المستخرجة
                                if (window.BayanNotifications && typeof window.BayanNotifications.scanTransactionsList === 'function') {
                                    window.BayanNotifications.scanTransactionsList(cloudRecords, currentDate);
                                }

                                // Save records locally
                                let storageData = {};
                                try {
                                    storageData = JSON.parse(localStorage.getItem(dateKey) || '{}');
                                } catch (e) { }

                                if (Array.isArray(storageData)) {
                                    storageData = { records: records, eggBalance: '' };
                                } else {
                                    storageData.records = records;
                                }
                                localStorage.setItem(dateKey, JSON.stringify(storageData));

                                // Update UI
                                if (typeof render === 'function') render();
                                if (typeof updateSummary === 'function') updateSummary();
                                showToast('📥 تم تحديث البيانات من السيرفر ومطابقتها', 'info');
                            }
                        }

                        // B. تحديث رصيد البيض (Egg Balance & Stock)
                        if (data.date === currentDate) {
                            let storageChanged = false;

                            // 1. الرصيد الأساسي (eggBalance)
                            if (data.eggBalance !== undefined) {
                                let localData = {};
                                try { localData = JSON.parse(localStorage.getItem(dateKey) || '{}'); } catch (e) { }

                                if (localData.eggBalance !== data.eggBalance) {
                                    localData.eggBalance = data.eggBalance;
                                    localStorage.setItem(dateKey, JSON.stringify(localData));

                                    const eggBalanceEl = document.getElementById('eggBalance');
                                    if (eggBalanceEl) eggBalanceEl.value = data.eggBalance;
                                    storageChanged = true;
                                }
                            }

                            // 2. تفاصيل المخزون (eggStock)
                            if (data.eggStock) {
                                const stockKey = `acc_egg_stock_${selectedDate}`;
                                const currentStockStr = localStorage.getItem(stockKey);
                                const newStockStr = JSON.stringify(data.eggStock);

                                if (currentStockStr !== newStockStr) {
                                    localStorage.setItem(stockKey, newStockStr);
                                    if (typeof renderInventoriesHeader === 'function') renderInventoriesHeader();
                                    storageChanged = true;
                                }
                            }

                            // 2.5 تفاصيل جميع الأرصدة المخصصة (allStocks)
                            if (data.allStocks) {
                                let stocksChanged = false;
                                Object.keys(data.allStocks).forEach(invId => {
                                    const k = `acc_inv_stock_${invId}_${selectedDate}`;
                                    const localS = localStorage.getItem(k);
                                    const cloudS = JSON.stringify(data.allStocks[invId]);
                                    if (localS !== cloudS) {
                                        localStorage.setItem(k, cloudS);
                                        stocksChanged = true;
                                    }
                                });
                                if (stocksChanged) {
                                    if (typeof renderInventoriesHeader === 'function') renderInventoriesHeader();
                                    storageChanged = true;
                                }
                            }

                            // 3. مستودع "بيان" الذكي (bayanInventory)
                            if (data.bayanInventory) {
                                const currentInvStr = localStorage.getItem('acc_bayan_inventory');
                                const newInvStr = JSON.stringify(data.bayanInventory);
                                if (currentInvStr !== newInvStr) {
                                    localStorage.setItem('acc_bayan_inventory', newInvStr);
                                    // إذا كانت قائمة المخزون مفتوحة، أعد رسمها
                                    if (typeof openInventoriesSideMenu === 'function' && document.getElementById('inventories-side-menu')) {
                                        openInventoriesSideMenu();
                                    }
                                    storageChanged = true;
                                }
                            }

                            if (storageChanged && typeof updateSummary === 'function') updateSummary();
                        }

                        // C. تحديث الإعدادات وبيانات المستخدم (Settings)
                        if (data.settings) {
                            const s = data.settings;
                            if (s.userName) localStorage.setItem('acc_user_name', s.userName);
                            if (s.userPhone) localStorage.setItem('acc_user_phone', s.userPhone);
                            if (s.userNotes) localStorage.setItem('acc_user_notes', s.userNotes);
                            if (s.eggLabel) {
                                localStorage.setItem('acc_egg_label', s.eggLabel);
                                const labelEl = document.getElementById('eggBalanceLabel');
                                if (labelEl) labelEl.textContent = s.eggLabel;
                            }
                            if (s.customCategories) {
                                localStorage.setItem('acc_custom_categories', JSON.stringify(s.customCategories));
                                if (typeof updateCategorySelect === 'function') updateCategorySelect();
                            }
                            if (s.bayanUsers) {
                                localStorage.setItem('acc_bayan_users', JSON.stringify(s.bayanUsers));
                                if (typeof renderUsersList === 'function') renderUsersList();
                            }
                            if (s.extToMe !== undefined) {
                                localStorage.setItem('acc_ext_tome', s.extToMe);
                                if (window.BayanDB && typeof window.BayanDB.setSetting === 'function') {
                                    window.BayanDB.setSetting('acc_ext_tome', s.extToMe);
                                }
                            }
                            if (s.extByMe !== undefined) {
                                localStorage.setItem('acc_ext_byme', s.extByMe);
                                if (window.BayanDB && typeof window.BayanDB.setSetting === 'function') {
                                    window.BayanDB.setSetting('acc_ext_byme', s.extByMe);
                                }
                            }
                            if (s.extToMe !== undefined || s.extByMe !== undefined) {
                                if (typeof renderExternalBalances === 'function') renderExternalBalances();
                            }
                        }

                        // تحديث مؤشر الحالة
                        const statusText = document.getElementById('cloudStatusText');
                        if (statusText) {
                            statusText.innerHTML = 'متصل (بيانات جديدة) 📥';
                            statusText.style.color = 'var(--green)';
                            setTimeout(() => statusText.innerHTML = 'متصل ✅', 2000);
                        }
                    }
                }, (error) => {
                    console.error("Sync Error:", error);
                    const statusText = document.getElementById('cloudStatusText');
                    if (statusText) { statusText.innerHTML = 'خروج ⚠️'; statusText.style.color = 'var(--danger)'; }
                });
            } // إغلاق دالة startRealtimeSync()

            // 4. دالة إرسال البيانات للسحابة مع حماية Debounce لمنع الرفع المتكرر
            let cloudDebounceTimer = null;

            function executeSaveToCloud() {
                if (!db) return;

                const dateInputEl = document.getElementById('dateInput');
                const date = dateInputEl ? dateInputEl.value : (new Date()).toISOString().slice(0, 10);
                if (!date) return;

                const stockKey = `acc_egg_stock_${date}`;
                const dataKey = `acc_${date}`;

                // جلب رصيد البيض الحالي من الواجهة أو التخزين المحلي
                let currentEggBalance = '';
                try {
                    const localData = JSON.parse(localStorage.getItem(dataKey) || '{}');
                    currentEggBalance = localData.eggBalance || (document.getElementById('eggBalance') ? document.getElementById('eggBalance').value : '');
                } catch (e) {
                    currentEggBalance = document.getElementById('eggBalance') ? document.getElementById('eggBalance').value : '';
                }

                // تجميع كل البيانات بدقة 100%
                let allStocks = {};
                if (typeof inventoriesConfig !== 'undefined') {
                    inventoriesConfig.forEach(inv => {
                        const k = `acc_inv_stock_${inv.id}_${date}`;
                        allStocks[inv.id] = JSON.parse(localStorage.getItem(k) || '{"u1":"0","u2":"0"}');
                    });
                }

                const currentRecords = Array.isArray(window.records) ? window.records : (typeof records !== 'undefined' ? records : []);

                const payload = {
                    date: date,
                    records: currentRecords, // العمليات الحالية
                    eggBalance: currentEggBalance, // الرصيد الأساسي
                    eggStock: JSON.parse(localStorage.getItem(stockKey) || '{"plates":"0","pieces":"0"}'),
                    allStocks: allStocks, // الكميات المخصصة لجميع الأرصدة
                    bayanInventory: JSON.parse(localStorage.getItem('acc_bayan_inventory') || '[]'),
                    settings: {
                        userName: localStorage.getItem('acc_user_name') || '',
                        userPhone: localStorage.getItem('acc_user_phone') || '',
                        userNotes: localStorage.getItem('acc_user_notes') || '',
                        eggLabel: localStorage.getItem('acc_egg_label') || '🥚 رصيد البيض',
                        customCategories: JSON.parse(localStorage.getItem('acc_custom_categories') || '[]'),
                        inventoriesConfig: typeof inventoriesConfig !== 'undefined' ? inventoriesConfig : [],
                        bayanUsers: JSON.parse(localStorage.getItem('acc_bayan_users') || '[]'),
                        extToMe: parseFloat(localStorage.getItem('acc_ext_tome')) || 0,
                        extByMe: parseFloat(localStorage.getItem('acc_ext_byme')) || 0
                    },
                    lastUpdated: new Date().toISOString(),
                    lastDevice: typeof detectDeviceType === 'function' ? detectDeviceType() : 'Unknown'
                };

                // استخدام merge: true لمنع مسح الحقول الأخرى
                // ملاحظة: مع merge:true، إذا أردنا استبدال المصفوفات (records) بالكامل، فالأمر يعمل بشكل طبيعي في Firestore حيث تستبدل المصفوفة
                if (!globalUserId) {
                    console.log("Local Mode: no global user id. Skipped saving to cloud.");
                    return;
                }

                const docId = `data_${date}`; // Use date-specific document ID

                db.collection("users").doc(globalUserId).collection("accounting").doc(docId).set(payload, { merge: true })
                    .then(() => {
                        console.log("☁️ All data sent to cloud (Merged)");
                        const statusText = document.getElementById('cloudStatusText');
                        if (statusText) { statusText.innerHTML = 'تم الحفظ سحابياً ✅'; statusText.style.color = 'var(--green)'; }

                        // Add visible feedback for the user
                        if (typeof showToast === 'function') {
                            // showToast('☁️ تم المزامنة السحابية بنجاح', 'success');
                        }
                    })
                    .catch((err) => {
                        console.error("❌ Send Failed:", err);
                    });
            }

            window.saveToCloud = function () {
                if (cloudDebounceTimer) clearTimeout(cloudDebounceTimer);
                cloudDebounceTimer = setTimeout(executeSaveToCloud, 250);
            };

            // 5. ربط وظائف الحفظ المحلية بالمزامنة السحابية

            // Hook: Save Records
            if (!window.originalSaveToStorage) {
                window.originalSaveToStorage = window.saveToStorage;
                window.saveToStorage = function () {
                    // Call original
                    if (typeof window.originalSaveToStorage === 'function') window.originalSaveToStorage();
                    // Then Sync
                    if (window.saveToCloud) window.saveToCloud();
                };
            }

            // Hook: Egg Balance Modal Save
            // نعيد تعريف الدالة لتشمل المزامنة
            /* window.saveEggBalanceFromModal replaced */

            // Hook: Settings Save (User Profile)
            window.originalSaveUserProfile = window.saveUserProfileFromSettings;
            window.saveUserProfileFromSettings = function () {
                // We need to implement the logic here since we can't easily wrap the internal logic of the original if it reads DOM elements we closed
                // Actually, saveUserProfileFromSettings reads from DOM.
                // Best to re-implement for safety to ensure sync happens AFTER storage set.

                const name = document.getElementById('settingsName').value;
                const phone = document.getElementById('settingsPhone').value;
                const prefixEl = document.getElementById('settingsAppPrefix');
                const prefix = prefixEl ? prefixEl.value.trim() : '';
                const addressEl = document.getElementById('settingsAddress');
                const address = addressEl ? addressEl.value.trim() : '';
                const notes = document.getElementById('settingsNotes').value;

                if (phone && phone.trim().length !== 11) {
                    showModernAlert('رقم الهاتف يجب أن يتكون من 11 رقم بالضبط لضمان المزامنة والطباعة السليمة', 'warning');
                    return;
                }

                localStorage.setItem('acc_user_name', name);
                localStorage.setItem('acc_user_phone', phone);
                if (prefix) localStorage.setItem('acc_app_name_prefix', prefix);
                if (address) localStorage.setItem('acc_user_address', address);
                localStorage.setItem('acc_user_notes', notes);

                // تحديث اسم المدير في قائمة فريق العمل أيضاً
                let users = JSON.parse(localStorage.getItem('acc_bayan_users') || '[]');
                const admin = users.find(u => String(u.id) === 'admin1');
                if (admin) {
                    admin.name = name.includes('المدير') ? name : `المدير العام ${name}`;
                    localStorage.setItem('acc_bayan_users', JSON.stringify(users));
                }

                if (typeof updateHeaderName === 'function') updateHeaderName();

                showToast('✅ تم حفظ البيانات ومزامنتها', 'success');
                beep(1000, 0.04, 0.06);

                // Sync
                if (window.saveToCloud) window.saveToCloud();
            }

        } catch (e) {
            console.error("Factory Error:", e);
        }