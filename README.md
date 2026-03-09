# Oh My MQTT

MQTT Explorer를 대체하는 고성능 Electron 데스크톱 앱. 실시간 MQTT 모니터링, 메시지 녹화/재생, 대용량 데이터 처리를 지원합니다.

## 주요 기능

- **다중 프로토콜 지원**: `mqtt://`, `mqtts://`, `ws://`, `wss://`
- **토픽 트리 브라우저**: 실시간 MQTT 토픽 구조 시각화
- **메시지 뷰어**: JSON, HEX, Plain Text, Base64 포맷 지원
- **메시지 발행 (Publish)**: QoS, Retain 설정 가능
- **세션 녹화/재생**: 메시지 시퀀스 기록 및 재생
- **고급 검색**: 정규표현식, 토픽 패턴, 시간 범위 필터링
- **통계 대시보드**: 메시지 속도, 토픽별 통계, QoS 분포
- **네이티브 파일 저장**: 데이터를 JSON/CSV로 내보내기

## 설치

### macOS (Homebrew)

```bash
brew tap chapsaldduk/oh-my-mqtt
brew install --cask --no-quarantine oh-my-mqtt
```

### 직접 다운로드

[GitHub Releases](https://github.com/chapsaldduk/oh-my-mqtt/releases)에서 플랫폼별 설치 파일을 다운로드할 수 있습니다.

| 플랫폼 | 파일 |
| ------ | ---- |
| macOS (Apple Silicon) | `.dmg` (arm64) |
| macOS (Intel) | `.dmg` (x64) |
| Windows | `.exe` |
| Linux | `.AppImage` / `.deb` |

> **macOS 참고**: Homebrew 외 직접 다운로드 시 Gatekeeper 경고가 나타날 수 있습니다. 터미널에서 `xattr -cr /Applications/Oh\ My\ MQTT.app` 실행 후 앱을 열어주세요.

## 시스템 요구사항

- **macOS 12 이상** (Apple Silicon, Intel)
- **Windows 10 이상**
- **Linux** (Ubuntu 20.04+)

## 개발

### 의존성 설치

```bash
pnpm install
```

### 개발 서버 실행 (Electron)

```bash
pnpm dev
```

Electron 창이 열리고 React Hot Module Replacement(HMR)로 실시간 개발 가능합니다.

### 브라우저 개발 모드 (WebSocket만 지원)

웹 브라우저에서 개발하려면:

```bash
pnpm dev:web
```

> **주의**: `ws://`, `wss://` 프로토콜만 사용 가능합니다. `mqtt://`, `mqtts://` TCP는 Electron에서만 지원됩니다.

## 빌드 및 배포

### 타입 체크

```bash
pnpm tsc -b --noEmit
```

### 테스트 실행

```bash
pnpm test          # 단일 실행
pnpm test:watch    # 감시 모드
```

### Electron 프로덕션 빌드

```bash
pnpm build
```

build 아티팩트는 `out/` 디렉토리에 생성됩니다.

### macOS DMG 패키지 생성

```bash
pnpm package
```

`.dmg` 파일은 `dist-electron/` 디렉토리에 생성됩니다.

## 개발 스택

| 항목            | 기술                      |
| --------------- | ------------------------- |
| 프론트엔드      | React 19 + TypeScript     |
| 빌드 도구       | electron-vite (Vite 기반) |
| 번들러          | electron-builder          |
| 상태 관리       | Zustand                   |
| MQTT 클라이언트 | mqtt.js                   |
| 데이터베이스    | IndexedDB (Dexie.js)      |
| UI 컴포넌트     | shadcn/ui + Tailwind CSS  |
| 스타일          | Tailwind CSS v4           |
| 테스트          | Vitest + Testing Library  |

## 프로젝트 구조

```
oh-my-mqtt/
├── electron/                    # Electron main process
│   ├── main.ts                 # BrowserWindow 생성, IPC 핸들러
│   ├── preload.ts              # IPC bridge (contextBridge)
│   ├── mqtt-bridge.ts          # MQTT 연결 관리 (main process)
│   └── file-service.ts         # 네이티브 파일 저장
├── src/
│   ├── app/                    # 메인 레이아웃 & 헤더
│   ├── features/               # 기능 모듈
│   │   ├── connection/         # MQTT 연결 관리
│   │   ├── topic-tree/         # 토픽 브라우저
│   │   ├── message-viewer/     # 메시지 뷰어
│   │   ├── publisher/          # 메시지 발행
│   │   ├── recorder/           # 녹화/재생
│   │   ├── search/             # 검색 & 필터
│   │   └── stats/              # 통계 대시보드
│   ├── hooks/                  # 커스텀 훅
│   ├── stores/                 # Zustand 상태 관리
│   ├── lib/                    # 유틸리티
│   ├── types/                  # TypeScript 타입 정의
│   └── constants/              # 상수
├── docs/                        # 문서
│   ├── 01-plan/               # 계획 문서
│   ├── 02-design/             # 설계 문서
│   └── 03-analysis/           # 분석 리포트
└── public/                      # 정적 자산
```

## MQTT 브로커 연결

### 로컬 테스트

Mosquitto를 사용한 로컬 MQTT 브로커 예시:

```bash
# Mosquitto 설치 (macOS)
brew install mosquitto

# 브로커 시작 (기본 포트 1883)
mosquitto -c /opt/homebrew/etc/mosquitto/mosquitto.conf

# 테스트 메시지 발행
mosquitto_pub -h localhost -t "test/topic" -m "Hello MQTT"

# 메시지 구독 확인
mosquitto_sub -h localhost -t "test/#"
```

앱에서:

1. "Connect" 버튼 클릭
2. 프로토콜: `mqtt://`
3. 호스트: `localhost`
4. 포트: `1883`
5. 연결

### 공용 테스트 브로커

[test.mosquitto.org](https://test.mosquitto.org/)을 사용할 수도 있습니다:

```
호스트: test.mosquitto.org
포트 (mqtt): 1883
포트 (ws): 8080
```

## IPC 통신

Electron과 Renderer 간 MQTT 통신은 IPC(Inter-Process Communication)로 처리됩니다:

- **Main Process**: mqtt.js로 MQTT 브로커 연결 (TCP/TLS 지원)
- **Renderer**: IPC 채널로 main process에 명령 전송
- **이벤트**: Main → Renderer로 메시지/연결 이벤트 전달

### 지원 채널

| 채널              | 방향 | 기능               |
| ----------------- | ---- | ------------------ |
| `mqtt:connect`    | ↑    | 브로커 연결        |
| `mqtt:disconnect` | ↑    | 연결 해제          |
| `mqtt:publish`    | ↑    | 메시지 발행        |
| `mqtt:subscribe`  | ↑    | 토픽 구독          |
| `mqtt:on-connect` | ↓    | 연결 성공 이벤트   |
| `mqtt:on-message` | ↓    | 메시지 수신 이벤트 |
| `mqtt:on-error`   | ↓    | 에러 이벤트        |
| `file:save`       | ↑    | 파일 저장 대화상자 |

## 라이선스

MIT
