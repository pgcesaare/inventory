import { Moon, Sun } from "lucide-react"
import { useAppContext } from "../context"

const ThemeToggle = () => {
  const { theme, toggleTheme } = useAppContext()
  const isDark = theme === "dark"

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="
        inline-flex items-center justify-center gap-2
        px-3 py-2
        rounded-xl
        border border-primary-border/40
        bg-surface
        text-primary-text
        hover:bg-primary-border/10
        transition-colors duration-200
        cursor-pointer
      "
      aria-label="Toggle dark mode"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="text-xs font-medium">{isDark ? "Light" : "Dark"}</span>
    </button>
  )
}

export default ThemeToggle
