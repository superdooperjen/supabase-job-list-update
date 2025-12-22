"use client";

import { useTheme } from "./ThemeProvider";
import { Button } from "./ui/button";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="border-slate-700 bg-slate-800/50 hover:bg-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-700 light:border-slate-300 light:bg-white light:hover:bg-slate-100"
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 text-yellow-400" />
      ) : (
        <Moon className="h-5 w-5 text-slate-600" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
