import '../../styles/main.scss';
import { filterTasks, toggleTask } from './task-utils.js';

// ── State: plain module variables ──────────────────────────────────────────
let tasks = [];
let statusFilter = '';

// ── DOM references ─────────────────────────────────────────────────────────
const listEl = document.querySelector('#task-list');
const countEl = document.querySelector('#count');
const messageEl = document.querySelector('#message');
const filtersEl = document.querySelector('#filters');

const STATUS_LABEL = { TODO: 'To do', IN_PROGRESS: 'In progress', DONE: 'Done' };
const toKebab = (value) => value.toLowerCase().replaceAll('_', '-');

// ── Rendering: build DOM nodes from data ───────────────────────────────────
function createCard(task) {
  const card = document.createElement('article');
  card.className = `card card--priority-${toKebab(task.priority)}`;

  const title = document.createElement('h3');
  title.className = 'card__title';
  title.textContent = task.title; // textContent: the title is treated as TEXT, never as HTML

  const body = document.createElement('p');
  body.className = 'card__body';
  body.textContent = task.description;

  const meta = document.createElement('footer');
  meta.className = 'card__meta';

  const badge = document.createElement('span');
  badge.className = `badge badge--${toKebab(task.status)}`;
  badge.textContent = STATUS_LABEL[task.status];

  const toggle = document.createElement('button');
  toggle.className = 'btn btn--secondary btn--sm';
  toggle.textContent = task.status === 'DONE' ? 'Reopen' : 'Mark done';
  toggle.dataset.id = String(task.id);

  meta.append(badge, toggle);
  card.append(title, body, meta);
  return card;
}

function render() {
  const visible = filterTasks(tasks, { status: statusFilter || undefined });
  listEl.replaceChildren(...visible.map(createCard)); // throw away old nodes, insert new ones
  countEl.textContent = `(${visible.length}/${tasks.length})`;
  messageEl.textContent = visible.length === 0 ? 'No tasks match this filter.' : '';

  for (const button of filtersEl.querySelectorAll('button')) {
    button.classList.toggle('btn--primary', button.dataset.status === statusFilter);
    button.classList.toggle('btn--secondary', button.dataset.status !== statusFilter);
  }
}

// ── Events: update state, then re-render EVERYTHING by hand ────────────────
filtersEl.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  statusFilter = button.dataset.status;
  render();
});

listEl.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-id]');
  if (!button) return;
  tasks = toggleTask(tasks, Number(button.dataset.id));
  render();
});

// ── Load data ──────────────────────────────────────────────────────────────
async function load() {
  messageEl.textContent = 'Loading…';
  try {
    const response = await fetch('/db.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    tasks = data.tasks;
    render();
  } catch (error) {
    messageEl.textContent = `Could not load tasks: ${error.message}`;
  }
}

load();
