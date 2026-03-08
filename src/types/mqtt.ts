export interface ConnectionProfile {
  id: string;
  name: string;
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
  subscriptions: Subscription[];
  // TLS/SSL certificates (for mqtts and wss)
  caFile?: string; // Server CA certificate file path
  certFile?: string; // Client certificate file path
  keyFile?: string; // Client private key file path
  createdAt: number;
  updatedAt: number;
}

export interface Subscription {
  topic: string;
  qos: 0 | 1 | 2;
  color?: string;
}

export interface MqttMessage {
  id: string;
  topic: string;
  payload: Uint8Array;
  qos: 0 | 1 | 2;
  retain: boolean;
  timestamp: number;
  size: number;
}

export type PayloadFormat = "json" | "text";

export interface TopicNode {
  name: string;
  fullTopic: string;
  children: Map<string, TopicNode>;
  messageCount: number;
  lastMessage: MqttMessage | null;
  lastUpdated: number;
}

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";
