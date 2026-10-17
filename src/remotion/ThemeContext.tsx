import { createContext, useContext } from "react";
import type { Theme } from "@/lib/types";

export const ThemeContext = createContext<Theme | null>(null);

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error("useTheme must be used inside a ThemeContext.Provider");
  }
  return theme;
}
