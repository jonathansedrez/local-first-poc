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

  process = async (upstreamUrl: string) => {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const { rows } = await db.query<OutboxEntry>(
        `UPDATE outbox SET status = 'sending'
         WHERE status = 'pending'
         RETURNING *`,
      );

      for (const entry of rows) {
        try {
          await fetch(upstreamUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              operation: entry.operation,
              payload: entry.payload,
            }),
          });
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
