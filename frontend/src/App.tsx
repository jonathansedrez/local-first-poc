import { observer } from "mobx-react-lite";
import { todoStore } from "./store";

const App = observer(() => {
  const store = todoStore;

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
