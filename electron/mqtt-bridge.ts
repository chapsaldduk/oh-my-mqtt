import mqtt, { type MqttClient, type IClientOptions } from "mqtt";
import { ipcMain, BrowserWindow } from "electron";
import { readFileSync } from "fs";

interface ConnectionProfile {
  host: string;
  port: number;
  protocol: "ws" | "wss" | "mqtt" | "mqtts";
  path: string;
  clientId: string;
  username?: string;
  password?: string;
  keepalive: number;
  clean: boolean;
  mqttVersion: 3 | 4 | 5;
  subscriptions: Array<{ topic: string; qos: 0 | 1 | 2 }>;
  caFile?: string;
  certFile?: string;
  keyFile?: string;
}

class MqttBridge {
  private client: MqttClient | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private autoReconnect = true;
  private currentProfile: ConnectionProfile | null = null;
  private currentWindow: BrowserWindow | null = null;

  private readonly RECONNECT_BASE_DELAY = 1000;
  private readonly RECONNECT_MAX_DELAY = 30000;

  constructor(private readonly connectionId: string) {}

  connect(profile: ConnectionProfile, window: BrowserWindow) {
    this.disconnect();
    this.currentProfile = profile;
    this.currentWindow = window;
    this.autoReconnect = true;

    const url = this.buildUrl(profile);

    const options: IClientOptions = {
      clientId: profile.clientId,
      keepalive: profile.keepalive,
      clean: profile.clean,
      protocolVersion: profile.mqttVersion,
      reconnectPeriod: 0,
    };

    if (profile.username) options.username = profile.username;
    if (profile.password) options.password = profile.password;

    if (
      (profile.protocol === "mqtts" || profile.protocol === "wss") &&
      (profile.caFile || profile.certFile || profile.keyFile)
    ) {
      try {
        if (profile.caFile) options.ca = readFileSync(profile.caFile);
        if (profile.certFile) options.cert = readFileSync(profile.certFile);
        if (profile.keyFile) options.key = readFileSync(profile.keyFile);
      } catch (err) {
        console.error("Failed to read certificate files:", err);
      }
    }

    this.client = mqtt.connect(url, options);

    this.client.on("connect", () => {
      this.reconnectAttempt = 0;
      window.webContents.send("mqtt:on-connect", this.connectionId);
      for (const sub of profile.subscriptions) {
        this.client?.subscribe(sub.topic, { qos: sub.qos });
      }
    });

    this.client.on("message", (topic, payload, packet) => {
      if (window.isDestroyed()) return;
      window.webContents.send(
        "mqtt:on-message",
        this.connectionId,
        topic,
        new Uint8Array(payload),
        { qos: packet.qos, retain: packet.retain },
      );
    });

    this.client.on("close", () => {
      if (!window.isDestroyed()) {
        window.webContents.send("mqtt:on-disconnect", this.connectionId);
      }
      if (this.autoReconnect) this.scheduleReconnect();
    });

    this.client.on("error", (err) => {
      if (!window.isDestroyed()) {
        window.webContents.send(
          "mqtt:on-error",
          this.connectionId,
          err.message,
        );
      }
    });
  }

  disconnect() {
    this.autoReconnect = false;
    this.clearReconnect();
    this.currentProfile = null;
    this.currentWindow = null;
    if (this.client) {
      this.client.removeAllListeners();
      this.client.end(true);
      this.client = null;
    }
  }

  publish(
    topic: string,
    payload: string,
    options?: { qos?: 0 | 1 | 2; retain?: boolean },
  ) {
    this.client?.publish(topic, payload, {
      qos: options?.qos ?? 0,
      retain: options?.retain ?? false,
    });
  }

  subscribe(topic: string, qos: 0 | 1 | 2) {
    this.client?.subscribe(topic, { qos });
  }

  unsubscribe(topic: string) {
    this.client?.unsubscribe(topic);
  }

  private buildUrl(profile: ConnectionProfile): string {
    switch (profile.protocol) {
      case "mqtt":
        return `mqtt://${profile.host}:${profile.port}`;
      case "mqtts":
        return `mqtts://${profile.host}:${profile.port}`;
      case "ws":
        return `ws://${profile.host}:${profile.port}${profile.path}`;
      case "wss":
        return `wss://${profile.host}:${profile.port}${profile.path}`;
    }
  }

  private scheduleReconnect() {
    if (!this.autoReconnect || !this.currentProfile || !this.currentWindow)
      return;

    this.reconnectAttempt++;
    const delay = Math.min(
      this.RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempt - 1),
      this.RECONNECT_MAX_DELAY,
    );

    if (!this.currentWindow.isDestroyed()) {
      this.currentWindow.webContents.send(
        "mqtt:on-reconnecting",
        this.connectionId,
        this.reconnectAttempt,
        delay,
      );
    }

    this.reconnectTimer = setTimeout(() => {
      if (!this.autoReconnect || !this.currentProfile || !this.currentWindow)
        return;
      this.connect(this.currentProfile, this.currentWindow);
    }, delay);
  }

  private clearReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempt = 0;
  }
}

export function registerMqttHandlers() {
  const bridges = new Map<string, MqttBridge>();

  ipcMain.on(
    "mqtt:connect",
    (event, connectionId: string, profile: ConnectionProfile) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) return;

      bridges.get(connectionId)?.disconnect();

      const bridge = new MqttBridge(connectionId);
      bridges.set(connectionId, bridge);
      bridge.connect(profile, window);
    },
  );

  ipcMain.on("mqtt:disconnect", (_, connectionId: string) => {
    bridges.get(connectionId)?.disconnect();
    bridges.delete(connectionId);
  });

  ipcMain.on(
    "mqtt:publish",
    (_, connectionId: string, topic: string, payload: string, options) =>
      bridges.get(connectionId)?.publish(topic, payload, options),
  );

  ipcMain.on(
    "mqtt:subscribe",
    (_, connectionId: string, topic: string, qos: 0 | 1 | 2) =>
      bridges.get(connectionId)?.subscribe(topic, qos),
  );

  ipcMain.on("mqtt:unsubscribe", (_, connectionId: string, topic: string) =>
    bridges.get(connectionId)?.unsubscribe(topic),
  );
}
