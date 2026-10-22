// ============================================================
//  bayan-ai/history.js - UI Rendering & History Storage
// ============================================================

window.loadAiChatHistory = async function () {
    const container = document.getElementById('ai-chat-messages');
    if (!container) return;
    
    if (container.dataset.loaded === 'true') return;

    try {
        const history = await window.BayanDB.getAiChatHistory(100);
        if (history && history.length > 0) {
            history.forEach(item => {
                window.appendAiMessage(item.text, item.sender, false);
            });
            container.dataset.loaded = 'true';
        }
    } catch(e) {
        console.warn('Error loading AI history:', e);
    }
};

window.appendAiMessage = function (text, sender, saveToDB = true) {
    const container = document.getElementById('ai-chat-messages');
    if (!container) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `ai-message ${sender}`;
    
    let formatted = '';
    const safeEsc = typeof escapeHtml === 'function' ? escapeHtml : (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    if (sender === 'user') {
        formatted = safeEsc(text).replace(/\n/g, '<br>');
    } else if (sender === 'system' || (typeof text === 'string' && text.startsWith('<div'))) {
        formatted = text;
    } else {
        formatted = safeEsc(text)
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/(═{5,}|-{5,})/g, '<hr style="border:none; border-top:1px dashed rgba(255,255,255,0.15); margin:8px 0;">');
    }
    
    if (sender === 'bot') {
        // إضافة زر نسخ لرسائل الذكاء الاصطناعي
        const uniqueId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        msgDiv.innerHTML = `
            <div id="${uniqueId}">${formatted}</div>
            <div style="display: flex; justify-content: flex-end; margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 6px;">
                <button onclick="window.copyAiMessageText('${uniqueId}', this)" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #cbd5e1; border-radius: 8px; padding: 4px 10px; font-size: 11px; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: all 0.2s;" title="نسخ النص">
                    📋 نسخ النص
                </button>
            </div>
        `;
    } else {
        msgDiv.innerHTML = formatted;
    }

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;

    if (saveToDB && sender !== 'system' && !text.includes('جاري الاستعلام')) {
        window.BayanDB.saveAiMessage(text, sender);
    }

    return msgDiv;
};

// دالة نسخ النص المحفوظ
window.copyAiMessageText = function (elementId, btn) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const rawText = el.innerText || el.textContent;

    navigator.clipboard.writeText(rawText).then(() => {
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '✅ تم نسخ النص!';
        btn.style.color = '#4ade80';
        btn.style.borderColor = '#4ade80';

        if (typeof window.showToast === 'function') {
            window.showToast('📋 تم نسخ نص الإجابة إلى الحافظة بنجاح!', 'success');
        }

        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.color = '#cbd5e1';
            btn.style.borderColor = 'rgba(255,255,255,0.15)';
        }, 2000);
    }).catch(err => {
        console.warn('Copy failed:', err);
    });
};

window.clearAiHistory = async function () {
    if (confirm('هل تريد مسح سجل المحادثات السابقة؟')) {
        await window.BayanDB.clearAiChatHistory();
        const container = document.getElementById('ai-chat-messages');
        if (container) {
            container.innerHTML = `
                <div class="ai-message system">
                    أهلاً بك في مساعد بيان الذكي 🤖! اضغط على أي سؤال جاهز في القائمة الجانبية أو اكتب سؤالك مباشرة.
                </div>
            `;
            delete container.dataset.loaded;
        }
    }
};

window.BayanAIHistory = {
    async getHistory() {
        return await window.BayanDB.getAiChatHistory(100);
    },

    async saveMessage(text, sender) {
        await window.BayanDB.saveAiMessage(text, sender);
    },

    async clear() {
        await window.BayanDB.clearAiChatHistory();
    }
};
