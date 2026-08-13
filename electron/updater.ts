import { autoUpdater, type UpdateInfo } from "electron-updater";
import { BrowserWindow, ipcMain } from "electron";

const UPDATE_CHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

let mainWindow: BrowserWindow | null = null;

function sendToRenderer(channel: string, ...args: unknown[]) {
  // Reading `.webContents` off a destroyed window throws, and the periodic
  // check keeps firing long after the window is gone.
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    const { webContents } = mainWindow;
    if (webContents.isDestroyed()) return;
    webContents.send(channel, ...args);
  } catch (err) {
    console.error(`Failed to send ${channel} to renderer:`, err);
  }
}

/** Re-point the updater at a window recreated after the first one was closed. */
export function setUpdaterWindow(win: BrowserWindow) {
  mainWindow = win;
}

export function setupUpdater(win: BrowserWindow) {
  mainWindow = win;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on("update-available", (info: UpdateInfo) => {
    sendToRenderer("updater:update-available", {
      version: info.version,
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on("update-not-available", () => {
    sendToRenderer("updater:update-not-available");
  });

  autoUpdater.on("download-progress", (progress) => {
    sendToRenderer("updater:download-progress", {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on("update-downloaded", () => {
    sendToRenderer("updater:update-downloaded");
  });

  autoUpdater.on("error", (error: Error) => {
    sendToRenderer("updater:error", error.message);
  });

  // IPC handlers
  ipcMain.on("updater:check", () => {
    autoUpdater.checkForUpdates().catch(() => {});
  });

  ipcMain.on("updater:download", () => {
    autoUpdater.downloadUpdate().catch(() => {});
  });

  ipcMain.on("updater:install", () => {
    autoUpdater.quitAndInstall();
  });

  // Initial check after 5 seconds
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 5000);

  // Periodic check
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, UPDATE_CHECK_INTERVAL);
}
