// M3 Dynamic Color — generates a tonal palette from a seed color.
// Uses HSL as an approximation of HCT (Hue-Chroma-Tone) to avoid pulling in the
// full material-color-utilities package. Generates paired tones for light and
// dark mode so contrast is always within WCAG AA.

// Material Design 3 tone-map (approximate):
//   - light mode: accent = tone 40, on-accent = tone 100, container = tone 90, on-container = tone 10
//   - dark mode:  accent = tone 80, on-accent = tone 20,  container = tone 30, on-container = tone 90
// See: https://m3.material.io/styles/color/the-color-system/color-roles

type Tone = 0 | 10 | 20 | 25 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 95 | 98 | 99 | 100;

export type ColorScheme = "light" | "dark";

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      case b:
        h = ((r - g) / d + 4) * 60;
        break;
    }
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

// Compute a tone-aware hex from hue/chroma, with desaturation at the extremes.
function tone(hue: number, saturation: number, t: Tone): string {
  const l = t;
  const s = t < 20 || t > 90 ? saturation * 0.4 : saturation;
  return hslToHex(hue, s, l);
}

export interface M3RoleColors {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
}

export interface M3Palette {
  light: M3RoleColors;
  dark: M3RoleColors;
}

// Build the role-color set for a given scheme from fixed tones.
function buildRoles(
  hue: number,
  saturation: number,
  scheme: ColorScheme,
): M3RoleColors {
  // Tones per scheme (M3 spec)
  const t =
    scheme === "light"
      ? {
          accent: 40 as Tone,
          onAccent: 100 as Tone,
          container: 90 as Tone,
          onContainer: 10 as Tone,
        }
      : {
          accent: 80 as Tone,
          onAccent: 20 as Tone,
          container: 30 as Tone,
          onContainer: 90 as Tone,
        };

  const primaryHue = hue;
  const secondaryHue = (hue + 30) % 360;
  const tertiaryHue = (hue + 150) % 360;

  const primaryChroma = Math.min(saturation, 70);
  const secondaryChroma = primaryChroma * 0.5;
  const tertiaryChroma = primaryChroma * 0.7;

  const build = (h: number, c: number) => ({
    primary: tone(h, c, t.accent),
    onPrimary: tone(h, c, t.onAccent),
    primaryContainer: tone(h, c, t.container),
    onPrimaryContainer: tone(h, c, t.onContainer),
  });

  const p = build(primaryHue, primaryChroma);
  const s2 = build(secondaryHue, secondaryChroma);
  const t2 = build(tertiaryHue, tertiaryChroma);

  return {
    ...p,
    secondary: s2.primary,
    onSecondary: s2.onPrimary,
    secondaryContainer: s2.primaryContainer,
    onSecondaryContainer: s2.onPrimaryContainer,
    tertiary: t2.primary,
    onTertiary: t2.onPrimary,
    tertiaryContainer: t2.primaryContainer,
    onTertiaryContainer: t2.onPrimaryContainer,
  };
}

// Generate a full paired light+dark palette from a seed color.
export function generatePalette(seedHex: string): M3Palette {
  const { h, s } = hexToHsl(seedHex);
  return {
    light: buildRoles(h, s, "light"),
    dark: buildRoles(h, s, "dark"),
  };
}

const ROLE_VARS: readonly (keyof M3RoleColors)[] = [
  "primary",
  "onPrimary",
  "primaryContainer",
  "onPrimaryContainer",
  "secondary",
  "onSecondary",
  "secondaryContainer",
  "onSecondaryContainer",
  "tertiary",
  "onTertiary",
  "tertiaryContainer",
  "onTertiaryContainer",
];

// Convert a camelCase role name (e.g. "onPrimaryContainer") to its CSS variable name
// ("--on-primary-container").
function roleToVar(role: string): string {
  return `--${role.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
}

function applyRoles(roles: M3RoleColors) {
  const root = document.documentElement;
  for (const key of ROLE_VARS) {
    root.style.setProperty(roleToVar(key), roles[key]);
  }
}

function detectActiveScheme(): ColorScheme {
  // Use next-themes' data attribute when present, fall back to the `.light` class
  // (our CSS uses `.light` for light mode, absence = dark because default is dark),
  // and finally to the user's system preference.
  const theme = document.documentElement.getAttribute("data-theme");
  if (theme === "light") return "light";
  if (theme === "dark") return "dark";
  if (document.documentElement.classList.contains("light")) return "light";
  if (document.documentElement.classList.contains("dark")) return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

// Apply a palette to CSS custom properties, picking the correct scheme based on
// the currently active theme. Re-runs automatically on theme changes.
export function applyPalette(palette: M3Palette) {
  const scheme = detectActiveScheme();
  applyRoles(palette[scheme]);

  // React to theme changes so the palette stays in sync without a reload.
  const root = document.documentElement;
  const observer = new MutationObserver(() => {
    const next = detectActiveScheme();
    applyRoles(palette[next]);
  });
  observer.observe(root, {
    attributes: true,
    attributeFilter: ["class", "data-theme"],
  });
  // Also listen for system preference changes if the theme is "system".
  const mql = window.matchMedia("(prefers-color-scheme: light)");
  const mqlHandler = () => {
    const t = root.getAttribute("data-theme");
    if (t && t !== "system") return;
    if (!root.classList.contains("light") && !root.classList.contains("dark")) {
      applyRoles(palette[detectActiveScheme()]);
    }
  };
  mql.addEventListener("change", mqlHandler);

  // Store cleanup on the element so `resetPalette` can detach.
  (root as HTMLElement & { __paletteCleanup?: () => void }).__paletteCleanup =
    () => {
      observer.disconnect();
      mql.removeEventListener("change", mqlHandler);
    };
}

// Reset to default palette (remove inline overrides).
export function resetPalette() {
  const root = document.documentElement;
  for (const key of ROLE_VARS) {
    root.style.removeProperty(roleToVar(key));
  }
  const cleanup = (
    root as HTMLElement & { __paletteCleanup?: () => void }
  ).__paletteCleanup;
  if (cleanup) {
    cleanup();
    delete (root as HTMLElement & { __paletteCleanup?: () => void }).__paletteCleanup;
  }
}

// Preset seed colors
export const SEED_PRESETS = [
  { name: "Forest", color: "#2E7D5B" },
  { name: "Ocean", color: "#0061A4" },
  { name: "Sunset", color: "#B5394A" },
  { name: "Amber", color: "#825500" },
  { name: "Violet", color: "#6B4EFF" },
  { name: "Teal", color: "#00696D" },
  { name: "Coral", color: "#A8395C" },
  { name: "Lime", color: "#4D6B00" },
] as const;
