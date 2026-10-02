// GIVEN (not part of the course): a fake REST API, running as a real HTTP server on localhost.
// It starts when this file is first imported, on a free port, and never keeps the process alive.
// Every request prints a 🌐 line and is answered after a delay (200 ms by default).
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

export interface ServerUser {
  id: string;
  name: string;
}
export interface ServerReactions {
  thumbsUp: number;
  heart: number;
  rocket: number;
}
export interface ServerPost {
  id: string;
  title: string;
  content: string;
  user: string;
  date: string;
  reactions: ServerReactions;
}
export interface ServerNotification {
  id: string;
  message: string;
  date: string;
}

// A fake clock, so dates are predictable: each new date is one minute after the previous one.
let clock = Date.parse('2026-01-01T10:00:00.000Z');
const nextDate = () => new Date((clock += 60_000)).toISOString();

const db = {
  users: [
    { id: 'u1', name: 'Ada Lovelace' },
    { id: 'u2', name: 'Linus Torvalds' },
  ] as ServerUser[],
  posts: [] as ServerPost[],
  notifications: [] as ServerNotification[],
  nextPostId: 1,
  nextNotificationId: 1,
};

function createPost(title: string, content: string, user: string): ServerPost {
  const post = {
    id: `p${db.nextPostId++}`,
    title,
    content,
    user,
    date: nextDate(),
    reactions: { thumbsUp: 0, heart: 0, rocket: 0 },
  };
  db.posts.push(post);
  return post;
}
createPost('First post!', 'Hello, everyone.', 'u1');
createPost('Redux Toolkit', 'Less boilerplate, same ideas.', 'u2');

// ── test knobs ───────────────────────────────────────────────────────────────
let defaultLatency = 200;
let latencies: number[] = [];
let failNext: string | null = null;
const channels = new Set<EventTarget>();

export const server = {
  /** The delays (ms) of the next requests, e.g. [600, 100]. */
  setNextLatencies(list: number[]) {
    latencies = [...list];
  },
  /** Make the next request to e.g. 'POST /posts' fail with a 500 error. */
  failNext(request: string) {
    failNext = request;
  },
  /** The server pushes a new notification to every open channel (like a WebSocket message). */
  pushNotification(message: string) {
    const notification = { id: `n${db.nextNotificationId++}`, message, date: nextDate() };
    db.notifications.push(notification);
    console.log(`  🔌 server pushes: "${message}"`);
    for (const channel of channels) {
      channel.dispatchEvent(new MessageEvent('message', { data: JSON.stringify([notification]) }));
    }
  },
};

/** A fake WebSocket: `addEventListener('message', …)` receives notifications pushed by the server. */
export function openNotificationsChannel() {
  const channel = new EventTarget();
  channels.add(channel);
  console.log('  🔌 channel opened');
  return {
    addEventListener(type: 'message', listener: (event: MessageEvent<string>) => void) {
      channel.addEventListener(type, listener as EventListener);
    },
    close() {
      channels.delete(channel);
      console.log('  🔌 channel closed');
    },
  };
}

// ── the HTTP server ──────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function readBody(req: IncomingMessage): Promise<any> {
  let text = '';
  for await (const chunk of req) text += chunk;
  return text ? JSON.parse(text) : undefined;
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const method = req.method ?? 'GET';
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  const body = method === 'GET' ? undefined : await readBody(req);
  const ms = latencies.shift() ?? defaultLatency;
  console.log(`  🌐 server: ${method} ${path}${body ? ` ${JSON.stringify(body)}` : ''} (answers in ${ms} ms)`);
  await sleep(ms);

  const send = (status: number, data: unknown) => {
    res.writeHead(status, { 'Content-Type': 'application/json', Connection: 'close' });
    res.end(JSON.stringify(data));
  };
  if (failNext === `${method} ${path}`) {
    failNext = null;
    return send(500, { message: 'the server failed' });
  }

  const postMatch = path.match(/^\/posts\/([^/]+)$/);
  const reactionMatch = path.match(/^\/posts\/([^/]+)\/reactions$/);

  if (method === 'GET' && path === '/users') return send(200, db.users);
  if (method === 'GET' && path === '/posts') return send(200, db.posts);
  if (method === 'GET' && path === '/notifications') return send(200, db.notifications);
  if (method === 'POST' && path === '/posts') return send(201, createPost(body.title, body.content, body.user));

  if (postMatch || reactionMatch) {
    const post = db.posts.find((p) => p.id === (postMatch ?? reactionMatch)![1]);
    if (!post) return send(404, { message: `no post ${path}` });
    if (method === 'GET' && postMatch) return send(200, post);
    if (method === 'PATCH' && postMatch) {
      Object.assign(post, { title: body.title ?? post.title, content: body.content ?? post.content });
      return send(200, post);
    }
    if (method === 'POST' && reactionMatch) {
      post.reactions[body.reaction as keyof ServerReactions]++;
      return send(200, post);
    }
  }
  return send(404, { message: `no route ${method} ${path}` });
}

const httpServer = createServer((req, res) => void handle(req, res));
await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
httpServer.unref(); // the demo can end even though the server is running

const address = httpServer.address();
export const serverUrl = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
