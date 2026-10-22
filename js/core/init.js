// ============================================================
//  System Initialization Script
// ============================================================

window.addEventListener('load', () => {
    console.log('🚀 تطبيق بيان المحاسبي جاهز ومُحمل بنجاح (مع محرك IndexedDB المحاسبي أوفلاين)');

    const serial = localStorage.getItem('app_auth_serial');
    if (serial) {
        // التحقق من وجود جلسة عمل نشطة ومفتوحة مسبقاً (عند عمل ريلود للمتصفح وأثناء العمل)
        const currentUserId = localStorage.getItem('acc_current_user_id');
        const hasActiveSession = Boolean(
            currentUserId && 
            (sessionStorage.getItem('acc_logged_in_session') === 'true' || sessionStorage.getItem('acc_auto_enter') === 'true')
        );

        if (hasActiveSession) {
            sessionStorage.setItem('acc_logged_in_session', 'true');
            const appEl = document.getElementById('app');
            if (appEl) appEl.style.display = 'block';
            const teamOverlay = document.getElementById('team-login-overlay');
            if (teamOverlay) teamOverlay.remove();
            if (typeof updateHeaderName === 'function') updateHeaderName();
            if (typeof render === 'function') requestAnimationFrame(render);
            return;
        }

        // إظهار شاشة تسجيل الدخول عند بدء تشغيل البرنامج لأول مرة
        const showLogin = () => {
            if (!document.getElementById('team-login-overlay') && typeof window.showTeamLogin === 'function') {
                window.showTeamLogin();
            }
        };

        showLogin();
        // فحص احتياطي سريع في حال تأخر جاهزية بعض عناصر الصفحة
        setTimeout(showLogin, 100);
        setTimeout(showLogin, 300);
    }
});