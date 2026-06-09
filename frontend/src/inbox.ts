import { db } from "./db";
import { todoStore } from "./store";

type Todo = { id: string; text: string; done: boolean };

type SseEvent =
  | { type: "init"; payload: Todo[] }
  | { type: "insert"; payload: Todo }
  | { type: "update"; payload: Todo }
  | { type: "delete"; payload: { id: string } };

export class InboxSync {
  private es: EventSource | null = null;

  connect(baseUrl: string) {
    this.es = new EventSource(`${baseUrl}/todos/events`);
    this.es.onmessage = async (e: MessageEvent) => {
      const event: SseEvent = JSON.parse(e.data);
      await this.apply(event);
      await todoStore.load();
    };
  }

  private apply = async (event: SseEvent) => {
    switch (event.type) {
      case "init": {
        await db.query("DELETE FROM todos");
        for (const todo of event.payload) {
          await db.query(
            `INSERT INTO todos (id, text, done) VALUES ($1, $2, $3)`,
            [todo.id, todo.text, todo.done],
          );
        }
        break;
      }
      case "insert": {
        // Our own outbox already inserted this locally; skip if present
        await db.query(
          `INSERT INTO todos (id, text, done) VALUES ($1, $2, $3)
           ON CONFLICT (id) DO NOTHING`,
          [event.payload.id, event.payload.text, event.payload.done],
        );
        break;
      }
      case "update": {
        const { id, text, done } = event.payload;
        await db.query(
          `UPDATE todos SET text = $2, done = $3, updated_at = NOW() WHERE id = $1`,
          [id, text, done],
        );
        break;
      }
      case "delete": {
        await db.query(`DELETE FROM todos WHERE id = $1`, [event.payload.id]);
        break;
      }
    }
  };

  disconnect() {
    this.es?.close();
    this.es = null;
  }
}

export const inboxSync = new InboxSync();
