import { nyxBaseTheme } from "./nyx-base/theme";
import type { SiteTheme } from "./theme-types";

export const themes = {
  [nyxBaseTheme.id]: nyxBaseTheme,
} satisfies Record<string, SiteTheme>;

export type ThemeId = keyof typeof themes;
export const DEFAULT_THEME_ID: ThemeId = "nyx-base";

export function getTheme(id?: string): SiteTheme {
  if (id && id in themes) return themes[id as ThemeId];
  return themes[DEFAULT_THEME_ID];
}
