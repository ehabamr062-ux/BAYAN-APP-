const { app, BrowserWindow, ipcMain, dialog, Menu, MenuItem, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Memory & background timer optimizations
app.commandLine.appendSwitch('disable-background-timer-throttling');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1366,
        height: 768,
        minWidth: 1024,
        minHeight: 600,
        title: "برنامج بيان POS المحاسبي",
        icon: path.join(__dirname, 'icon.ico'),
        autoHideMenuBar: true,
        backgroundColor: '#0a0f1d',
        show: false, // Prevents white flicker on startup
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload-electron.js'),
            backgroundThrottling: false,
            devTools: true,
            spellcheck: false
        }
    });

    const indexPath = path.join(__dirname, 'index.html');
    mainWindow.loadFile(indexPath);

    // Show window smoothly once ready-to-show
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // إظهار النافذة احتياطياً في حال تأخر حدث ready-to-show لضمان عدم بقاء الشاشة معلقة
    setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
            mainWindow.show();
        }
    }, 1000);

    // إعادة المحاولة في حال فشل التحميل الأولي
    mainWindow.webContents.on('did-fail-load', (event, errorCode) => {
        if (errorCode !== -3 && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.loadFile(indexPath);
        }
    });

    // تأمين الروابط الخارجية: منع فتح أي نوافذ داخلية للتطبيقات الخارجية وفتحها في المتصفح الافتراضي للويندوز
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('mailto:')) {
            shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    // فتح أي روابط خارجية في المتصفح الافتراضي والسماح بالتنقلات الداخلية المحلية
    mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
        if (navigationUrl.startsWith('http://') || navigationUrl.startsWith('https://')) {
            event.preventDefault();
            shell.openExternal(navigationUrl);
        }
    });

    // تفعيل قائمة الزر الأيمن للماوس (النسخ، القص، اللصق، التحديد)
    mainWindow.webContents.on('context-menu', (event, params) => {
        const menu = new Menu();

        if (params.isEditable) {
            menu.append(new MenuItem({ label: '✂️ قص', role: 'cut' }));
            menu.append(new MenuItem({ label: '📋 نسخ', role: 'copy' }));
            menu.append(new MenuItem({ label: '📥 لصق', role: 'paste' }));
            menu.append(new MenuItem({ type: 'separator' }));
            menu.append(new MenuItem({ label: '🔲 تحديد الكل', role: 'selectAll' }));
        } else if (params.selectionText && params.selectionText.trim().length > 0) {
            menu.append(new MenuItem({ label: '📋 نسخ', role: 'copy' }));
            menu.append(new MenuItem({ type: 'separator' }));
            menu.append(new MenuItem({ label: '🔲 تحديد الكل', role: 'selectAll' }));
        } else {
            menu.append(new MenuItem({ label: '📥 لصق', role: 'paste' }));
            menu.append(new MenuItem({ label: '🔲 تحديد الكل', role: 'selectAll' }));
            menu.append(new MenuItem({ type: 'separator' }));
            menu.append(new MenuItem({ label: '🔄 إعادة تحميل الشاشة', role: 'reload' }));
        }

        menu.popup({ window: mainWindow });
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Native File Save IPC for Export & Backup
ipcMain.handle('save-backup-native', async (event, { defaultName, content }) => {
    try {
        const backupDir = path.join(app.getPath('home'), 'bayan_backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const safeName = path.basename(defaultName || 'backup.json');
        const filePath = path.join(backupDir, safeName);
        fs.writeFileSync(filePath, content, 'utf8');

        return { success: true, path: filePath };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// Native Open Directory IPC
ipcMain.handle('open-backup-folder', async () => {
    const backupDir = path.join(app.getPath('home'), 'bayan_backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    const { shell } = require('electron');
    shell.openPath(backupDir);
    return true;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
