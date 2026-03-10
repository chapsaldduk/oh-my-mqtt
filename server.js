import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import net from "net";
import tls from "tls";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);

// Serve static web build
app.use(express.static(join(__dirname, "dist")));
app.get("*", (_req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

// WebSocket-to-TCP MQTT proxy
const wss = new WebSocketServer({ server, path: "/mqtt-proxy" });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const targetHost = url.searchParams.get("host");
  const targetPort = parseInt(url.searchParams.get("port") || "1883");
  const useTls = url.searchParams.get("tls") === "true";

  if (!targetHost) {
    ws.close(4000, "Missing host parameter");
    return;
  }

  const tcpSocket = useTls
    ? tls.connect({
        host: targetHost,
        port: targetPort,
        rejectUnauthorized: false,
      })
    : net.connect({ host: targetHost, port: targetPort });

  tcpSocket.on("connect", () => {
    console.log(
      `Proxy: connected to ${useTls ? "mqtts" : "mqtt"}://${targetHost}:${targetPort}`,
    );
  });

  // WebSocket → TCP
  ws.on("message", (data) => {
    if (tcpSocket.writable) {
      tcpSocket.write(Buffer.from(data));
    }
  });

  // TCP → WebSocket
  tcpSocket.on("data", (data) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  });

  // Cleanup
  ws.on("close", () => tcpSocket.destroy());
  ws.on("error", () => tcpSocket.destroy());
  tcpSocket.on("close", () => {
    if (ws.readyState === ws.OPEN) ws.close();
  });
  tcpSocket.on("error", (err) => {
    console.error(
      `Proxy TCP error (${targetHost}:${targetPort}): ${err.message}`,
    );
    if (ws.readyState === ws.OPEN) ws.close(4001, err.message);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Oh My MQTT server running on http://0.0.0.0:${PORT}`);
});
