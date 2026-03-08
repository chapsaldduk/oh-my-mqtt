interface ElectronMqttAPI {
  connect: (connectionId: string, profile: import("./mqtt").ConnectionProfile) => void;
  disconnect: (connectionId: string) => void;
  publish: (
    connectionId: string,
    topic: string,
    payload: string,
    options?: { qos?: 0 | 1 | 2; retain?: boolean },
  ) => void;
  subscribe: (connectionId: string, topic: string, qos: 0 | 1 | 2) => void;
  unsubscribe: (connectionId: string, topic: string) => void;
  onConnect: (callback: (connectionId: string) => void) => () => void;
  onDisconnect: (callback: (connectionId: string) => void) => () => void;
  onError: (callback: (connectionId: string, message: string) => void) => () => void;
  onReconnecting: (
    callback: (connectionId: string, attempt: number, delay: number) => void,
  ) => () => void;
  onMessage: (
    callback: (
      connectionId: string,
      topic: string,
      payload: Uint8Array,
      meta: { qos: number; retain: boolean },
    ) => void,
  ) => () => void;
}

interface ElectronFileAPI {
  save: (
    content: string,
    defaultName: string,
    filters: Array<{ name: string; extensions: string[] }>,
  ) => Promise<boolean>;
  open: (
    filters?: Array<{ name: string; extensions: string[] }>,
  ) => Promise<{ filePath: string; content: string } | null>;
}

interface ElectronUpdaterAPI {
  check: () => void;
  download: () => void;
  install: () => void;
  onUpdateAvailable: (
    callback: (info: { version: string; releaseDate: string }) => void,
  ) => () => void;
  onUpdateNotAvailable: (callback: () => void) => () => void;
  onDownloadProgress: (
    callback: (progress: {
      percent: number;
      transferred: number;
      total: number;
    }) => void,
  ) => () => void;
  onUpdateDownloaded: (callback: () => void) => () => void;
  onError: (callback: (message: string) => void) => () => void;
}

interface ElectronAPI {
  mqtt: ElectronMqttAPI;
  file: ElectronFileAPI;
  updater: ElectronUpdaterAPI;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
