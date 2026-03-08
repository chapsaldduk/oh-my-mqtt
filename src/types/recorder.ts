export interface RecordingSession {
  id: string;
  name: string;
  connectionId: string;
  startedAt: number;
  endedAt?: number;
  messageCount: number;
  totalSize: number;
  topicFilter?: string;
}

export interface RecordedMessage {
  id: string;
  sessionId: string;
  topic: string;
  payload: Uint8Array;
  qos: 0 | 1 | 2;
  retain: boolean;
  timestamp: number;
  offsetMs: number;
}
