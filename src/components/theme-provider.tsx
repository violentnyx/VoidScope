"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { SiteTheme } from "@/themes/theme-types";

const ThemeContext = createContext<SiteTheme | null>(null);

export function ThemeProvider({ theme, children }: { theme: SiteTheme; children: ReactNode }) {
  const value = useMemo(() => theme, [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useSiteTheme(): SiteTheme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useSiteTheme must be used inside ThemeProvider");
  return theme;
}
