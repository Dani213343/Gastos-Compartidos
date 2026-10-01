import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

// Opcional: soportar 'system' para seguir el SO del usuario
const getInitialTheme = () => {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark" || saved === "system") return saved;
  return "light";
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme()); // 'light' | 'dark' | 'system'

  // Aplica/remueve la clase dark en <html>
  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const effective = theme === "system" ? (prefersDark ? "dark" : "light") : theme;

    root.classList.toggle("dark", effective === "dark");
    localStorage.setItem("theme", theme);

    // Escuchar cambios del SO si elegimos 'system'
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = () => {
        const isDark = mq.matches;
        root.classList.toggle("dark", isDark);
      };
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    }
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
