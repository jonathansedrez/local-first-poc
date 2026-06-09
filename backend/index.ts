import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

type Todo = { id: string; text: string; done: boolean };

const todos: Todo[] = [];
const clients = new Set<express.Response>();

function broadcast(event: { type: string; payload: unknown }) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of clients) {
    client.write(data);
  }
}

app.get("/todos/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  clients.add(res);
  res.write(`data: ${JSON.stringify({ type: "init", payload: todos })}\n\n`);

  req.on("close", () => clients.delete(res));
});

app.post("/todos", (req, res) => {
  const { id, text, done } = req.body;
  const existing = todos.find((t) => t.id === id);
  if (existing) {
    Object.assign(existing, { text, done });
    broadcast({ type: "update", payload: existing });
    return res.status(200).json(existing);
  }
  const todo = { id, text, done };
  todos.push(todo);
  broadcast({ type: "insert", payload: todo });
  res.status(201).json(todo);
});

app.patch("/todos/:id", (req, res) => {
  const id = req.params.id;
  const todo = todos.find((t) => t.id === id);
  if (!todo) return res.status(404).json({ error: "Not found" });
  Object.assign(todo, req.body);
  broadcast({ type: "update", payload: todo });
  res.json(todo);
});

app.delete("/todos/:id", (req, res) => {
  const id = req.params.id;
  const index = todos.findIndex((t) => t.id === id);
  if (index === -1) return res.status(404).json({ error: "Not found" });
  todos.splice(index, 1);
  broadcast({ type: "delete", payload: { id } });
  res.status(204).send();
});

app.listen(3000, () => console.log("listening on http://localhost:3000"));
