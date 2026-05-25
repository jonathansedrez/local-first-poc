import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const todos: { id: string; text: string; done: boolean }[] = [];

app.post("/todos", (req, res) => {
  const { id, text, done } = req.body;
  const todo = { id, text, done };
  todos.push(todo);
  res.status(201).json(todo);
});

app.patch("/todos/:id", (req, res) => {
  const id = req.params.id;
  const todo = todos.find((t) => t.id === id);
  if (!todo) return res.status(404).json({ error: "Not found" });
  Object.assign(todo, req.body);
  res.json(todo);
});

app.delete("/todos/:id", (req, res) => {
  const id = req.params.id;
  const index = todos.findIndex((t) => t.id === id);
  if (index === -1) return res.status(404).json({ error: "Not found" });
  todos.splice(index, 1);
  res.status(204).send();
});

app.listen(3000, () => console.log("listening on http://localhost:3000"));
