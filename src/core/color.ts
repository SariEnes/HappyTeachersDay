/**
 * Lighten (amount > 0) or darken (amount < 0) a #rrggbb colour.
 * amount is in the range [-1, 1].
 */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    amount < 0 ? v * (1 + amount) : v + (255 - v) * amount,
  );
  return (
    '#' +
    channels
      .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'))
      .join('')
  );
}
