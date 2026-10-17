import type { CardConfig, Theme } from "./types";

export function isValidTheme(config: CardConfig, themeId?: string): themeId is string {
  return !!themeId && config.themes.some((t) => t.id === themeId);
}

export function getTheme(config: CardConfig, themeId?: string): Theme {
  const id = isValidTheme(config, themeId) ? themeId : config.defaultThemeId;
  const theme = config.themes.find((t) => t.id === id);
  if (!theme) {
    throw new Error(`Card "${config.id}" has no theme "${id}"`);
  }
  return theme;
}
