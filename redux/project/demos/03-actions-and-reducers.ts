// 🧩 03.4: this lecture's demo (lecture 03, step 4). Replace both lines with the code from the lecture.
// Lecture 03 demo: the todos reducer, called by hand.
import { deepFreeze } from '../src/utils/deepFreeze';
import { todosReducer, type TodosAction, type TodosState } from '../src/features/todos/todosSlice';

function show(todos: TodosState): void {
    if (todos.length === 0) console.log('    (no todos)');
    for (const todo of todos) {
        const color = todo.color ? ` (${todo.color})` : '';
        console.log(`    ${todo.completed ? '[x]' : '[ ]'} #${todo.id} ${todo.text}${color}`);
    }
}

console.log('— 1. The first call: there is no state yet —');
let state = todosReducer(undefined, { type: 'todos/completedCleared' });
show(state);

console.log('\n— 2. One action at a time —');
const actions: TodosAction[] = [
    { type: 'todos/todoAdded', payload: 'Learn Redux' },
    { type: 'todos/todoAdded', payload: 'Walk the dog' },
    { type: 'todos/todoToggled', payload: 1 },
    { type: 'todos/colorSelected', payload: { todoId: 2, color: 'blue' } },
];
for (const action of actions) {
    const before = deepFreeze(state); // if the reducer mutated `before`, this would throw
    state = todosReducer(before, action);
    const payload = 'payload' in action ? JSON.stringify(action.payload) : '';
    console.log(`  🧮 ${action.type} ${payload} → new array: ${state !== before}`);
}
show(state);

console.log('\n— 3. An action this reducer does not handle —');
// An action of ANOTHER part of the app. The reducer's type only accepts TodosAction, so we force it with `as`.
const otherAction = { type: 'filters/statusFilterChanged', payload: 'active' } as unknown as TodosAction;
const same = todosReducer(state, otherAction);
console.log('  same array returned:', same === state);

console.log('\n— 4. Replay: the state is the actions, "reduced" one by one —');
const allActions: TodosAction[] = [...actions, { type: 'todos/completedCleared' }];
const replayed = allActions.reduce(todosReducer, [] as TodosState);
show(replayed);

console.log('\n— 5. A reducer that mutates, caught by deepFreeze —');
function mutatingReducer(state: TodosState, action: TodosAction): TodosState {
    if (action.type === 'todos/todoToggled') {
        const todo = state.find((t) => t.id === action.payload);
        if (todo) todo.completed = !todo.completed; // ✗ mutation
        return state;
    }
    return state;
}
try {
    mutatingReducer(deepFreeze(state), { type: 'todos/todoToggled', payload: 2 });
} catch (error) {
    console.log('  ❌', (error as Error).message);
}