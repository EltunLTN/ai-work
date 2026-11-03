"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type ThemeMode = "dark" | "light";

function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute("data-theme", mode);
  window.localStorage.setItem("kairo.theme", mode);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    queueMicrotask(() => {
      const stored = document.documentElement.getAttribute("data-theme");
      setTheme(stored === "dark" ? "dark" : "light");
    });
  }, []);

  function toggle() {
    const next: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  return (
    <Button variant="secondary" size="sm" onClick={toggle} aria-label="Theme dəyiş">
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
