// M3 Dynamic Color — generates a tonal palette from a seed color
// Uses HSL approximation of HCT (Hue-Chroma-Tone) color space
// In production, this would use the material-color-utilities package

type Tone = 0 | 10 | 20 | 25 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 95 | 98 | 99 | 100

// Convert hex to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break
      case g: h = ((b - r) / d + 2) * 60; break
      case b: h = ((r - g) / d + 4) * 60; break
    }
  }
  return { h, s: s * 100, l: l * 100 }
}

// Convert HSL to hex
function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0')
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}

// Generate a tonal palette from a hue + chroma
function tone(hue: number, saturation: number, tone: Tone): string {
  // M3 tone scale maps to lightness approximately:
  // tone 0 = 0%, 10 = 10%, 20 = 20%, 25 = 25%, 30 = 30%, 40 = 40%,
  // 50 = 50%, 60 = 60%, 70 = 70%, 80 = 80%, 90 = 90%, 95 = 95%, 98 = 98%, 99 = 99%, 100 = 100%
  // But M3 uses different curves for dark vs light mode
  // Dark mode: tones 20-40 are containers, 80-90 are the accent colors
  // Light mode: tones 40-50 are accents, 80-90 are containers

  const l = tone
  // Reduce saturation for very light/dark tones
  const s = tone < 20 || tone > 90 ? saturation * 0.5 : saturation
  return hslToHex(hue, s, l)
}

export type M3Palette = {
  primary: string
  onPrimary: string
  primaryContainer: string
  onPrimaryContainer: string
  secondary: string
  onSecondary: string
  secondaryContainer: string
  onSecondaryContainer: string
  tertiary: string
  onTertiary: string
  tertiaryContainer: string
  onTertiaryContainer: string
}

// Generate a full M3 palette from a seed color
export function generatePalette(seedHex: string): M3Palette {
  const { h, s } = hexToHsl(seedHex)

  // Primary = seed color's hue
  // Secondary = analogous hue (shifted 30 degrees)
  // Tertiary = complementary-adjacent (shifted 150 degrees)
  const primaryHue = h
  const secondaryHue = (h + 30) % 360
  const tertiaryHue = (h + 150) % 360

  // Chroma (saturation) — M3 typically uses 30-50 for secondary, 60-80 for primary
  const chroma = Math.min(s, 70)

  return {
    // Primary
    primary: tone(primaryHue, chroma, 80),
    onPrimary: tone(primaryHue, chroma, 20),
    primaryContainer: tone(primaryHue, chroma, 30),
    onPrimaryContainer: tone(primaryHue, chroma, 90),
    // Secondary
    secondary: tone(secondaryHue, chroma * 0.6, 80),
    onSecondary: tone(secondaryHue, chroma * 0.6, 20),
    secondaryContainer: tone(secondaryHue, chroma * 0.6, 30),
    onSecondaryContainer: tone(secondaryHue, chroma * 0.6, 90),
    // Tertiary
    tertiary: tone(tertiaryHue, chroma * 0.8, 80),
    onTertiary: tone(tertiaryHue, chroma * 0.8, 20),
    tertiaryContainer: tone(tertiaryHue, chroma * 0.8, 30),
    onTertiaryContainer: tone(tertiaryHue, chroma * 0.8, 90),
  }
}

// Apply a palette to CSS custom properties (dark mode)
export function applyPalette(palette: M3Palette) {
  const root = document.documentElement
  root.style.setProperty('--primary', palette.primary)
  root.style.setProperty('--on-primary', palette.onPrimary)
  root.style.setProperty('--primary-container', palette.primaryContainer)
  root.style.setProperty('--on-primary-container', palette.onPrimaryContainer)
  root.style.setProperty('--secondary', palette.secondary)
  root.style.setProperty('--on-secondary', palette.onSecondary)
  root.style.setProperty('--secondary-container', palette.secondaryContainer)
  root.style.setProperty('--on-secondary-container', palette.onSecondaryContainer)
  root.style.setProperty('--tertiary', palette.tertiary)
  root.style.setProperty('--on-tertiary', palette.onTertiary)
  root.style.setProperty('--tertiary-container', palette.tertiaryContainer)
  root.style.setProperty('--on-tertiary-container', palette.onTertiaryContainer)
}

// Reset to default palette
export function resetPalette() {
  const root = document.documentElement
  const props = [
    '--primary', '--on-primary', '--primary-container', '--on-primary-container',
    '--secondary', '--on-secondary', '--secondary-container', '--on-secondary-container',
    '--tertiary', '--on-tertiary', '--tertiary-container', '--on-tertiary-container',
  ]
  props.forEach((p) => root.style.removeProperty(p))
}

// Preset seed colors
export const SEED_PRESETS = [
  { name: 'Forest', color: '#2E7D5B' },
  { name: 'Ocean', color: '#0061A4' },
  { name: 'Sunset', color: '#B5394A' },
  { name: 'Amber', color: '#825500' },
  { name: 'Violet', color: '#6B4Eff' },
  { name: 'Teal', color: '#00696D' },
  { name: 'Coral', color: '#A8395C' },
  { name: 'Lime', color: '#4D6B00' },
]
