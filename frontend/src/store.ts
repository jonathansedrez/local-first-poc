import { makeAutoObservable } from "mobx";
import { db } from "./db";
import { outboxQueue } from "./outbox";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

type Todo = { id: string; text: string; done: boolean };

export class TodoStore {
  todos: Todo[] = [];
  input = "";

  constructor() {
    makeAutoObservable(this);
  }

  load = async () => {
    const { rows } = await db.query<Todo>(
      "SELECT id, text, done FROM todos ORDER BY created_at ASC",
    );
    this.todos = rows;
  };

  add = async () => {
    const text = this.input.trim();
    if (!text) return;

    const id = crypto.randomUUID();
    const { rows } = await db.query<Todo>(
      `INSERT INTO todos (id, text, done) VALUES ($1, $2, false) RETURNING id, text, done`,
      [id, text],
    );
    const todo = rows[0];
    await outboxQueue.enqueue("insert", todo);
    outboxQueue.process(BACKEND_URL);

    this.todos.push(todo);
    this.input = "";
  };

  toggle = async (id: string) => {
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

  remove = async (id: string) => {
    await db.query(`DELETE FROM todos WHERE id = $1`, [id]);
    await outboxQueue.enqueue("delete", { id });
    outboxQueue.process(BACKEND_URL);

    this.todos = this.todos.filter((t) => t.id !== id);
  };
}

export const todoStore = new TodoStore();
