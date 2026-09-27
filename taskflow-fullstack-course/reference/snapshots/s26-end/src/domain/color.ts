/** Strict #rrggbb check. Anything else (named colours, url(), expressions, `;`) is rejected. */
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function isSafeHexColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

/** Returns black or white, whichever is more readable on the given #rrggbb background. */
export function contrastText(hex: string): '#000000' | '#ffffff' {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Perceived luminance (ITU-R BT.601 weights), 0..255
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 150 ? '#000000' : '#ffffff';
}
