import { makeAutoObservable } from "mobx";
import { observer, useLocalObservable } from "mobx-react-lite";
import { db } from "./db";
import { outboxQueue } from "./outbox";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

type Todo = { id: number; text: string; done: boolean };

class TodoStore {
  todos: Todo[] = [];
  input = "";

  constructor() {
    makeAutoObservable(this);
  }

  add = async () => {
    const text = this.input.trim();
    if (!text) return;

    const { rows } = await db.query<Todo>(
      `INSERT INTO todos (text, done) VALUES ($1, false) RETURNING id, text, done`,
      [text],
    );
    const todo = rows[0];
    await outboxQueue.enqueue("insert", todo);
    outboxQueue.process(BACKEND_URL);

    this.todos.push(todo);
    this.input = "";
  };

  toggle = async (id: number) => {
    const todo = this.todos.find((t) => t.id === id);
    if (!todo) return;

    const done = !todo.done;

    await db.query(
      `UPDATE todos SET done = $1, updated_at = NOW() WHERE id = $2`,
      [done, id],
    );
    await outboxQueue.enqueue("update", { id, done });
    outboxQueue.process(BACKEND_URL);

    todo.done = done;
  };

  remove = async (id: number) => {
    await db.query(`DELETE FROM todos WHERE id = $1`, [id]);
    await outboxQueue.enqueue("delete", { id });
    outboxQueue.process(BACKEND_URL);

    this.todos = this.todos.filter((t) => t.id !== id);
  };
}

const App = observer(() => {
  const store = useLocalObservable(() => new TodoStore());

  return (
    <div>
      <h1>Todo</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          store.add();
        }}
      >
        <input
          value={store.input}
          onChange={(e) => {
            store.input = e.target.value;
          }}
          placeholder="Add a task..."
        />
        <button type="submit">Add</button>
      </form>
      <ul>
        {store.todos.map((t) => (
          <li key={t.id}>
            <input
              type="checkbox"
              checked={t.done}
              onChange={() => store.toggle(t.id)}
            />
            <span style={{ textDecoration: t.done ? "line-through" : "none" }}>
              {t.text}
            </span>
            <button onClick={() => store.remove(t.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
});

export default App;
