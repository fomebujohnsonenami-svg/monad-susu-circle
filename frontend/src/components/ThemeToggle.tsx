"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  return (
    <button
      type="button"
      className="btn btn-ghost btn-icon theme-toggle"
      onClick={toggleTheme}
      aria-label={
        mounted && theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
      title={mounted && theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {!mounted ? (
        <Sun className="icon" />
      ) : theme === "dark" ? (
        <Sun className="icon" />
      ) : (
        <Moon className="icon" />
      )}
    </button>
  );
}
