// The todos slice: its types, state, action creators, reducer, thunks and selectors.
// (Later lectures add imports at the top of this file.)

// 🧩 03.1: the types and the initial state (lecture 03, step 1).
export interface Todo {
  readonly id: number,
  readonly text: string,
  completed: boolean,
  color: string,
}
export type TodosState = Todo[];
const initialState: TodosState = [];
// 🧩 10.1: the action creators (lecture 10, step 1).

// 🧩 03.2: the action types and the reducer (lecture 03, step 2). Replace this stub.

export type TodosAction =
  | { type: 'todos/todoAdded'; payload: string }
  | { type: 'todos/todoToggled'; payload: number }
  | { type: 'todos/colorSelected'; payload: { todoId: number; color: string } }
  | { type: 'todos/todoDeleted'; payload: number }
  | { type: 'todos/completedCleared' };

function nextTodoId(todos: TodosState): number {
  const maxId = todos.reduce((max, todo) => Math.max(todo.id, max), 0);
  return maxId + 1;
}

export function todosReducer(state: TodosState = initialState, action: TodosAction): TodosState {
  switch (action.type) {
    case 'todos/todoAdded':
      return [...state, { id: nextTodoId(state), text: action.payload, completed: false, color: '' }];
    case 'todos/todoToggled':
      return state.map((todo) => (todo.id === action.payload ? { ...todo, completed: !todo.completed } : todo));
    case 'todos/colorSelected': {
      const { todoId, color } = action.payload;
      return state.map((todo) => (todo.id === todoId ? { ...todo, color } : todo));
    }
    case 'todos/todoDeleted':
      return state.filter((todo) => todo.id !== action.payload);
    case 'todos/completedCleared':
      return state.filter((todo) => !todo.completed);
    default:
      return state;
  }
}

// 🧩 09.4: the thunks (lecture 09, step 4).

// 🧩 07.1: the first selectors (lecture 07, step 1).

// 🧩 10.4: the filtered-list selectors (lecture 10, step 4).
