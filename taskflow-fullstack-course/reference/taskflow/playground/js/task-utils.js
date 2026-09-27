// task-utils.js: pure functions over an array of task objects.
// Rules: never mutate the input; always return new arrays/objects for changed data.

/** Return a new array with `task` appended. */
export function addTask(tasks, task) {
  return [...tasks, task];
}

/** Return a new array without the task whose id matches. */
export function removeTask(tasks, id) {
  return tasks.filter((task) => task.id !== id);
}

/** Toggle a task between DONE and TODO. Other tasks keep their identity (same reference). */
export function toggleTask(tasks, id) {
  return tasks.map((task) =>
    task.id === id
      ? { ...task, status: task.status === 'DONE' ? 'TODO' : 'DONE' }
      : task,
  );
}

/** Filter by optional status, priority and case-insensitive text query. */
export function filterTasks(tasks, { status, priority, q } = {}) {
  const query = q?.trim().toLowerCase();
  return tasks.filter(
    (task) =>
      (!status || task.status === status) &&
      (!priority || task.priority === priority) &&
      (!query || task.title.toLowerCase().includes(query)),
  );
}

const PRIORITY_RANK = { LOW: 1, MEDIUM: 2, HIGH: 3 };

/** Return a NEW sorted array. key: 'title' | 'priority' | 'dueDate'. */
export function sortTasks(tasks, key, direction = 'asc') {
  const factor = direction === 'desc' ? -1 : 1;
  return tasks.toSorted((a, b) => {
    let result;
    if (key === 'priority') {
      result = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    } else if (key === 'dueDate') {
      // tasks without a due date go last, regardless of direction
      if (a.dueDate === b.dueDate) return 0;
      if (a.dueDate === null) return 1;
      if (b.dueDate === null) return -1;
      result = a.dueDate.localeCompare(b.dueDate);
    } else {
      result = a.title.localeCompare(b.title);
    }
    return result * factor;
  });
}

// ── Exercise solutions (04.14) ────────────────────────────────────────────

/** Return a new array where one field of one task is replaced. */
export function updateTaskField(tasks, id, field, value) {
  return tasks.map((task) => (task.id === id ? { ...task, [field]: value } : task));
}

/** Group tasks into { TODO: [...], IN_PROGRESS: [...], DONE: [...] }. */
export function groupByStatus(tasks) {
  const groups = { TODO: [], IN_PROGRESS: [], DONE: [] };
  for (const task of tasks) {
    groups[task.status].push(task); // mutating OUR new object is fine; the input is untouched
  }
  return groups;
}
