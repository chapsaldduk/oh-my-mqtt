import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  mqtt: {
    connect: (connectionId: string, profile: unknown) =>
      ipcRenderer.send("mqtt:connect", connectionId, profile),
    disconnect: (connectionId: string) =>
      ipcRenderer.send("mqtt:disconnect", connectionId),
    publish: (
      connectionId: string,
      topic: string,
      payload: string,
      options?: { qos?: 0 | 1 | 2; retain?: boolean },
    ) => ipcRenderer.send("mqtt:publish", connectionId, topic, payload, options),
    subscribe: (connectionId: string, topic: string, qos: 0 | 1 | 2) =>
      ipcRenderer.send("mqtt:subscribe", connectionId, topic, qos),
    unsubscribe: (connectionId: string, topic: string) =>
      ipcRenderer.send("mqtt:unsubscribe", connectionId, topic),

    onConnect: (callback: (connectionId: string) => void) => {
      const handler = (_: Electron.IpcRendererEvent, connectionId: string) =>
        callback(connectionId);
      ipcRenderer.on("mqtt:on-connect", handler);
      return () => {
        ipcRenderer.removeListener("mqtt:on-connect", handler);
      };
    },
    onDisconnect: (callback: (connectionId: string) => void) => {
      const handler = (_: Electron.IpcRendererEvent, connectionId: string) =>
        callback(connectionId);
      ipcRenderer.on("mqtt:on-disconnect", handler);
      return () => {
        ipcRenderer.removeListener("mqtt:on-disconnect", handler);
      };
    },
    onError: (callback: (connectionId: string, message: string) => void) => {
      const handler = (
        _: Electron.IpcRendererEvent,
        connectionId: string,
        message: string,
      ) => callback(connectionId, message);
      ipcRenderer.on("mqtt:on-error", handler);
      return () => {
        ipcRenderer.removeListener("mqtt:on-error", handler);
      };
    },
    onReconnecting: (
      callback: (connectionId: string, attempt: number, delay: number) => void,
    ) => {
      const handler = (
        _: Electron.IpcRendererEvent,
        connectionId: string,
        attempt: number,
        delay: number,
      ) => callback(connectionId, attempt, delay);
      ipcRenderer.on("mqtt:on-reconnecting", handler);
      return () => {
        ipcRenderer.removeListener("mqtt:on-reconnecting", handler);
      };
    },
    onMessage: (
      callback: (
        connectionId: string,
        topic: string,
        payload: Uint8Array,
        meta: { qos: number; retain: boolean },
      ) => void,
    ) => {
      const handler = (
        _: Electron.IpcRendererEvent,
        connectionId: string,
        topic: string,
        payload: Uint8Array,
        meta: { qos: number; retain: boolean },
      ) => callback(connectionId, topic, payload, meta);
      ipcRenderer.on("mqtt:on-message", handler);
      return () => {
        ipcRenderer.removeListener("mqtt:on-message", handler);
      };
    },
  },
  file: {
    save: (
      content: string,
      defaultName: string,
      filters: Array<{ name: string; extensions: string[] }>,
    ) => ipcRenderer.invoke("file:save", content, defaultName, filters),
    open: (filters?: Array<{ name: string; extensions: string[] }>) =>
      ipcRenderer.invoke("file:open", filters),
  },
  updater: {
    check: () => ipcRenderer.send("updater:check"),
    download: () => ipcRenderer.send("updater:download"),
    install: () => ipcRenderer.send("updater:install"),
    onUpdateAvailable: (
      callback: (info: { version: string; releaseDate: string }) => void,
    ) => {
      const handler = (
        _: Electron.IpcRendererEvent,
        info: { version: string; releaseDate: string },
      ) => callback(info);
      ipcRenderer.on("updater:update-available", handler);
      return () => {
        ipcRenderer.removeListener("updater:update-available", handler);
      };
    },
    onUpdateNotAvailable: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on("updater:update-not-available", handler);
      return () => {
        ipcRenderer.removeListener("updater:update-not-available", handler);
      };
    },
    onDownloadProgress: (
      callback: (progress: {
        percent: number;
        transferred: number;
        total: number;
      }) => void,
    ) => {
      const handler = (
        _: Electron.IpcRendererEvent,
        progress: { percent: number; transferred: number; total: number },
      ) => callback(progress);
      ipcRenderer.on("updater:download-progress", handler);
      return () => {
        ipcRenderer.removeListener("updater:download-progress", handler);
      };
    },
    onUpdateDownloaded: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on("updater:update-downloaded", handler);
      return () => {
        ipcRenderer.removeListener("updater:update-downloaded", handler);
      };
    },
    onError: (callback: (message: string) => void) => {
      const handler = (_: Electron.IpcRendererEvent, message: string) =>
        callback(message);
      ipcRenderer.on("updater:error", handler);
      return () => {
        ipcRenderer.removeListener("updater:error", handler);
      };
    },
  },
});
