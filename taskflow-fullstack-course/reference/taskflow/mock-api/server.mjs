// 📦 PROVIDED: TaskFlow's mock API for Part 1 (S13–S27). Retired in Part 3, when the Servlet API
// implements the same contract (02-project-spec.md §5). You don't need to write or memorise this file,
// but reading it is a good preview of what your servlets will do.
//
// json-server 0.17 gives us: an Express server, a JSON file database (lowdb, `router.db`), and a logger.
// We deliberately DON'T mount json-server's automatic REST routes: they would expose every collection
// in db.json (including users' passwords!) and don't follow our contract (13.02).

import jsonServer from 'json-server';
import { copyFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT ?? 3001);
/** --secure (from S24): requests need a session (JSESSIONID) and unsafe methods need the CSRF header. */
const SECURE = process.argv.includes('--secure');
/** Simulated network latency, so loading states are visible. Override per request with ?_mockDelay=ms. */
const DELAY_MS = Number(process.env.MOCK_DELAY ?? 300);

const DB_FILE = fileURLToPath(new URL('./db.json', import.meta.url));
const SEED_FILE = fileURLToPath(new URL('./db.seed.json', import.meta.url));
if (!existsSync(DB_FILE) || process.argv.includes('--reset')) {
  copyFileSync(SEED_FILE, DB_FILE); // db.json is your working copy; db.seed.json never changes
}

const server = jsonServer.create();
const router = jsonServer.router(DB_FILE);
/** lowdb (a lodash chain over db.json): db.get('tasks').filter(…).value(), ….write() */
const db = router.db;

server.use(jsonServer.defaults({ noCors: true, logger: true })); // noCors: see 13.15
server.use(jsonServer.bodyParser);

// ── Helpers ──────────────────────────────────────────────────────────────────

const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];
const SORT_FIELDS = ['id', 'title', 'priority', 'dueDate', 'createdAt', 'updatedAt'];
const TITLE_MAX = 120;
const DESCRIPTION_MAX = 2000;
const COMMENT_MAX = 1000;

/** The standard error body for every non-2xx response. */
function sendError(req, res, status, error, message, fieldErrors) {
  res.status(status).json({
    status,
    error,
    message,
    ...(fieldErrors ? { fieldErrors } : {}),
    path: req.originalUrl.split('?')[0],
    timestamp: new Date().toISOString(),
  });
}

function parseCookies(header = '') {
  const cookies = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index > 0) cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return cookies;
}

/** Never send the password field to the client. */
const publicUser = ({ password: _password, ...user }) => user;

const isPositiveInt = (value) => /^\d+$/.test(String(value)) && Number(value) > 0;
const isIsoDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** In-memory sessions: sessionId → userId. Restarting the mock logs everybody out (like Tomcat). */
const sessions = new Map();

// ── Cross-cutting middleware (the servlet FILTERS of Part 2 do the same jobs) ─

// 1. Latency and failure simulation, for learning loading/error states (13.08).
server.use('/api', async (req, res, next) => {
  const { _mockDelay, _mockStatus } = req.query;
  delete req.query._mockDelay;
  delete req.query._mockStatus;
  await sleep(_mockDelay !== undefined ? Number(_mockDelay) : DELAY_MS);
  if (_mockStatus !== undefined) {
    const status = Number(_mockStatus);
    return sendError(req, res, status, 'SIMULATED_ERROR', `Simulated ${status} response (?_mockStatus)`);
  }
  next();
});

// 2. Who is calling? (A session cookie → a user.)
server.use('/api', (req, res, next) => {
  req.cookies = parseCookies(req.headers.cookie);
  const userId = sessions.get(req.cookies.JSESSIONID);
  req.user = userId === undefined ? null : (db.get('users').find({ id: userId }).value() ?? null);
  next();
});

// 3. Unsafe methods must send JSON (a plain HTML form can't), and, in secure mode, the CSRF header.
server.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const hasBody = Number(req.headers['content-length'] ?? 0) > 0;
  if (hasBody && !req.is('application/json')) {
    return sendError(req, res, 415, 'UNSUPPORTED_MEDIA_TYPE', 'Send the request body as application/json');
  }
  if (SECURE) {
    const cookieToken = req.cookies['XSRF-TOKEN'];
    const headerToken = req.get('X-XSRF-TOKEN');
    if (!cookieToken || cookieToken !== headerToken) {
      return sendError(req, res, 403, 'CSRF_TOKEN_INVALID', 'Missing or invalid CSRF token');
    }
  }
  next();
});

// ── Auth endpoints ───────────────────────────────────────────────────────────

/** Issues the CSRF token in a cookie JavaScript can read (NOT HttpOnly, on purpose: S24). */
function issueCsrfCookie(res) {
  res.cookie('XSRF-TOKEN', randomUUID(), { path: '/', sameSite: 'lax' });
}

server.get('/api/auth/csrf', (req, res) => {
  issueCsrfCookie(res);
  res.status(204).end();
});

server.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return sendError(req, res, 400, 'VALIDATION_FAILED', 'username and password are required');
  }
  // ⚠️ MOCK ONLY: plain-text passwords. The real backend stores password hashes (S41).
  const user = db.get('users').find({ username, password }).value();
  if (!user) {
    // Same message for "no such user" and "wrong password": don't help attackers enumerate users.
    return sendError(req, res, 401, 'BAD_CREDENTIALS', 'Invalid username or password');
  }
  const sessionId = randomUUID(); // a NEW session id on login (session fixation defence, S41)
  sessions.set(sessionId, user.id);
  res.cookie('JSESSIONID', sessionId, { path: '/', httpOnly: true, sameSite: 'lax' });
  issueCsrfCookie(res); // rotate the CSRF token on login
  res.json(publicUser(user));
});

server.post('/api/auth/logout', (req, res) => {
  sessions.delete(req.cookies.JSESSIONID);
  res.clearCookie('JSESSIONID', { path: '/' });
  res.status(204).end();
});

server.get('/api/auth/me', (req, res) => {
  if (!req.user) return sendError(req, res, 401, 'UNAUTHENTICATED', 'Not logged in');
  res.json(publicUser(req.user));
});

// 4. Every other /api endpoint needs a user. Before S24 (SECURE off), anonymous calls act as alice.
server.use('/api', (req, res, next) => {
  if (!req.user) {
    if (SECURE) return sendError(req, res, 401, 'UNAUTHENTICATED', 'Not logged in');
    req.user = db.get('users').find({ id: 1 }).value();
  }
  next();
});

// ── Tasks ────────────────────────────────────────────────────────────────────

/** Authorization: users see their own tasks; ADMIN sees all. */
const canAccess = (user, task) => user.role === 'ADMIN' || task.ownerId === user.id;

/** Finds a task the caller may access. Someone else's task is reported as 404, not 403 (no probing). */
function findAccessibleTask(req, res) {
  if (!isPositiveInt(req.params.id)) {
    sendError(req, res, 404, 'NOT_FOUND', 'Task not found');
    return null;
  }
  const task = db.get('tasks').find({ id: Number(req.params.id) }).value();
  if (!task || !canAccess(req.user, task)) {
    sendError(req, res, 404, 'NOT_FOUND', 'Task not found');
    return null;
  }
  return task;
}

/**
 * Validates the editable fields. `partial` (PATCH) only checks the fields present.
 * Unknown fields (id, ownerId, createdAt…) are IGNORED: the client can't set them (mass assignment, S46).
 */
function validateTaskInput(body, partial) {
  const errors = {};
  const out = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(body, key);
  const required = (key) => !partial || has(key);

  if (required('title')) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (title === '') errors.title = 'must not be blank';
    else if (title.length > TITLE_MAX) errors.title = `size must be at most ${TITLE_MAX}`;
    else out.title = title;
  }
  if (required('description')) {
    const description = body.description ?? '';
    if (typeof description !== 'string') errors.description = 'must be a string';
    else if (description.length > DESCRIPTION_MAX) errors.description = `size must be at most ${DESCRIPTION_MAX}`;
    else out.description = description.trim();
  }
  if (required('status')) {
    if (!TASK_STATUSES.includes(body.status)) errors.status = `must be one of ${TASK_STATUSES.join(', ')}`;
    else out.status = body.status;
  }
  if (required('priority')) {
    if (!PRIORITIES.includes(body.priority)) errors.priority = `must be one of ${PRIORITIES.join(', ')}`;
    else out.priority = body.priority;
  }
  if (required('dueDate')) {
    const dueDate = body.dueDate ?? null;
    if (dueDate !== null && !isIsoDate(dueDate)) errors.dueDate = 'must be null or YYYY-MM-DD';
    else out.dueDate = dueDate;
  }
  if (required('categoryId')) {
    const categoryId = body.categoryId ?? null;
    if (categoryId !== null && !db.get('categories').find({ id: categoryId }).value()) {
      errors.categoryId = 'unknown category';
    } else out.categoryId = categoryId;
  }
  return { errors, values: out };
}

function sendValidationError(req, res, errors) {
  sendError(req, res, 400, 'VALIDATION_FAILED', 'Request contains invalid fields', errors);
}

/**
 * A rule only the SERVER can check: titles are unique per owner (case-insensitive).
 * The client can't know every task (other devices, other tabs), so the form must show this error (19.09).
 */
function isTitleTaken(ownerId, title, exceptTaskId) {
  const wanted = title.trim().toLowerCase();
  return db
    .get('tasks')
    .some((t) => t.ownerId === ownerId && t.id !== exceptTaskId && t.title.trim().toLowerCase() === wanted)
    .value();
}

const TITLE_TAKEN = { title: 'a task with this title already exists' };

const PRIORITY_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2 };

function compareTasks(field, direction) {
  const sign = direction === 'desc' ? -1 : 1;
  return (a, b) => {
    let x = a[field];
    let y = b[field];
    if (field === 'priority') [x, y] = [PRIORITY_RANK[x], PRIORITY_RANK[y]];
    if (x === y) return a.id - b.id; // stable, deterministic order
    if (x === null) return 1; // nulls last, whatever the direction
    if (y === null) return -1;
    if (typeof x === 'string') return sign * x.localeCompare(y);
    return sign * (x - y);
  };
}

// GET /api/tasks?q=&status=&priority=&categoryId=&page=0&size=20&sort=dueDate,asc → Page<Task>
server.get('/api/tasks', (req, res) => {
  const { q = '', status, priority, categoryId, page = '0', size = '20', sort = 'id,asc' } = req.query;
  const errors = {};
  if (status !== undefined && !TASK_STATUSES.includes(status)) errors.status = `must be one of ${TASK_STATUSES.join(', ')}`;
  if (priority !== undefined && !PRIORITIES.includes(priority)) errors.priority = `must be one of ${PRIORITIES.join(', ')}`;
  if (categoryId !== undefined && !isPositiveInt(categoryId)) errors.categoryId = 'must be a positive integer';
  if (!/^\d+$/.test(page)) errors.page = 'must be an integer >= 0';
  if (!/^\d+$/.test(size) || Number(size) < 1 || Number(size) > 100) errors.size = 'must be between 1 and 100';
  const [sortField, sortDirection = 'asc'] = String(sort).split(',');
  if (!SORT_FIELDS.includes(sortField) || !['asc', 'desc'].includes(sortDirection)) {
    errors.sort = `must be <field>,<asc|desc> with field one of ${SORT_FIELDS.join(', ')}`;
  }
  if (Object.keys(errors).length > 0) return sendValidationError(req, res, errors);

  const needle = String(q).trim().toLowerCase();
  const matching = db
    .get('tasks')
    .filter((task) => canAccess(req.user, task))
    .filter((task) => status === undefined || task.status === status)
    .filter((task) => priority === undefined || task.priority === priority)
    .filter((task) => categoryId === undefined || task.categoryId === Number(categoryId))
    .filter((task) => needle === '' || `${task.title} ${task.description}`.toLowerCase().includes(needle))
    .value()
    .sort(compareTasks(sortField, sortDirection));

  const pageNumber = Number(page);
  const pageSize = Number(size);
  res.json({
    items: matching.slice(pageNumber * pageSize, (pageNumber + 1) * pageSize),
    page: pageNumber,
    size: pageSize,
    totalItems: matching.length,
    totalPages: Math.ceil(matching.length / pageSize),
  });
});

server.get('/api/tasks/:id', (req, res) => {
  const task = findAccessibleTask(req, res);
  if (task) res.json(task);
});

server.post('/api/tasks', (req, res) => {
  const { errors, values } = validateTaskInput(req.body ?? {}, false);
  if (Object.keys(errors).length > 0) return sendValidationError(req, res, errors);
  if (isTitleTaken(req.user.id, values.title)) return sendValidationError(req, res, TITLE_TAKEN);
  const now = new Date().toISOString();
  const id = (db.get('tasks').maxBy('id').value()?.id ?? 0) + 1;
  const task = { id, ...values, ownerId: req.user.id, createdAt: now, updatedAt: now };
  db.get('tasks').push(task).write();
  res.status(201).location(`/api/tasks/${id}`).json(task);
});

function updateTask(req, res, partial) {
  const task = findAccessibleTask(req, res);
  if (!task) return;
  const { errors, values } = validateTaskInput(req.body ?? {}, partial);
  if (Object.keys(errors).length > 0) return sendValidationError(req, res, errors);
  if (values.title !== undefined && isTitleTaken(task.ownerId, values.title, task.id)) {
    return sendValidationError(req, res, TITLE_TAKEN);
  }
  const updated = db
    .get('tasks')
    .find({ id: task.id })
    .assign({ ...values, updatedAt: new Date().toISOString() })
    .write();
  res.json(updated);
}

server.put('/api/tasks/:id', (req, res) => updateTask(req, res, false));
server.patch('/api/tasks/:id', (req, res) => updateTask(req, res, true));

server.delete('/api/tasks/:id', (req, res) => {
  const task = findAccessibleTask(req, res);
  if (!task) return;
  db.get('tasks').remove({ id: task.id }).write();
  db.get('comments').remove({ taskId: task.id }).write();
  res.status(204).end();
});

// ── Comments, categories, stats ──────────────────────────────────────────────

server.get('/api/tasks/:id/comments', (req, res) => {
  const task = findAccessibleTask(req, res);
  if (task) res.json(db.get('comments').filter({ taskId: task.id }).sortBy('createdAt').value());
});

server.post('/api/tasks/:id/comments', (req, res) => {
  const task = findAccessibleTask(req, res);
  if (!task) return;
  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
  if (body === '' || body.length > COMMENT_MAX) {
    return sendValidationError(req, res, { body: `must be 1 to ${COMMENT_MAX} characters` });
  }
  const id = (db.get('comments').maxBy('id').value()?.id ?? 0) + 1;
  // ⚠️ Stored as-is (no HTML escaping): escaping is the job of whoever RENDERS it (S26, S35).
  const comment = { id, taskId: task.id, authorId: req.user.id, body, createdAt: new Date().toISOString() };
  db.get('comments').push(comment).write();
  res.status(201).location(`/api/tasks/${task.id}/comments/${id}`).json(comment);
});

server.get('/api/categories', (req, res) => {
  res.json(db.get('categories').value());
});

server.get('/api/stats', (req, res) => {
  const tasks = db.get('tasks').filter((task) => canAccess(req.user, task)).value();
  const count = (key, values) => Object.fromEntries(values.map((v) => [v, tasks.filter((t) => t[key] === v).length]));
  res.json({ total: tasks.length, byStatus: count('status', TASK_STATUSES), byPriority: count('priority', PRIORITIES) });
});

// ── Fallbacks ────────────────────────────────────────────────────────────────

server.use('/api', (req, res) => sendError(req, res, 404, 'NOT_FOUND', `No endpoint ${req.method} ${req.originalUrl.split('?')[0]}`));

// Express error handler (4 arguments): malformed JSON bodies and unexpected crashes.
// eslint-disable-next-line no-unused-vars
server.use((err, req, res, _next) => {
  if (err.type === 'entity.parse.failed') {
    return sendError(req, res, 400, 'MALFORMED_JSON', 'Request body is not valid JSON');
  }
  console.error(err);
  sendError(req, res, 500, 'INTERNAL_ERROR', 'Unexpected server error'); // never leak stack traces
});

server.listen(PORT, () => {
  console.log(`TaskFlow mock API on http://localhost:${PORT}/api (secure mode: ${SECURE ? 'ON' : 'off'})`);
});
