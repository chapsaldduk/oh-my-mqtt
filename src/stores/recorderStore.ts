import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db.ts';
import type { RecordingSession, RecordedMessage } from '@/types/recorder.ts';
import type { MqttMessage } from '@/types/mqtt.ts';
import { messagesToJson, messagesToCsv, downloadFile } from '@/lib/export.ts';
import { useMessageStore } from './messageStore.ts';
import { useUIStore } from './uiStore.ts';

interface RecorderState {
  isRecording: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  currentSession: RecordingSession | null;
  sessions: RecordingSession[];
  playbackSpeed: number;
  playbackPosition: number;
  playbackDuration: number;

  startRecording: (name: string, topicFilter?: string) => void;
  stopRecording: () => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  startPlayback: (sessionId: string) => Promise<void>;
  stopPlayback: () => void;
  pausePlayback: () => void;
  resumePlayback: () => void;
  seekPlayback: (positionMs: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  exportSession: (sessionId: string, format: 'json' | 'csv') => Promise<void>;
  loadSessions: () => Promise<void>;
  captureMessage: (connectionId: string, msg: MqttMessage) => void;
}

let playbackTimers: ReturnType<typeof setTimeout>[] = [];
let playbackMessages: RecordedMessage[] = [];
let pausedAt = 0;

export const useRecorderStore = create<RecorderState>((set, get) => ({
  isRecording: false,
  isPlaying: false,
  isPaused: false,
  currentSession: null,
  sessions: [],
  playbackSpeed: 1,
  playbackPosition: 0,
  playbackDuration: 0,

  startRecording: (name, topicFilter) => {
    const activeTabId = useUIStore.getState().activeTabId ?? '';
    const session: RecordingSession = {
      id: nanoid(),
      name,
      connectionId: activeTabId,
      startedAt: Date.now(),
      messageCount: 0,
      totalSize: 0,
      topicFilter,
    };
    set({ isRecording: true, currentSession: session });
  },

  stopRecording: async () => {
    const session = get().currentSession;
    if (!session) return;

    const completed = { ...session, endedAt: Date.now() };
    await db.recordings.add(completed);

    set((state) => ({
      isRecording: false,
      currentSession: null,
      sessions: [...state.sessions, completed],
    }));
  },

  deleteSession: async (id) => {
    await db.recordings.delete(id);
    await db.recordedMessages.where('sessionId').equals(id).delete();
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
    }));
  },

  startPlayback: async (sessionId) => {
    const messages = await db.recordedMessages
      .where('sessionId')
      .equals(sessionId)
      .sortBy('offsetMs');

    if (messages.length === 0) return;

    get().stopPlayback();

    playbackMessages = messages;
    const duration = messages[messages.length - 1].offsetMs;

    set({ isPlaying: true, isPaused: false, playbackPosition: 0, playbackDuration: duration });

    const speed = get().playbackSpeed;
    const activeTabId = useUIStore.getState().activeTabId;
    if (!activeTabId) return;

    const addMessage = useMessageStore.getState().addMessage;
    useMessageStore.getState().clearMessages();

    for (const msg of messages) {
      const delay = msg.offsetMs / speed;
      const timer = setTimeout(() => {
        addMessage(activeTabId, {
          id: nanoid(),
          topic: msg.topic,
          payload: msg.payload,
          qos: msg.qos,
          retain: msg.retain,
          timestamp: Date.now(),
          size: msg.payload.byteLength,
        });
        set({ playbackPosition: msg.offsetMs });
      }, delay);
      playbackTimers.push(timer);
    }

    const stopTimer = setTimeout(() => {
      set({ isPlaying: false, isPaused: false });
      playbackTimers = [];
    }, duration / speed + 100);
    playbackTimers.push(stopTimer);
  },

  stopPlayback: () => {
    for (const t of playbackTimers) clearTimeout(t);
    playbackTimers = [];
    playbackMessages = [];
    pausedAt = 0;
    set({ isPlaying: false, isPaused: false, playbackPosition: 0 });
  },

  pausePlayback: () => {
    if (!get().isPlaying || get().isPaused) return;
    for (const t of playbackTimers) clearTimeout(t);
    playbackTimers = [];
    pausedAt = get().playbackPosition;
    set({ isPaused: true });
  },

  resumePlayback: () => {
    if (!get().isPaused) return;

    const speed = get().playbackSpeed;
    const activeTabId = useUIStore.getState().activeTabId;
    if (!activeTabId) return;

    const addMessage = useMessageStore.getState().addMessage;
    const remaining = playbackMessages.filter((m) => m.offsetMs > pausedAt);

    set({ isPaused: false });

    for (const msg of remaining) {
      const delay = (msg.offsetMs - pausedAt) / speed;
      const timer = setTimeout(() => {
        addMessage(activeTabId, {
          id: nanoid(),
          topic: msg.topic,
          payload: msg.payload,
          qos: msg.qos,
          retain: msg.retain,
          timestamp: Date.now(),
          size: msg.payload.byteLength,
        });
        set({ playbackPosition: msg.offsetMs });
      }, delay);
      playbackTimers.push(timer);
    }

    const duration = get().playbackDuration;
    const stopTimer = setTimeout(() => {
      set({ isPlaying: false, isPaused: false });
      playbackTimers = [];
    }, (duration - pausedAt) / speed + 100);
    playbackTimers.push(stopTimer);
  },

  seekPlayback: (positionMs) => {
    const wasPaused = get().isPaused;

    for (const t of playbackTimers) clearTimeout(t);
    playbackTimers = [];

    set({ playbackPosition: positionMs });
    pausedAt = positionMs;

    if (!wasPaused && get().isPlaying) {
      get().resumePlayback();
    }
  },

  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  exportSession: async (sessionId, format) => {
    const messages = await db.recordedMessages
      .where('sessionId')
      .equals(sessionId)
      .sortBy('timestamp');

    const mqttMessages: MqttMessage[] = messages.map((m) => ({
      id: m.id,
      topic: m.topic,
      payload: m.payload,
      qos: m.qos,
      retain: m.retain,
      timestamp: m.timestamp,
      size: m.payload.byteLength,
    }));

    const session = get().sessions.find((s) => s.id === sessionId);
    const name = session?.name ?? 'recording';

    if (format === 'json') {
      downloadFile(messagesToJson(mqttMessages), `${name}.json`, 'application/json');
    } else {
      downloadFile(messagesToCsv(mqttMessages), `${name}.csv`, 'text/csv');
    }
  },

  loadSessions: async () => {
    const sessions = await db.recordings.toArray();
    set({ sessions });
  },

  captureMessage: async (connectionId, msg) => {
    const state = get();
    if (!state.isRecording || !state.currentSession) return;
    if (state.currentSession.connectionId !== connectionId) return;

    const session = state.currentSession;

    if (session.topicFilter) {
      const filterRegex = session.topicFilter
        .replace(/\+/g, '[^/]+')
        .replace(/#/g, '.*');
      if (!new RegExp(`^${filterRegex}$`).test(msg.topic)) return;
    }

    const recorded: RecordedMessage = {
      id: nanoid(),
      sessionId: session.id,
      topic: msg.topic,
      payload: msg.payload,
      qos: msg.qos,
      retain: msg.retain,
      timestamp: msg.timestamp,
      offsetMs: msg.timestamp - session.startedAt,
    };

    await db.recordedMessages.add(recorded);

    set({
      currentSession: {
        ...session,
        messageCount: session.messageCount + 1,
        totalSize: session.totalSize + msg.size,
      },
    });
  },
}));
