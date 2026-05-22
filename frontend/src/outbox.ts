import { makeAutoObservable } from "mobx";
import { db } from "./db";

type Operation = "insert" | "update" | "delete";
type Status = "pending" | "sending" | "failed";

export type OutboxEntry = {
  id: string;
  operation: Operation;
  payload: Record<string, unknown>;
  status: Status;
  created_at: string;
  error: string | null;
};

export class OutboxQueue {
  entries: OutboxEntry[] = [];
  isProcessing = false;

  constructor() {
    makeAutoObservable(this);
  }

  enqueue = async (operation: Operation, payload: Record<string, unknown>) => {
    const { rows } = await db.query<OutboxEntry>(
      `INSERT INTO outbox (operation, payload)
       VALUES ($1, $2)
       RETURNING *`,
      [operation, JSON.stringify(payload)],
    );
    this.entries.push(rows[0]);
  };

  process = async (baseUrl: string) => {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const { rows } = await db.query<OutboxEntry>(
        `SELECT * FROM outbox WHERE status = 'pending' ORDER BY created_at ASC`,
      );

      for (const entry of rows) {
        await db.query(`UPDATE outbox SET status = 'sending' WHERE id = $1`, [
          entry.id,
        ]);
        const inMemory = this.entries.find((e) => e.id === entry.id);
        if (inMemory) inMemory.status = "sending";

        try {
          await this.send(baseUrl, entry);
          await this.markSent(entry.id);
        } catch (err) {
          await this.markFailed(
            entry.id,
            err instanceof Error ? err.message : String(err),
          );
        }
      }
    } finally {
      this.isProcessing = false;
    }
  };

  private send = async (baseUrl: string, entry: OutboxEntry) => {
    const { operation, payload } = entry;
    const id = payload.id;

    const res = await (operation === "insert"
      ? fetch(`${baseUrl}/todos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : operation === "update"
        ? fetch(`${baseUrl}/todos/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : fetch(`${baseUrl}/todos/${id}`, { method: "DELETE" }));

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  };

  markSent = async (id: string) => {
    await db.query(`DELETE FROM outbox WHERE id = $1`, [id]);
    this.entries = this.entries.filter((e) => e.id !== id);
  };

  markFailed = async (id: string, error: string) => {
    await db.query(
      `UPDATE outbox SET status = 'failed', error = $1 WHERE id = $2`,
      [error, id],
    );
    const entry = this.entries.find((e) => e.id === id);
    if (entry) {
      entry.status = "failed";
      entry.error = error;
    }
  };
}

export const outboxQueue = new OutboxQueue();
