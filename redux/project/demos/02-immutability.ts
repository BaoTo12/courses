// Lecture 02 demo: references, mutation, and immutable updates.
import { deepFreeze } from '../src/utils/deepFreeze';


console.log('— 1. Two variables, one object —');
const a = { text: 'Learn Redux' };
const b = a; // copies the REFERENCE, not the object
b.text = 'Learn Redux today';
console.log('  a.text =', a.text);
console.log('  a === b →', a === b);

console.log('\n— 2. Mutation: the same array, changed inside —');
const todos = [{ id: 1, text: 'Learn Redux', completed: false }];
const before = todos;
todos.push({ id: 2, text: 'Walk the dog', completed: false });
console.log('  length now =', todos.length);
console.log('  before === todos →', before === todos, '(=== cannot see the change)');

console.log('\n— 3. Immutable update: a NEW array —');
const list1 = [{ id: 1, text: 'Learn Redux', completed: false }];
const list2 = [...list1, { id: 2, text: 'Walk the dog', completed: false }];
console.log('  list1.length =', list1.length, '| list2.length =', list2.length);
console.log('  list1 === list2 →', list1 === list2, '(=== sees the change)');

console.log('\n— 4. Nested update: toggle todo 2 —');
const after = list2.map((todo) => (todo.id === 2 ? { ...todo, completed: true } : todo));
console.log('  list2[1].completed =', list2[1].completed, '| after[1].completed =', after[1].completed);
console.log('  after[0] === list2[0] →', after[0] === list2[0], '(untouched todo: SHARED, not copied)');
console.log('  after[1] === list2[1] →', after[1] === list2[1], '(changed todo: a new object)');

console.log('\n— 5. The shallow-copy trap —');
type DemoState = { filters: { status: string; colors: string[] } };
const state: DemoState = { filters: { status: 'all', colors: [] } };
const wrongCopy = { ...state }; // copies ONE level only
wrongCopy.filters.colors.push('red');
console.log('  state.filters.colors =', state.filters.colors, '(the original changed too!)');

const state2: DemoState = { filters: { status: 'all', colors: [] } };
const rightCopy = { ...state2, filters: { ...state2.filters, colors: [...state2.filters.colors, 'red'] } };
console.log('  state2.filters.colors =', state2.filters.colors, '| rightCopy.filters.colors =', rightCopy.filters.colors);

console.log('\n— 6. deepFreeze: make mutation impossible —');
const frozen = deepFreeze([{ id: 1, text: 'Learn Redux', completed: false }]);
try {
    frozen[0].completed = true;
} catch (error) {
    console.log('  ❌ frozen[0].completed = true →', (error as Error).message);
}
try {
    frozen.push({ id: 2, text: 'Walk the dog', completed: false });
} catch (error) {
    console.log('  ❌ frozen.push(…) →', (error as Error).message);
}
const copy = frozen.map((todo) => ({ ...todo, completed: true }));
console.log('  ✅ a copy works: copy[0].completed =', copy[0].completed, '| frozen[0].completed =', frozen[0].completed);