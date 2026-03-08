import { create } from "zustand";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { db } from "@/lib/db.ts";
import { connectMqtt, disconnectMqtt } from "@/lib/mqtt-client.ts";
import type {
  ConnectionProfile,
  ConnectionStatus,
  Subscription,
} from "@/types/mqtt.ts";
import {
  DEFAULT_KEEPALIVE,
} from "@/constants/defaults.ts";
import { useMessageStore } from "./messageStore.ts";
import { useRecorderStore } from "./recorderStore.ts";
import { useUIStore } from "./uiStore.ts";

interface TabConnectionState {
  status: ConnectionStatus;
  error: string | null;
  reconnectAttempt: number;
}

interface ConnectionState {
  profiles: ConnectionProfile[];
  connections: Map<string, TabConnectionState>;

  connect: (profileId: string) => void;
  disconnect: (profileId: string) => void;
  addProfile: (
    profile: Omit<ConnectionProfile, "id" | "createdAt" | "updatedAt">,
  ) => Promise<string>;
  updateProfile: (
    id: string,
    updates: Partial<ConnectionProfile>,
  ) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  loadProfiles: () => Promise<void>;
  createDefaultProfile: () => ConnectionProfile;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  profiles: [],
  connections: new Map(),

  connect: (profileId: string) => {
    const { connections } = get();
    const existing = connections.get(profileId);

    // If already connected/connecting, just switch tab view
    if (
      existing &&
      (existing.status === "connected" || existing.status === "connecting")
    ) {
      useUIStore.getState().setActiveTab(profileId);
      return;
    }

    const profile = get().profiles.find((p) => p.id === profileId);
    if (!profile) return;

    // Open tab & init message state
    const { openTab } = useUIStore.getState();
    openTab(profileId);
    useMessageStore.getState().initTab(profileId);

    // Set connection state
    set((state) => {
      const newConns = new Map(state.connections);
      newConns.set(profileId, {
        status: "connecting",
        error: null,
        reconnectAttempt: 0,
      });
      return { connections: newConns };
    });

    connectMqtt(profileId, profile, {
      onConnect: () => {
        set((state) => {
          const newConns = new Map(state.connections);
          newConns.set(profileId, {
            status: "connected",
            error: null,
            reconnectAttempt: 0,
          });
          return { connections: newConns };
        });
        toast.success(`Connected to ${profile.name || profile.host}`);
      },
      onDisconnect: () => {
        const conn = get().connections.get(profileId);
        if (conn && conn.status !== "reconnecting") {
          set((state) => {
            const newConns = new Map(state.connections);
            newConns.set(profileId, {
              ...conn,
              status: "disconnected",
            });
            return { connections: newConns };
          });
        }
      },
      onError: (error) => {
        set((state) => {
          const newConns = new Map(state.connections);
          const conn = state.connections.get(profileId);
          newConns.set(profileId, {
            status: "error",
            error: error.message,
            reconnectAttempt: conn?.reconnectAttempt ?? 0,
          });
          return { connections: newConns };
        });
        toast.error(`MQTT Error: ${error.message}`);
      },
      onReconnecting: (attempt, delay) => {
        set((state) => {
          const newConns = new Map(state.connections);
          const conn = state.connections.get(profileId);
          newConns.set(profileId, {
            status: "reconnecting",
            error: conn?.error ?? null,
            reconnectAttempt: attempt,
          });
          return { connections: newConns };
        });
        toast.info(
          `Reconnecting (attempt ${attempt})... next in ${Math.round(delay / 1000)}s`,
        );
      },
      onMessage: (topic, payload, packet) => {
        const msg = {
          id: nanoid(),
          topic,
          payload,
          qos: packet.qos as 0 | 1 | 2,
          retain: packet.retain,
          timestamp: Date.now(),
          size: payload.byteLength,
        };
        useMessageStore.getState().addMessage(profileId, msg);
        useRecorderStore.getState().captureMessage(profileId, msg);
      },
    });
  },

  disconnect: (profileId: string) => {
    disconnectMqtt(profileId);

    // Clean up connection state
    set((state) => {
      const newConns = new Map(state.connections);
      newConns.delete(profileId);
      return { connections: newConns };
    });

    // Clean up tab and message state
    useMessageStore.getState().destroyTab(profileId);
    useUIStore.getState().closeTab(profileId);
  },

  addProfile: async (data) => {
    const now = Date.now();
    const profile: ConnectionProfile = {
      ...data,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    };
    await db.connections.add(profile);
    set((state) => ({ profiles: [...state.profiles, profile] }));
    return profile.id;
  },

  updateProfile: async (id, updates) => {
    const now = Date.now();
    await db.connections.update(id, { ...updates, updatedAt: now });
    set((state) => ({
      profiles: state.profiles.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: now } : p,
      ),
    }));
  },

  deleteProfile: async (id) => {
    await db.connections.delete(id);
    set((state) => ({
      profiles: state.profiles.filter((p) => p.id !== id),
    }));
  },

  loadProfiles: async () => {
    const profiles = await db.connections.toArray();
    set({ profiles });
  },

  createDefaultProfile: () => ({
    id: "",
    name: "",
    host: "localhost",
    port: 1883,
    protocol: "mqtt" as const,
    path: "",
    clientId: `oh-my-mqtt-${nanoid(8)}`,
    keepalive: DEFAULT_KEEPALIVE,
    clean: true,
    mqttVersion: 4 as const,
    subscriptions: [{ topic: "#", qos: 0 }] as Subscription[],
    caFile: undefined,
    certFile: undefined,
    keyFile: undefined,
    createdAt: 0,
    updatedAt: 0,
  }),
}));
