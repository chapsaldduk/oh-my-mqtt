<p align="center">
  <img src="resources/icon.png" alt="Oh My MQTT" width="128" />
</p>

# Oh My MQTT

An open-source, self-hosted MQTT GUI client for desktop and web. Monitor topics in real time, record message sessions, and export everything as JSON — across multiple simultaneous connections.

Ships with a built-in MQTT TCP proxy so native `mqtt://` and `mqtts://` protocols work directly in the browser — no WebSocket-only brokers required. Deploy with a single `docker run` and use it as your MQTT debugger and MQTT monitor for IoT infrastructure.

<p align="center">
  <img src="asset/example.png" alt="Oh My MQTT Screenshot" width="800" />
</p>

## Key Features

- **Multi-Connection Tabs** — Connect to multiple MQTT brokers at once, each in its own tab
- **Connection Import / Export** — Save and share connection profiles as password-encrypted JSON
- **Message Export** — Export received messages as JSON or CSV for analysis or archiving
- **MQTT Recorder & Playback** — Record messages and replay sessions at adjustable speed (0.5x–8x)
- **Message Comparison** — Side-by-side diff of two messages with line-level highlighting
- **Topic Tree Browser** — Visualize your MQTT topic hierarchy in real time
- **Message Viewer** — Inspect payloads in JSON, Plain Text, HEX, Hex Dump, or Base64
- **Publish Messages** — Send messages with QoS and Retain options
- **Advanced Search** — Filter by regex, topic pattern, or time range
- **Statistics Dashboard** — View message rates, per-topic stats, and QoS distribution
- **Multi-Protocol Support** — `mqtt://`, `mqtts://`, `ws://`, `wss://`
- **Built-in MQTT TCP Proxy** — Connect to any MQTT broker over TCP directly from the browser, no separate WebSocket bridge needed

## Protocol Support

| | Supported |
| --- | --- |
| **MQTT Version** | v3.1.1, v5.0 |
| **QoS** | 0, 1, 2 |
| **Transport** | `mqtt://`, `mqtts://`, `ws://`, `wss://` |
| **TLS/SSL** | Server CA, Client Certificate, Client Key |
| **Auth** | Username / Password |
| **Features** | Retain, Clean Session, Keep-Alive, Custom Client ID |

## Installation

### Docker (Recommended for self-hosting)

Runs in your browser with full protocol support via the built-in TCP proxy. Multi-architecture images are available for both Apple Silicon (arm64) and Intel (amd64).

```bash
docker run -d -p 3000:3000 chapsaldduk/oh-my-mqtt
```

Then open [http://localhost:3000](http://localhost:3000).

Or using Docker Compose:

```bash
curl -O https://raw.githubusercontent.com/chapsaldduk/oh-my-mqtt/main/docker-compose.yml
docker compose up -d
```

### Windows / Linux

Download the latest installer from [GitHub Releases](https://github.com/chapsaldduk/oh-my-mqtt/releases).

| Platform | File                 |
| -------- | -------------------- |
| Windows  | `.exe`               |
| Linux    | `.AppImage` / `.deb` |

### macOS (Homebrew)

> **Note**: The macOS desktop app is not code-signed. Direct `.dmg` downloads will be blocked by Gatekeeper. Use Homebrew or Docker instead.

```bash
brew tap chapsaldduk/oh-my-mqtt
brew install --cask --no-quarantine oh-my-mqtt
```

## Platform Comparison

|                      | Docker               | Desktop (Electron)                  |
| -------------------- | -------------------- | ----------------------------------- |
| **Protocols**        | mqtt, mqtts, ws, wss | mqtt, mqtts, ws, wss                |
| **macOS Gatekeeper** | No issues            | Requires Homebrew `--no-quarantine` |
| **Installation**     | `docker run`         | Installer or Homebrew               |
| **TLS Certificates** | Not supported        | Supported                           |
| **Auto-Update**      | Pull latest image    | Built-in updater                    |

## Tech Stack

| Component   | Technology                  |
| ----------- | --------------------------- |
| Frontend    | React 19 + TypeScript       |
| Build Tool  | electron-vite (Vite)        |
| Bundler     | electron-builder            |
| State       | Zustand                     |
| MQTT Client | mqtt.js                     |
| Database    | IndexedDB (Dexie.js)        |
| UI          | shadcn/ui + Tailwind CSS v4 |
| Testing     | Vitest + Testing Library    |

## Contributing

Contributions are welcome. Please open an issue first to discuss what you would like to change.

## License

MIT
