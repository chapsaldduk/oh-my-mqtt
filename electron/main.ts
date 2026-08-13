import { app, BrowserWindow, Menu, powerMonitor, shell } from "electron";
import { join } from "path";
import { registerMqttHandlers, type MqttHandlers } from "./mqtt-bridge";
import { registerFileHandlers } from "./file-service";
import { setupUpdater, setUpdaterWindow } from "./updater";

let mainWindow: BrowserWindow | null = null;
let mqttHandlers: MqttHandlers | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, "../preload/preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 12, y: 12 },
  });

  if (process.env.NODE_ENV === "development") {
    const devServerUrl =
      process.env.VITE_DEV_SERVER_URL ?? "http://localhost:5173";
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
    // On macOS the app outlives its window. Without this the MQTT bridges keep
    // reconnecting against a destroyed BrowserWindow and crash the main process
    // the moment the network comes back.
    mqttHandlers?.disconnectAll();
  });
}

function setupMenu() {
  const isMac = process.platform === "darwin";

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac
          ? [{ type: "separator" as const }, { role: "front" as const }]
          : [{ role: "close" as const }]),
      ],
    },
    {
      role: "help",
      submenu: [
        {
          label: "GitHub Repository",
          click: () => {
            shell.openExternal("https://github.com/chapsaldduk/oh-my-mqtt");
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// A background reconnect throwing must not take the whole app down with a
// native crash dialog.
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception in main process:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection in main process:", reason);
});

app.whenReady().then(() => {
  mqttHandlers = registerMqttHandlers();
  registerFileHandlers();
  setupMenu();
  createWindow();

  if (mainWindow) {
    setupUpdater(mainWindow);
  }

  // Sleeping the machine kills every socket. Park the backoff timers instead of
  // letting them fire into a network stack that is still down.
  powerMonitor.on("suspend", () => mqttHandlers?.suspendAll());
  powerMonitor.on("resume", () => mqttHandlers?.resumeAll());

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      if (mainWindow) setUpdaterWindow(mainWindow);
    }
  });
});

app.on("before-quit", () => {
  mqttHandlers?.disconnectAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
