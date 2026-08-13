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

export class MqttBridge {
  private client: MqttClient | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private autoReconnect = true;
  private suspended = false;
  private currentProfile: ConnectionProfile | null = null;
  private currentWindow: BrowserWindow | null = null;

  private readonly RECONNECT_BASE_DELAY = 1000;
  private readonly RECONNECT_MAX_DELAY = 30000;
  private readonly RESUME_DELAY = 500;

  constructor(private readonly connectionId: string) {}

  connect(profile: ConnectionProfile, window: BrowserWindow) {
    // Drop the old socket but keep `reconnectAttempt`: a reconnect goes through
    // here, and resetting the counter would pin the backoff at its first step.
    this.teardownClient();

    // A window destroyed while this bridge was reconnecting must not be
    // revived: bail out instead of holding a dead reference.
    if (window.isDestroyed()) {
      this.disconnect();
      return;
    }

    this.currentProfile = profile;
    this.currentWindow = window;
    this.autoReconnect = true;
    this.suspended = false;

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

    const client = mqtt.connect(url, options);
    this.client = client;

    client.on("connect", () => {
      if (this.client !== client) return;
      this.reconnectAttempt = 0;
      if (this.isWindowGone()) {
        this.disconnect();
        return;
      }
      this.send("mqtt:on-connect", this.connectionId);
      for (const sub of profile.subscriptions) {
        client.subscribe(sub.topic, { qos: sub.qos });
      }
    });

    client.on("message", (topic, payload, packet) => {
      if (this.client !== client) return;
      if (this.isWindowGone()) {
        this.disconnect();
        return;
      }
      this.send(
        "mqtt:on-message",
        this.connectionId,
        topic,
        new Uint8Array(payload),
        { qos: packet.qos, retain: packet.retain },
      );
    });

    client.on("close", () => {
      if (this.client !== client) return;
      if (this.isWindowGone()) {
        this.disconnect();
        return;
      }
      this.send("mqtt:on-disconnect", this.connectionId);
      if (this.autoReconnect) this.scheduleReconnect();
    });

    client.on("error", (err) => {
      if (this.client !== client) return;
      if (this.isWindowGone()) {
        this.disconnect();
        return;
      }
      this.send("mqtt:on-error", this.connectionId, err.message);
    });
  }

  disconnect() {
    this.autoReconnect = false;
    this.suspended = false;
    this.reconnectAttempt = 0;
    this.teardownClient();
    this.currentProfile = null;
    this.currentWindow = null;
  }

  private teardownClient() {
    this.clearTimer();
    if (this.client) {
      const client = this.client;
      this.client = null;
      client.removeAllListeners();
      try {
        client.end(true);
      } catch (err) {
        console.error("Failed to end MQTT client:", err);
      }
    }
  }

  /**
   * Machine is going to sleep: stop the backoff timer so it cannot fire against
   * a network stack that is still coming back up.
   */
  suspend() {
    if (!this.currentProfile) return;
    this.suspended = true;
    this.clearReconnect();
  }

  /** Machine woke up: the old socket is dead even if mqtt.js hasn't noticed. */
  resume() {
    if (!this.suspended) return;
    this.suspended = false;
    if (!this.autoReconnect || !this.currentProfile) return;
    if (this.isWindowGone()) {
      this.disconnect();
      return;
    }
    this.reconnectAttempt = 0;
    this.restartAfter(this.RESUME_DELAY);
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

  private isWindowGone(): boolean {
    const window = this.currentWindow;
    return !window || window.isDestroyed();
  }

  private send(channel: string, ...args: unknown[]) {
    const window = this.currentWindow;
    if (!window || window.isDestroyed()) return;
    try {
      const { webContents } = window;
      if (webContents.isDestroyed()) return;
      webContents.send(channel, ...args);
    } catch (err) {
      console.error(`Failed to send ${channel} to renderer:`, err);
    }
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
    if (this.suspended || !this.autoReconnect || !this.currentProfile) return;
    if (this.isWindowGone()) {
      this.disconnect();
      return;
    }

    this.reconnectAttempt++;
    const delay = Math.min(
      this.RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempt - 1),
      this.RECONNECT_MAX_DELAY,
    );

    this.send(
      "mqtt:on-reconnecting",
      this.connectionId,
      this.reconnectAttempt,
      delay,
    );

    this.restartAfter(delay);
  }

  private restartAfter(delay: number) {
    this.clearTimer();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.suspended || !this.autoReconnect) return;
      const profile = this.currentProfile;
      const window = this.currentWindow;
      if (!profile || !window) return;
      if (window.isDestroyed()) {
        this.disconnect();
        return;
      }
      this.connect(profile, window);
    }, delay);
  }

  private clearTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearReconnect() {
    this.clearTimer();
    this.reconnectAttempt = 0;
  }
}

export interface MqttHandlers {
  /** Tear down every bridge (window closed, app quitting). */
  disconnectAll(): void;
  suspendAll(): void;
  resumeAll(): void;
}

export function registerMqttHandlers(): MqttHandlers {
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

  return {
    disconnectAll() {
      for (const bridge of bridges.values()) bridge.disconnect();
      bridges.clear();
    },
    suspendAll() {
      for (const bridge of bridges.values()) bridge.suspend();
    },
    resumeAll() {
      for (const bridge of bridges.values()) bridge.resume();
    },
  };
}
