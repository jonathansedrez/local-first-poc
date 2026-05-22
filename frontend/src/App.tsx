import { makeAutoObservable } from "mobx";
import { observer, useLocalObservable } from "mobx-react-lite";
import { db } from "./db";

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

    const result = await db.transaction(async (tx) => {
      const { rows } = await tx.query<Todo>(
        `INSERT INTO todos (text, done) VALUES ($1, false) RETURNING id, text, done`,
        [text],
      );
      const todo = rows[0];
      await tx.query(
        `INSERT INTO outbox (operation, payload) VALUES ('insert', $1)`,
        [JSON.stringify(todo)],
      );
      return todo;
    });

    this.todos.push(result);
    this.input = "";
  };

  toggle = async (id: number) => {
    const todo = this.todos.find((t) => t.id === id);
    if (!todo) return;

    const done = !todo.done;

    await db.transaction(async (tx) => {
      await tx.query(
        `UPDATE todos SET done = $1, updated_at = NOW() WHERE id = $2`,
        [done, id],
      );
      await tx.query(
        `INSERT INTO outbox (operation, payload) VALUES ('update', $1)`,
        [JSON.stringify({ id, done })],
      );
    });

    todo.done = done;
  };

  remove = async (id: number) => {
    await db.transaction(async (tx) => {
      await tx.query(`DELETE FROM todos WHERE id = $1`, [id]);
      await tx.query(
        `INSERT INTO outbox (operation, payload) VALUES ('delete', $1)`,
        [JSON.stringify({ id })],
      );
    });

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
