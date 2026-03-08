import { describe, it, expect, beforeEach, vi } from "vitest";
import { useConnectionStore } from "../connectionStore";

// Mock external dependencies
vi.mock("@/lib/db.ts", () => ({
  db: {
    connections: {
      add: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      toArray: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock("@/lib/mqtt-client.ts", () => ({
  connectMqtt: vi.fn(),
  disconnectMqtt: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("connectionStore", () => {
  beforeEach(() => {
    useConnectionStore.setState({
      profiles: [],
      activeConnectionId: null,
      status: "disconnected",
      error: null,
      reconnectAttempt: 0,
    });
  });

  it("starts with disconnected status", () => {
    const state = useConnectionStore.getState();
    expect(state.status).toBe("disconnected");
    expect(state.profiles).toEqual([]);
    expect(state.activeConnectionId).toBeNull();
    expect(state.error).toBeNull();
  });

  it("creates a default profile with correct fields", () => {
    const profile = useConnectionStore.getState().createDefaultProfile();
    expect(profile.host).toBe("localhost");
    expect(profile.protocol).toBe("mqtt");
    expect(profile.clean).toBe(true);
    expect(profile.mqttVersion).toBe(4);
    expect(profile.subscriptions).toEqual([{ topic: "#", qos: 0 }]);
    expect(profile.clientId).toMatch(/^oh-my-mqtt-/);
  });

  it("creates unique client IDs", () => {
    const p1 = useConnectionStore.getState().createDefaultProfile();
    const p2 = useConnectionStore.getState().createDefaultProfile();
    expect(p1.clientId).not.toBe(p2.clientId);
  });

  it("adds a profile", async () => {
    const id = await useConnectionStore.getState().addProfile({
      name: "Test",
      host: "broker.test",
      port: 8883,
      protocol: "wss",
      path: "/mqtt",
      clientId: "test-client",
      keepalive: 60,
      clean: true,
      mqttVersion: 4,
      subscriptions: [],
    });
    expect(id).toBeDefined();
    expect(useConnectionStore.getState().profiles.length).toBe(1);
    expect(useConnectionStore.getState().profiles[0].name).toBe("Test");
  });

  it("deletes a profile", async () => {
    const id = await useConnectionStore.getState().addProfile({
      name: "ToDelete",
      host: "broker.test",
      port: 8883,
      protocol: "wss",
      path: "/mqtt",
      clientId: "test",
      keepalive: 60,
      clean: true,
      mqttVersion: 4,
      subscriptions: [],
    });
    await useConnectionStore.getState().deleteProfile(id);
    expect(useConnectionStore.getState().profiles.length).toBe(0);
  });

  it("disconnect resets state", () => {
    useConnectionStore.setState({
      status: "connected",
      activeConnectionId: "some-id",
      error: "some-error",
      reconnectAttempt: 3,
    });
    useConnectionStore.getState().disconnect();
    const state = useConnectionStore.getState();
    expect(state.status).toBe("disconnected");
    expect(state.activeConnectionId).toBeNull();
    expect(state.error).toBeNull();
    expect(state.reconnectAttempt).toBe(0);
  });

  it("connect does nothing if profile not found", () => {
    useConnectionStore.getState().connect("nonexistent");
    expect(useConnectionStore.getState().status).toBe("disconnected");
  });
});
