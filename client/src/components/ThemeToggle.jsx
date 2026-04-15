import { setTheme } from "../themes/applyTheme";

export default function ThemeToggle() {
  return (
    <div>
      <button onClick={() => setTheme("light")}>Light</button>
      <button onClick={() => setTheme("dark")}>Dark</button>
    </div>
  );
}