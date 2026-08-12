import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  _electron as electron,
  type ElectronApplication,
  type Page,
} from "playwright";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { delay, getFreePort, startBroker, waitFor } from "./helpers";
import type { TestBroker } from "./helpers";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MAIN_ENTRY = resolve(ROOT, "out/main/index.js");

const CONNECTION_ID = "e2e-connection";
const TOPIC = "e2e/lifecycle";

type E2EEvent =
  | { type: "connect"; id: string }
  | { type: "disconnect"; id: string }
  | { type: "error"; id: string; message: string }
  | { type: "reconnecting"; id: string; attempt: number; delayMs: number }
  | { type: "message"; id: string; topic: string; payload: string };

interface MqttPreloadApi {
  connect(connectionId: string, profile: unknown): void;
  disconnect(connectionId: string): void;
  publish(
    connectionId: string,
    topic: string,
    payload: string,
    options?: { qos?: 0 | 1 | 2; retain?: boolean },
  ): void;
  onConnect(cb: (connectionId: string) => void): () => void;
  onDisconnect(cb: (connectionId: string) => void): () => void;
  onError(cb: (connectionId: string, message: string) => void): () => void;
  onReconnecting(
    cb: (connectionId: string, attempt: number, delayMs: number) => void,
  ): () => void;
  onMessage(
    cb: (
      connectionId: string,
      topic: string,
      payload: Uint8Array,
      meta: { qos: number; retain: boolean },
    ) => void,
  ): () => void;
}

type E2EWindow = Window &
  typeof globalThis & {
    electronAPI: { mqtt: MqttPreloadApi };
    __e2eEvents: E2EEvent[];
  };

let app: ElectronApplication;
let page: Page;
let broker: TestBroker;
let port: number;
let stderr = "";

async function launchApp() {
  const electronApp = await electron.launch({
    args: [MAIN_ENTRY],
    env: { ...process.env, NODE_ENV: "production" },
  });
  electronApp.process().stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });
  return electronApp;
}

async function installEventTap(target: Page) {
  await target.evaluate(() => {
    const w = window as unknown as E2EWindow;
    w.__e2eEvents = [];
    const { mqtt } = w.electronAPI;
    mqtt.onConnect((id) => w.__e2eEvents.push({ type: "connect", id }));
    mqtt.onDisconnect((id) => w.__e2eEvents.push({ type: "disconnect", id }));
    mqtt.onError((id, message) =>
      w.__e2eEvents.push({ type: "error", id, message }),
    );
    mqtt.onReconnecting((id, attempt, delayMs) =>
      w.__e2eEvents.push({ type: "reconnecting", id, attempt, delayMs }),
    );
    mqtt.onMessage((id, topic, payload) =>
      w.__e2eEvents.push({
        type: "message",
        id,
        topic,
        payload: new TextDecoder().decode(payload),
      }),
    );
  });
}

function events(): Promise<E2EEvent[]> {
  return page.evaluate(
    () => (window as unknown as E2EWindow).__e2eEvents ?? [],
  );
}

async function startConnection(brokerPort: number) {
  await page.evaluate(
    ({ connectionId, brokerPort: p, topic }) => {
      (window as unknown as E2EWindow).electronAPI.mqtt.connect(connectionId, {
        host: "127.0.0.1",
        port: p,
        protocol: "mqtt",
        path: "/mqtt",
        clientId: connectionId,
        keepalive: 5,
        clean: true,
        mqttVersion: 4,
        subscriptions: [{ topic, qos: 0 }],
      });
    },
    { connectionId: CONNECTION_ID, brokerPort, topic: TOPIC },
  );
}

const seen = (list: E2EEvent[], type: E2EEvent["type"]) =>
  list.filter((e) => e.type === type);

const reconnects = (list: E2EEvent[]) =>
  list.filter(
    (e): e is Extract<E2EEvent, { type: "reconnecting" }> =>
      e.type === "reconnecting",
  );

async function waitForEvent(type: E2EEvent["type"], after = 0) {
  return waitFor(
    async () => seen(await events(), type).length > after,
    `mqtt "${type}" event (more than ${after})`,
  );
}

/** The main process must still answer IPC — i.e. it did not die. */
async function assertAppAlive() {
  await expect(
    app.evaluate(({ app: electronApp }) => electronApp.getVersion()),
  ).resolves.toBeTruthy();
}

function assertNoDestroyedObjectCrash() {
  expect(stderr).not.toContain("Object has been destroyed");
  expect(stderr).not.toContain("Uncaught exception in main process");
}

describe("MQTT bridge lifecycle (e2e)", () => {
  beforeEach(async () => {
    if (!existsSync(MAIN_ENTRY)) {
      throw new Error(`Missing ${MAIN_ENTRY}. Run "pnpm build" first.`);
    }
    stderr = "";
    port = await getFreePort();
    broker = await startBroker(port);
    app = await launchApp();
    page = await app.firstWindow();
    await page.waitForLoadState("domcontentloaded");
    await installEventTap(page);
  });

  afterEach(async () => {
    await app?.close().catch(() => {});
    await broker?.stop().catch(() => {});
  });

  it("connects, subscribes and round-trips a message through the broker", async () => {
    await startConnection(port);
    await waitForEvent("connect");

    await page.evaluate(
      ({ connectionId, topic }) => {
        (window as unknown as E2EWindow).electronAPI.mqtt.publish(
          connectionId,
          topic,
          "hello",
        );
      },
      { connectionId: CONNECTION_ID, topic: TOPIC },
    );

    await waitForEvent("message");
    const received = seen(await events(), "message");
    expect(received[0]).toMatchObject({ topic: TOPIC, payload: "hello" });
    assertNoDestroyedObjectCrash();
  });

  it("reconnects with backoff after the broker disappears and comes back", async () => {
    await startConnection(port);
    await waitForEvent("connect");

    await broker.stop();
    await waitForEvent("disconnect");
    await waitForEvent("reconnecting");

    broker = await startBroker(port);
    await waitForEvent("connect", 1);

    expect(broker.clientIds).toContain(CONNECTION_ID);
    assertNoDestroyedObjectCrash();
  });

  // Regression: reconnecting ran through connect() -> disconnect(), which reset
  // the attempt counter, pinning the backoff at 1s forever while offline.
  it("grows the reconnect backoff instead of hammering every second", async () => {
    await startConnection(port);
    await waitForEvent("connect");

    await broker.stop();
    await waitFor(
      async () => reconnects(await events()).length >= 3,
      "three reconnect attempts",
    );

    const attempts = reconnects(await events()).slice(0, 3);
    expect(attempts.map((e) => e.attempt)).toEqual([1, 2, 3]);
    expect(attempts.map((e) => e.delayMs)).toEqual([1000, 2000, 4000]);
    assertNoDestroyedObjectCrash();
  });

  it("tears the bridge down when the window closes, so a returning network does not crash the app", async () => {
    await startConnection(port);
    await waitForEvent("connect");

    await app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0]?.destroy();
    });

    await broker.stop();
    broker = await startBroker(port);
    await delay(6000);

    expect(broker.clientIds).toEqual([]);
    assertNoDestroyedObjectCrash();
    await assertAppAlive();
  });

  // Regression: window destroyed while a reconnect was already scheduled. The
  // timer used to fire into a dead BrowserWindow and throw
  // "TypeError: Object has been destroyed" out of the mqtt "connect" handler.
  // App-level teardown is removed here so the bridge's own guards are tested.
  it("aborts an in-flight reconnect when the window was destroyed underneath it", async () => {
    await startConnection(port);
    await waitForEvent("connect");

    await broker.stop();
    // Count events rather than inspect `attempt`, so this still lands on the
    // pre-fix build where the attempt counter was reset on every retry.
    await waitForEvent("reconnecting", 1);

    await app.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];
      // Simulate the app having no window-close teardown at all.
      window?.removeAllListeners("closed");
      window?.destroy();
    });

    broker = await startBroker(port);
    await delay(12000);

    expect(broker.clientIds).toEqual([]);
    assertNoDestroyedObjectCrash();
    await assertAppAlive();
  });
});
