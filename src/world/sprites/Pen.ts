/** A tiny pixel brush: fills a w×h block at (x, y) relative to a fixed origin. */
export type Pen = (x: number, y: number, w: number, h: number, color: string) => void;

export function makePen(ctx: CanvasRenderingContext2D, ox = 0, oy = 0): Pen {
  return (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(ox + x, oy + y, w, h);
  };
}

export function createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Offscreen 2D context unavailable');
  ctx.imageSmoothingEnabled = false;
  return [canvas, ctx];
}

/** Draws a bitmap glyph described by rows of '1'/'0'. */
export function glyph(p: Pen, rows: readonly string[], x: number, y: number, color: string): void {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] === '1') p(x + i, y + j, 1, 1, color);
  });
}
