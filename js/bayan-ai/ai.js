// ============================================================
//  bayan-ai/ai.js - Main Entry Point & Orchestrator for Bayan AI v1
// ============================================================

window.BayanAI = {
    isLoaded: false,

    // التحميل الديناميكي الحثيث عند الفتح الأول فقط (Lazy Loader)
    async init() {
        if (this.isLoaded) return;

        console.log('⚡ جاري فتح مساعد بيان الذكي وتجهيز الاستعلامات أوفلاين...');
        this.isLoaded = true;
    },

    async processQuery(userQuery) {
        if (!userQuery) return "يرجى كتابة سؤال أو استفسار.";

        try {
            // 1. التوجيه (Router)
            const route = window.BayanAIRouter.route(userQuery);

            if (route.type === 'command') {
                return await window.BayanAICommands.execute(userQuery);
            }

            if (route.type === 'compare') {
                return await window.BayanAICompare.compare(userQuery);
            }

            // 2. تحليل النية والاستعلام المباشر من قاعدة البيانات المحلية IndexedDB
            const parsed = window.BayanAIIntents.parse(userQuery);
            const metrics = await window.BayanAIAnalyzer.analyze(parsed);

            // 3. صياغة الرد
            return window.BayanAIResponses.format(metrics);
        } catch(err) {
            console.error('Error processing AI query:', err);
            return "⚠️ حدث خطأ أثناء الاستعلام، يرجى المحاولة مرة أخرى.";
        }
    }
};

window.toggleBayanAiChat = async function () {
    const win = document.getElementById('bayan-ai-chat');
    if (!win) return;

    if (win.style.display === 'none') {
        win.style.display = 'flex';
        
        // تحميل الملفات والمستلزمات فورياً عند الفتح لأول مرة (Lazy Loading)
        await window.BayanAI.init();
        await window.loadAiChatHistory();

        setTimeout(() => document.getElementById('ai-chat-input')?.focus(), 100);
    } else {
        win.style.display = 'none';
    }
};

// دالة تصغير وتكبير النافذة (Maximize / Minimize)
window.toggleAiWindowSize = function () {
    const win = document.getElementById('bayan-ai-chat');
    const text = document.getElementById('ai-resize-text');
    const btn = document.getElementById('ai-resize-btn');
    if (!win) return;

    win.classList.toggle('minimized');
    const isMin = win.classList.contains('minimized');

    if (isMin) {
        if (text) text.textContent = 'تكبير النافذة';
        if (btn) btn.innerHTML = '<i class="fa-solid fa-expand"></i> <span>تكبير الشاشة</span>';
        if (typeof window.showToast === 'function') window.showToast('🔍 تم تصغير النافذة (يمكنك تصفح البرنامج والذكاء معاً)', 'info');
    } else {
        if (text) text.textContent = 'تصغير النافذة';
        if (btn) btn.innerHTML = '<i class="fa-solid fa-compress"></i> <span>تصغير النافذة</span>';
    }
};

// دالة تبديل المظهر (الوضع الفاتح / الداكن) للذكاء الاصطناعي
window.toggleAiThemeMode = function () {
    const win = document.getElementById('bayan-ai-chat');
    const btn = document.getElementById('ai-theme-btn');
    const text = document.getElementById('ai-theme-text');
    if (!win) return;

    win.classList.toggle('light-mode');
    const isLight = win.classList.contains('light-mode');

    if (isLight) {
        if (btn) btn.innerHTML = '<i class="fa-solid fa-moon" style="color: #cbd5e1;"></i> <span>الوضع الداكن</span>';
        if (typeof window.showToast === 'function') window.showToast('☀️ تم تفعيل الوضع الفاتح لمساعد بيان', 'success');
    } else {
        if (btn) btn.innerHTML = '<i class="fa-solid fa-sun" style="color: #fbbf24;"></i> <span>الوضع الفاتح</span>';
        if (typeof window.showToast === 'function') window.showToast('🌙 تم تفعيل الوضع الداكن لمساعد بيان', 'info');
    }
};

// دالة التمرير السريع للأعلى والأسفل (Scroll Top / Bottom)
window.toggleAiChatScroll = function () {
    const container = document.getElementById('ai-chat-messages');
    const icon = document.getElementById('ai-scroll-nav-icon');
    if (!container || !icon) return;

    const isAtBottom = Math.abs(container.scrollHeight - container.clientHeight - container.scrollTop) < 50;

    if (isAtBottom) {
        // إذا كنا بالأسفل ⬅️ الصعود لأول محادثة بالأعلى
        container.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        // إذا كنا بالأعلى أو المنتصف ⬅️ الهبوط لآخر محادثة بالأسفل
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
};

window.handleAiChatScroll = function (container) {
    const icon = document.getElementById('ai-scroll-nav-icon');
    const btn = document.getElementById('ai-scroll-nav-btn');
    if (!container || !icon || !btn) return;

    const isAtTop = container.scrollTop < 80;

    if (isAtTop) {
        icon.className = 'fa-solid fa-arrow-down';
        btn.title = 'الانتقال لأسفل المحادثة';
    } else {
        icon.className = 'fa-solid fa-arrow-up';
        btn.title = 'الانتقال لأول المحادثة بالأعلى';
    }
};

// دالة الإملاء والتحويل الصوتي الذكي (Voice Dictation Web Speech API)
window.toggleAiVoiceDictation = function () {
    const input = document.getElementById('ai-chat-input');
    const micBtn = document.getElementById('ai-mic-btn');
    if (!input || !micBtn) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        if (typeof window.showToast === 'function') window.showToast('⚠️ المتصفح لا يدعم التعرف الصوتي المباشر', 'warning');
        return;
    }

    if (window.aiSpeechRec && window.aiSpeechRec.isListening) {
        window.aiSpeechRec.stop();
        window.aiSpeechRec.isListening = false;
        micBtn.style.background = 'rgba(239, 68, 68, 0.15)';
        micBtn.innerHTML = '🎤';
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    micBtn.style.background = '#ef4444';
    micBtn.innerHTML = '🔴 جاري الاستماع...';
    if (typeof window.showToast === 'function') window.showToast('🎙️ تتحدث الآن... أملِ سؤالك أو عمليتك المحاسبية', 'info');

    recognition.onresult = function (event) {
        const transcript = event.results[0][0].transcript;
        input.value = transcript;
        micBtn.style.background = 'rgba(239, 68, 68, 0.15)';
        micBtn.innerHTML = '🎤';
        window.aiSpeechRec.isListening = false;
        
        // إرسال آلي بعد الإملاء الصوتي الناجح
        setTimeout(() => window.sendBayanAiMessage(), 300);
    };

    recognition.onerror = function (event) {
        console.warn('Speech recognition error:', event.error);
        micBtn.style.background = 'rgba(239, 68, 68, 0.15)';
        micBtn.innerHTML = '🎤';
        window.aiSpeechRec.isListening = false;
    };

    recognition.onend = function () {
        micBtn.style.background = 'rgba(239, 68, 68, 0.15)';
        micBtn.innerHTML = '🎤';
        window.aiSpeechRec.isListening = false;
    };

    recognition.start();
    window.aiSpeechRec = recognition;
    window.aiSpeechRec.isListening = true;
};

// دالة تصدير كشف محادثة الذكاء الاصطناعي إلى ملف نصي
window.exportAiConversationReport = async function () {
    try {
        const history = await window.BayanDB.getAiChatHistory(500);
        if (!history || history.length === 0) {
            if (typeof window.showToast === 'function') window.showToast('⚠️ لا يوجد محادثات لتصديرها حالياً', 'warning');
            return;
        }

        let reportContent = `====================================================\n`;
        reportContent += `       تقرير محادثة مساعد بيان الذكي (Bayan AI Report)      \n`;
        reportContent += `       تاريخ التصدير: ${new Date().toLocaleString('ar-EG')}   \n`;
        reportContent += `====================================================\n\n`;

        history.forEach((msg, index) => {
            const senderName = msg.sender === 'user' ? '👤 المستخدم' : '🤖 مساعد بيان الذكي';
            const cleanText = msg.text.replace(/<br>/g, '\n').replace(/<[^>]*>/g, '');
            reportContent += `[#${index + 1}] ${senderName}:\n${cleanText}\n\n----------------------------------------------------\n`;
        });

        const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `تقرير_مساعد_بيان_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (typeof window.showToast === 'function') window.showToast('📥 تم تصدير تقرير المحادثة بنجاح!', 'success');
    } catch(err) {
        console.error('Error exporting AI report:', err);
    }
};

window.sendBayanAiMessage = async function () {
    const input = document.getElementById('ai-chat-input');
    if (!input) return;
    const query = input.value.trim();
    if (!query) return;

    window.appendAiMessage(query, 'user', true);
    input.value = '';

    const typingDiv = window.appendAiMessage('<i class="fa-solid fa-microchip fa-spin" style="color: #a855f7; margin-left: 6px;"></i> جاري الاستعلام من قاعدة البيانات...', 'system', false);

    // استجابة فورية فائقة السرعة بدون تأخير
    const responseText = await window.BayanAI.processQuery(query);
    if (typingDiv) typingDiv.remove();
    window.appendAiMessage(responseText, 'bot', true);

        // إضافة اقتراحات ذكية "هل تريد؟"
        const route = window.BayanAIRouter.route(query);
        if (route.type === 'intent') {
            const parsed = window.BayanAIIntents.parse(query);
            const sugs = window.BayanAISuggestions.getSuggestions(parsed.category);
            if (sugs && sugs.length > 0) {
                let sugHTML = `<div style="margin-top:8px; font-size:12px; color:#94a3b8;">💡 اقتراحات سريعة:</div><div style="display:flex; gap:6px; margin-top:6px; flex-wrap:wrap;">`;
                sugs.forEach(s => {
                    sugHTML += `<button onclick="window.sendBayanAiMessageText('${s.label}')" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); color:#fff; border-radius:8px; padding:4px 10px; font-size:11px; cursor:pointer;">${s.label}</button>`;
                });
                sugHTML += `</div>`;
                window.appendAiMessage(sugHTML, 'bot', false);
            }
        }
};

window.sendBayanAiMessageText = function (text) {
    const input = document.getElementById('ai-chat-input');
    if (input) {
        input.value = text;
        window.sendBayanAiMessage();
    }
};
