import mqtt, { type MqttClient, type IClientOptions } from "mqtt";
import type { ConnectionProfile, Subscription } from "@/types/mqtt.ts";
import {
  RECONNECT_BASE_DELAY,
  RECONNECT_MAX_DELAY,
} from "@/constants/defaults.ts";

export type MqttEventHandler = {
  onConnect: () => void;
  onDisconnect: () => void;
  onError: (error: Error) => void;
  onReconnecting: (attempt: number, delay: number) => void;
  onMessage: (
    topic: string,
    payload: Uint8Array,
    packet: { qos: number; retain: boolean },
  ) => void;
};

const isElectron = (): boolean =>
  typeof window !== "undefined" && window.electronAPI !== undefined;

// --- IPC Mode (Electron) ---

const ipcHandlers = new Map<string, MqttEventHandler>();
let ipcListenersRegistered = false;

function ensureIpcListeners() {
  if (ipcListenersRegistered) return;
  ipcListenersRegistered = true;

  const api = window.electronAPI!.mqtt;

  api.onConnect((connectionId) => {
    ipcHandlers.get(connectionId)?.onConnect();
  });

  api.onDisconnect((connectionId) => {
    ipcHandlers.get(connectionId)?.onDisconnect();
  });

  api.onError((connectionId, message) => {
    ipcHandlers.get(connectionId)?.onError(new Error(message));
  });

  api.onReconnecting((connectionId, attempt, delay) => {
    ipcHandlers.get(connectionId)?.onReconnecting(attempt, delay);
  });

  api.onMessage((connectionId, topic, payload, meta) => {
    ipcHandlers.get(connectionId)?.onMessage(topic, payload, meta);
  });
}

function connectViaIpc(
  connectionId: string,
  profile: ConnectionProfile,
  handlers: MqttEventHandler,
) {
  ensureIpcListeners();
  ipcHandlers.set(connectionId, handlers);
  window.electronAPI!.mqtt.connect(connectionId, profile);
}

function disconnectViaIpc(connectionId: string) {
  ipcHandlers.delete(connectionId);
  window.electronAPI?.mqtt.disconnect(connectionId);
}

// --- Direct Mode (Browser / WebSocket) ---

interface DirectConnection {
  client: MqttClient;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  reconnectAttempt: number;
  autoReconnect: boolean;
  profile: ConnectionProfile;
  handlers: MqttEventHandler;
}

const directConnections = new Map<string, DirectConnection>();

function scheduleReconnect(connectionId: string) {
  const conn = directConnections.get(connectionId);
  if (!conn || !conn.autoReconnect) return;

  conn.reconnectAttempt++;
  const delay = Math.min(
    RECONNECT_BASE_DELAY * Math.pow(2, conn.reconnectAttempt - 1),
    RECONNECT_MAX_DELAY,
  );

  conn.handlers.onReconnecting(conn.reconnectAttempt, delay);

  conn.reconnectTimer = setTimeout(() => {
    const current = directConnections.get(connectionId);
    if (!current || !current.autoReconnect) return;
    connectDirect(connectionId, current.profile, current.handlers);
  }, delay);
}

function clearReconnect(connectionId: string) {
  const conn = directConnections.get(connectionId);
  if (!conn) return;
  if (conn.reconnectTimer) {
    clearTimeout(conn.reconnectTimer);
    conn.reconnectTimer = null;
  }
  conn.reconnectAttempt = 0;
}

function buildUrl(profile: ConnectionProfile): string {
  const useProxy =
    !isElectron() &&
    (profile.protocol === "mqtt" || profile.protocol === "mqtts");

  if (useProxy) {
    const proxyHost = window.location.host;
    const scheme = window.location.protocol === "https:" ? "wss" : "ws";
    const tls = profile.protocol === "mqtts" ? "&tls=true" : "";
    return `${scheme}://${proxyHost}/mqtt-proxy?host=${encodeURIComponent(profile.host)}&port=${profile.port}${tls}`;
  }

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

function connectDirect(
  connectionId: string,
  profile: ConnectionProfile,
  handlers: MqttEventHandler,
): MqttClient {
  // Clean up existing connection for this id
  const existing = directConnections.get(connectionId);
  if (existing) {
    existing.autoReconnect = false;
    clearReconnect(connectionId);
    existing.client.removeAllListeners();
    existing.client.end(true);
  }

  const url = buildUrl(profile);

  const options: IClientOptions = {
    clientId: profile.clientId,
    keepalive: profile.keepalive,
    clean: profile.clean,
    protocolVersion: profile.mqttVersion,
    reconnectPeriod: 0,
  };

  if (profile.username) options.username = profile.username;
  if (profile.password) options.password = profile.password;

  const client = mqtt.connect(url, options);

  const conn: DirectConnection = {
    client,
    reconnectTimer: null,
    reconnectAttempt: 0,
    autoReconnect: true,
    profile,
    handlers,
  };
  directConnections.set(connectionId, conn);

  client.on("connect", () => {
    conn.reconnectAttempt = 0;
    handlers.onConnect();
    for (const sub of profile.subscriptions) {
      client.subscribe(sub.topic, { qos: sub.qos });
    }
  });

  client.on("close", () => {
    handlers.onDisconnect();
    if (conn.autoReconnect) {
      scheduleReconnect(connectionId);
    }
  });

  client.on("error", (err) => {
    handlers.onError(err);
  });

  client.on("message", (topic, payload, packet) => {
    handlers.onMessage(topic, new Uint8Array(payload), {
      qos: packet.qos,
      retain: packet.retain,
    });
  });

  return client;
}

function disconnectDirect(connectionId: string) {
  const conn = directConnections.get(connectionId);
  if (!conn) return;

  conn.autoReconnect = false;
  clearReconnect(connectionId);
  conn.client.removeAllListeners();
  conn.client.end(true);
  directConnections.delete(connectionId);
}

// --- Public API (connectionId-based, environment-aware) ---

export function connectMqtt(
  connectionId: string,
  profile: ConnectionProfile,
  handlers: MqttEventHandler,
): MqttClient | null {
  if (isElectron()) {
    connectViaIpc(connectionId, profile, handlers);
    return null;
  }
  return connectDirect(connectionId, profile, handlers);
}

export function disconnectMqtt(connectionId: string): void {
  if (isElectron()) {
    disconnectViaIpc(connectionId);
  } else {
    disconnectDirect(connectionId);
  }
}

export function subscribeTopic(connectionId: string, sub: Subscription): void {
  if (isElectron()) {
    window.electronAPI!.mqtt.subscribe(connectionId, sub.topic, sub.qos);
  } else {
    directConnections
      .get(connectionId)
      ?.client.subscribe(sub.topic, { qos: sub.qos });
  }
}

export function unsubscribeTopic(connectionId: string, topic: string): void {
  if (isElectron()) {
    window.electronAPI!.mqtt.unsubscribe(connectionId, topic);
  } else {
    directConnections.get(connectionId)?.client.unsubscribe(topic);
  }
}

export function publishMessage(
  connectionId: string,
  topic: string,
  payload: string | Buffer,
  options: { qos?: 0 | 1 | 2; retain?: boolean } = {},
): void {
  if (isElectron()) {
    window.electronAPI!.mqtt.publish(
      connectionId,
      topic,
      typeof payload === "string" ? payload : payload.toString(),
      options,
    );
  } else {
    directConnections.get(connectionId)?.client.publish(topic, payload, {
      qos: options.qos ?? 0,
      retain: options.retain ?? false,
    });
  }
}

export function disconnectAll(): void {
  if (isElectron()) {
    for (const connectionId of ipcHandlers.keys()) {
      disconnectViaIpc(connectionId);
    }
  } else {
    for (const connectionId of directConnections.keys()) {
      disconnectDirect(connectionId);
    }
  }
}
