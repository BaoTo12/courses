// 🧩 01.1: this lecture's demo (lecture 01, step 1). Replace both lines with the code from the lecture.
console.log('— Part A: every view keeps its own copy —');

const listView = {
    todos: ['Learn Redux'],
    render() {
        console.log(`  🖥  list:   ${this.todos.join(', ')}`);
    },
};
const footerView = {
    remaining: 1,
    render() {
        console.log(`  🖥  footer: ${this.remaining} item(s) left`);
    },
};

function onAddClicked(text: string): void {
    console.log(`⚡ user adds "${text}"`);
    listView.todos.push(text); // the list's copy is updated…
    listView.render();
    footerView.render(); // …but nobody updated the footer's copy
}

onAddClicked('Walk the dog');

console.log('\n— Part B: one state, one-way data flow —');

type AppEvent = { type: 'todoAdded'; text: string } | { type: 'todoCompleted'; index: number };

const state = { todos: [{ text: 'Learn Redux', completed: false }] };

function render(): void {
    const remaining = state.todos.filter((todo) => !todo.completed).length;
    console.log(`  🖥  list:   ${state.todos.map((todo) => todo.text).join(', ')}`);
    console.log(`  🖥  footer: ${remaining} item(s) left`);
}

function handle(event: AppEvent): void {
    console.log(`⚡ event: ${JSON.stringify(event)}`);
    if (event.type === 'todoAdded') {
        state.todos.push({ text: event.text, completed: false });
    }
    if (event.type === 'todoCompleted') {
        state.todos[event.index].completed = true;
    }
    render(); // the view is drawn again FROM the state
}

render();
handle({ type: 'todoAdded', text: 'Walk the dog' });
handle({ type: 'todoCompleted', index: 0 });