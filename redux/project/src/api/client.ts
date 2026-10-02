// GIVEN (not part of the course): a fake server. It keeps the todos in memory and answers after a delay,
// like a real HTTP API would. `client.get` / `client.post` return Promises, exactly like `fetch` does.

export interface ServerTodo {
  id: number;
  text: string;
  completed: boolean;
  color: string;
}

const db = {
  todos: [
    { id: 1, text: 'Learn Redux', completed: true, color: 'green' },
    { id: 2, text: 'Build the todo app', completed: false, color: 'blue' },
  ] as ServerTodo[],
  nextId: 3,
};

let latencies: number[] = []; // test knob: the delays (ms) of the next requests, e.g. [600, 100]
let failNextPost = false; // test knob: make the next POST fail

function answer<T>(ms: number, work: () => T): Promise<T> {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      try {
        resolve(structuredClone(work())); // a COPY, like JSON coming over the network
      } catch (error) {
        reject(error);
      }
    }, ms),
  );
}

export const client = {
  get(url: string): Promise<{ todos: ServerTodo[] }> {
    const ms = latencies.shift() ?? 300;
    console.log(`  🌐 server: GET ${url} (answers in ${ms} ms)`);
    return answer(ms, () => {
      if (url !== '/fakeApi/todos') throw new Error(`404: ${url}`);
      return { todos: db.todos };
    });
  },

  post(url: string, body: { todo: { text: string } }): Promise<{ todo: ServerTodo }> {
    const ms = latencies.shift() ?? 300;
    console.log(`  🌐 server: POST ${url} ${JSON.stringify(body)} (answers in ${ms} ms)`);
    const shouldFail = failNextPost;
    failNextPost = false;
    return answer(ms, () => {
      if (shouldFail) throw new Error('500: the server could not save the todo');
      const todo: ServerTodo = { id: db.nextId++, text: body.todo.text, completed: false, color: '' };
      db.todos.push(todo);
      return { todo };
    });
  },
};

// Test knobs used by some demos.
export const server = {
  setNextLatencies(list: number[]) {
    latencies = [...list];
  },
  failNextPost() {
    failNextPost = true;
  },
};
