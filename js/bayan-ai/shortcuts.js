// ============================================================
//  bayan-ai/shortcuts.js - Global Keyboard Shortcuts
// ============================================================

window.BayanAIShortcuts = {
    init() {
        window.addEventListener('keydown', (e) => {
            // F6: فتح وإغلاق مساعد بيان
            if (e.key === 'F6' && !e.ctrlKey) {
                e.preventDefault();
                window.toggleBayanAiChat();
            }

            // Ctrl + F6: تركيز الكورسر في صندوق الكتابة
            if (e.key === 'F6' && e.ctrlKey) {
                e.preventDefault();
                const win = document.getElementById('bayan-ai-chat');
                if (!win || win.style.display === 'none') window.toggleBayanAiChat();
                document.getElementById('ai-chat-input')?.focus();
            }

            // Esc: إغلاق النافذة
            if (e.key === 'Escape') {
                const win = document.getElementById('bayan-ai-chat');
                if (win && win.style.display !== 'none') window.toggleBayanAiChat();
            }

            // Ctrl + L: محادثة جديدة (تصفير النافذة)
            if (e.ctrlKey && (e.key === 'l' || e.key === 'L' || e.key === 'م')) {
                const win = document.getElementById('bayan-ai-chat');
                if (win && win.style.display !== 'none') {
                    e.preventDefault();
                    if (window.clearAiHistory) window.clearAiHistory();
                }
            }
        });
    }
};

window.BayanAIShortcuts.init();
