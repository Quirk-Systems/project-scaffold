# Real-Time Protocols

> Pick the wrong one and you're rewriting in 6 months.
> Each has a shape. Match the shape to the problem.

---

## Decision Tree

```
Client ← server only? (notifications, feeds, AI streaming)
  → Server-Sent Events (SSE) — simplest, HTTP/2 native

Bidirectional? (chat, games, collaboration)
  → WebSockets — full duplex, persistent TCP

Peer-to-peer? (video, screen share, file transfer)
  → WebRTC — browser-to-browser, UDP, low latency

IoT / embedded / guaranteed delivery?
  → MQTT — lightweight pub/sub, QoS levels

High-throughput event log?
  → Kafka / Redpanda — persistent, consumer groups, replay
```

---

## Server-Sent Events (SSE)

**Best for:** AI streaming, notifications, live dashboards.
**Auto-reconnect** built into the browser.

```typescript
// Server — Next.js App Router
export async function GET(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(
          `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        ));
      };

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 30_000);

      const unsub = eventEmitter.on("update", (data) => send("update", data));

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsub();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",  // disable nginx buffering
    },
  });
}

// Client
const es = new EventSource("/api/stream");
es.addEventListener("update", (e) => {
  const data = JSON.parse(e.data);
  setItems((prev) => [...prev, data]);
});
// Browser auto-reconnects on error
```

---

## WebSockets

**Best for:** chat, collaborative editing, multiplayer, bidirectional live data.

```typescript
// Server — using ws
import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 });
const rooms = new Map<string, Set<WebSocket>>();

wss.on("connection", (ws, req) => {
  const roomId = new URL(req.url!, "ws://localhost").searchParams.get("room") ?? "global";
  const userId = authenticate(req.headers.authorization);
  if (!userId) { ws.close(4001, "Unauthorized"); return; }

  rooms.get(roomId)?.add(ws) ?? rooms.set(roomId, new Set([ws]));

  ws.on("message", (raw) => {
    try {
      const msg = MessageSchema.parse(JSON.parse(raw.toString()));
      broadcast(roomId, { ...msg, userId }, ws);
    } catch {
      ws.send(JSON.stringify({ error: "Invalid format" }));
    }
  });

  ws.on("close", () => rooms.get(roomId)?.delete(ws));

  const ping = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.ping();
  }, 30_000);
  ws.on("close", () => clearInterval(ping));
});

function broadcast(roomId: string, msg: unknown, exclude?: WebSocket) {
  const data = JSON.stringify(msg);
  rooms.get(roomId)?.forEach((client) => {
    if (client !== exclude && client.readyState === WebSocket.OPEN) client.send(data);
  });
}
```

### Auto-Reconnect Client
```typescript
class ReconnectingWebSocket {
  private ws: WebSocket | null = null;
  private delay = 1000;

  constructor(private url: string) { this.connect(); }

  private connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onclose = () => {
      setTimeout(() => {
        this.delay = Math.min(this.delay * 2, 30_000);
        this.connect();
      }, this.delay);
    };
    this.ws.onopen = () => { this.delay = 1000; };
  }

  send(type: string, data: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN)
      this.ws.send(JSON.stringify({ type, data }));
  }
}
```

### Scaling WebSockets via Redis Pub/Sub
```typescript
// Problem: stateful connections don't cross servers
// Solution: pub/sub so server 1 can reach clients on server 2

const pub = new Redis(REDIS_URL);
const sub = new Redis(REDIS_URL);

sub.subscribe("ws:broadcast");
sub.on("message", (_, message) => {
  const { roomId, data } = JSON.parse(message);
  rooms.get(roomId)?.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  });
});

// On incoming message from any client
pub.publish("ws:broadcast", JSON.stringify({ roomId, data }));
```

---

## Long Polling

**Best for:** infrequent updates, wide compatibility, low complexity.

```typescript
// Server holds request open up to 30s
export async function GET(req: Request) {
  const since = Number(new URL(req.url).searchParams.get("since"));
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    const events = await db.event.findMany({
      where: { createdAt: { gt: new Date(since) } },
      take: 50,
    });
    if (events.length > 0) return Response.json({ events, timestamp: Date.now() });
    if (req.signal.aborted) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  return Response.json({ events: [], timestamp: Date.now() });
}
```

---

## WebRTC

**Best for:** video/audio, screen share, P2P file transfer.
**Complexity:** high. Use LiveKit or Daily.co unless you enjoy deep pain.

```typescript
const pc = new RTCPeerConnection({
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
});

const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
stream.getTracks().forEach((t) => pc.addTrack(t, stream));

pc.ontrack = (e) => { remoteVideo.srcObject = e.streams[0]; };
pc.onicecandidate = (e) => { if (e.candidate) signaling.send("ice", e.candidate); };

// Initiator
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
signaling.send("offer", offer);
```

---

## MQTT

**Best for:** IoT, sensors, low-bandwidth, unreliable networks.

```typescript
import mqtt from "mqtt";

const client = mqtt.connect("mqtt://broker.example.com", {
  clientId: `device-${deviceId}`,
  keepalive: 60,
  reconnectPeriod: 1000,
});

client.subscribe("sensors/temperature/#", { qos: 1 });
client.on("message", (topic, payload) => {
  console.log(topic, JSON.parse(payload.toString()));
});

client.publish(
  "sensors/temperature/room-1",
  JSON.stringify({ value: 22.5, ts: Date.now() }),
  { qos: 1 }
);
```

---

## Resources

- [MDN SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [ws](https://github.com/websockets/ws) — Node.js WebSocket server
- [Socket.io](https://socket.io) — WebSocket + fallbacks
- [LiveKit](https://livekit.io) — managed WebRTC
- [MQTT.js](https://github.com/mqttjs/MQTT.js)
- [High Performance Browser Networking](https://hpbn.co)
