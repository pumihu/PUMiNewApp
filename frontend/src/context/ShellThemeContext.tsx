import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ShellTheme = "graphite" | "olive" | "cloud";

interface ShellThemeContextValue {
  theme: ShellTheme;
  setTheme: (theme: ShellTheme) => void;
}

const STORAGE_KEY = "pumi_shell_theme";

const ShellThemeContext = createContext<ShellThemeContextValue | undefined>(undefined);

function resolveInitialTheme(): ShellTheme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "graphite" || stored === "olive" || stored === "cloud") {
    return stored;
  }
  return "cloud";
}

export function ShellThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ShellTheme>(resolveInitialTheme);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
    document.documentElement.setAttribute("data-pumi-theme", theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
    }),
    [theme],
  );

  return <ShellThemeContext.Provider value={value}>{children}</ShellThemeContext.Provider>;
}

export function useShellTheme() {
  const ctx = useContext(ShellThemeContext);
  if (!ctx) {
    throw new Error("useShellTheme must be used within ShellThemeProvider");
  }
  return ctx;
}
