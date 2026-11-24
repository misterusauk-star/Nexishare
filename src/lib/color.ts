// Colour helpers shared by the QR tool and the tests. Pure.
const hex = (c: string) => /^#?[0-9a-f]{6}$/i.test(c.trim());
export const normalizeHex = (c: string): string | null => (hex(c) ? `#${c.trim().replace("#", "").toLowerCase()}` : null);

export function luminance(color: string): number {
  const h = normalizeHex(color);
  if (!h) return 0;
  const ch = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function contrastRatio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Advice for a QR code's colours: "" when they scan well. */
export function qrColorWarning(fg: string, bg: string): string {
  if (contrastRatio(fg, bg) < 3) return "These colours are too close. Use a much darker code on a lighter background.";
  if (luminance(fg) > luminance(bg)) return "A light code on a dark background does not scan on many phones. Swap the colours.";
  return "";
}
