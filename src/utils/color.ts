/**
 * Colour helpers for deriving translucent variants of theme tokens.
 *
 * Screens that fade an image into the page background need the background's
 * channels to build `rgba(...)` stops. Hardcoding those channels is how the
 * Qibla screen ended up fading to a colour the page never used, leaving a
 * visible seam — always derive them from the token.
 */

/** Parsed sRGB channels, 0–255. */
export type Rgb = readonly [number, number, number];

const FALLBACK: Rgb = [0, 0, 0];

/**
 * Parses `#RGB` or `#RRGGBB` into channels.
 *
 * Returns black for anything unparseable rather than throwing: a wrong colour
 * is a cosmetic fault, but a throw inside a render would blank the screen.
 */
export function hexToRgb(hex: string): Rgb {
  const cleaned = hex.trim().replace(/^#/, '');

  const expanded =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned;

  if (expanded.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(expanded)) return FALLBACK;

  return [
    parseInt(expanded.slice(0, 2), 16),
    parseInt(expanded.slice(2, 4), 16),
    parseInt(expanded.slice(4, 6), 16),
  ] as const;
}

/** `rgba()` string for a hex colour at the given alpha (clamped to 0–1). */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
