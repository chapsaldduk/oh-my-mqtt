import net from "node:net";
import { Aedes } from "aedes";

export interface TestBroker {
  port: number;
  /** Client ids that completed a CONNECT against this broker instance. */
  clientIds: string[];
  stop(): Promise<void>;
}

export async function getFreePort(): Promise<number> {
  const probe = net.createServer();
  await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const { port } = probe.address() as net.AddressInfo;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  return port;
}

/**
 * Real MQTT broker on a real TCP port. Stopping it destroys every socket, which
 * is what a network drop (lid close, wifi change) looks like to the client.
 */
export async function startBroker(port: number): Promise<TestBroker> {
  const broker = await Aedes.createBroker();
  const sockets = new Set<net.Socket>();
  const clientIds: string[] = [];

  broker.on("client", (client) => clientIds.push(client.id));

  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    broker.handle(socket);
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (err: Error) => reject(err);
    server.once("error", onError);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", onError);
      resolve();
    });
  });

  return {
    port,
    clientIds,
    async stop() {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await new Promise<void>((resolve) => broker.close(() => resolve()));
    },
  };
}

export async function waitFor<T>(
  probe: () => Promise<T | null | undefined | false>,
  message: string,
  timeoutMs = 20000,
  intervalMs = 100,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let last: T | null | undefined | false;
  while (Date.now() < deadline) {
    last = await probe();
    if (last) return last;
    await delay(intervalMs);
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for: ${message}`);
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
