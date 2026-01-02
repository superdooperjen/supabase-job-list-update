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
      className="border-stone-700 bg-stone-200/50 hover:bg-stone-500 dark:border-stone-700 dark:bg-stone-800/50 dark:hover:bg-stone-700 light:border-stone-300 light:bg-white light:hover:bg-stone-100"
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 text-yellow-400" />
      ) : (
        <Moon className="h-5 w-5 text-stone-600" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
