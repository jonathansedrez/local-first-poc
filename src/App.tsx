import { makeAutoObservable } from "mobx";
import { observer, useLocalObservable } from "mobx-react-lite";

type Todo = { id: number; text: string; done: boolean };

class TodoStore {
  todos: Todo[] = [];
  input = "";

  constructor() {
    makeAutoObservable(this);
  }

  add = () => {
    const text = this.input.trim();
    if (!text) return;
    this.todos.push({ id: Date.now(), text, done: false });
    this.input = "";
  };

  toggle = (id: number) => {
    const todo = this.todos.find((t) => t.id === id);
    if (todo) todo.done = !todo.done;
  };

  remove = (id: number) => {
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
