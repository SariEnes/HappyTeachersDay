import { CERTIFICATE, type TextRun } from './certificateContent';

/**
 * Re-draws the Teachers' Day card onto a canvas (no html2canvas, no dependencies)
 * and exports it as a PNG. Same look as the on-screen card: striped frame,
 * paper with a gold inner line, red ribbon, gold-shadowed title, pixel portraits,
 * body text and APA-style references with hanging indents.
 */

const FONT = '"Press Start 2P", ui-monospace, monospace';
const W = 1400;
const STRIPE = 28; // striped outer band
const BORDER = 8; // black border around the paper
const PAD_X = 96;
const PAD_TOP = 64;
const PAD_BOTTOM = 64;
const CONTENT_W = W - 2 * PAD_X;
const PORTRAIT_SCALE = 7;

const INK = '#1b1b24';
const RED = '#c8102e';
const GOLD = '#f0b44c';
const GOLD_2 = '#ffd76a';
const PAPER = '#fffdf6';
const STRIPES = ['#f0b44c', '#c8102e', '#2f62c9', '#2fbf71'];

type Ctx = CanvasRenderingContext2D;

function font(size: number, italic = false): string {
  return `${italic ? 'italic ' : ''}${size}px ${FONT}`;
}

/** Greedy word wrap for plain text. */
function wrap(ctx: Ctx, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxW) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

interface Piece { text: string; italic: boolean; width: number }

/** Word wrap for mixed regular/italic runs; continuation lines get a hanging indent. */
function wrapRuns(ctx: Ctx, runs: readonly TextRun[], size: number, maxW: number, indent: number): Piece[][] {
  const words: Piece[] = [];
  for (const run of runs) {
    ctx.font = font(size, run.italic);
    for (const token of run.text.match(/\S+\s*|\s+/g) ?? []) {
      words.push({ text: token, italic: !!run.italic, width: ctx.measureText(token).width });
    }
  }
  const lines: Piece[][] = [[]];
  let x = 0;
  for (const w of words) {
    const limit = lines.length === 1 ? maxW : maxW - indent;
    if (x + w.width > limit && lines[lines.length - 1].length) {
      lines.push([]);
      x = 0;
    }
    lines[lines.length - 1].push(w);
    x += w.width;
  }
  return lines;
}

/** Lays out (and optionally paints) the card; returns the total height. */
function layout(ctx: Ctx, portraits: readonly HTMLCanvasElement[], paint: boolean): number {
  const top = STRIPE + BORDER;
  let y = top + PAD_TOP;
  const cx = W / 2;
  ctx.textBaseline = 'top';

  // ribbon
  ctx.font = font(15);
  const rw = ctx.measureText(CERTIFICATE.ribbon).width + 40;
  const rh = 46;
  if (paint) {
    ctx.fillStyle = INK;
    ctx.fillRect(cx - rw / 2 - 5, y - 5, rw + 10, rh + 10);
    ctx.fillStyle = RED;
    ctx.fillRect(cx - rw / 2, y, rw, rh);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(CERTIFICATE.ribbon, cx, y + 15);
  }
  y += rh + 44;

  // title (gold drop shadow, like the CSS text-shadow)
  ctx.font = font(42);
  const titleLines = wrap(ctx, CERTIFICATE.title, CONTENT_W);
  for (const line of titleLines) {
    if (paint) {
      ctx.textAlign = 'center';
      ctx.fillStyle = GOLD_2;
      ctx.fillText(line, cx + 5, y + 5);
      ctx.fillStyle = RED;
      ctx.fillText(line, cx, y);
    }
    y += 66;
  }
  y += 22;

  // pixel portraits
  if (portraits.length) {
    const pw = 16 * PORTRAIT_SCALE;
    const ph = 24 * PORTRAIT_SCALE;
    const gap = 56;
    const total = portraits.length * pw + (portraits.length - 1) * gap;
    if (paint) {
      ctx.imageSmoothingEnabled = false;
      portraits.forEach((p, i) => {
        const px = cx - total / 2 + i * (pw + gap);
        ctx.globalAlpha = 0.35;
        ctx.filter = 'brightness(0)';
        ctx.drawImage(p, px + 8, y + 8, pw, ph); // pixel drop shadow
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
        ctx.drawImage(p, px, y, pw, ph);
      });
    }
    y += ph + 40;
  }

  // body
  ctx.font = font(20);
  for (const line of wrap(ctx, CERTIFICATE.body, CONTENT_W - 80)) {
    if (paint) {
      ctx.textAlign = 'center';
      ctx.fillStyle = INK;
      ctx.fillText(line, cx, y);
    }
    y += 42;
  }
  y += 30;

  // divider
  if (paint) {
    ctx.fillStyle = INK;
    ctx.fillRect(PAD_X, y, CONTENT_W, 6);
  }
  y += 6 + 34;

  // references
  ctx.font = font(22);
  if (paint) {
    ctx.textAlign = 'center';
    ctx.fillStyle = INK;
    ctx.fillText(CERTIFICATE.referencesTitle, cx, y);
  }
  y += 52;

  const refSize = 16;
  const indent = refSize * 2.4;
  for (const runs of CERTIFICATE.references) {
    for (const [i, line] of wrapRuns(ctx, runs, refSize, CONTENT_W, indent).entries()) {
      if (paint) {
        let x = PAD_X + (i === 0 ? 0 : indent);
        ctx.textAlign = 'left';
        ctx.fillStyle = INK;
        for (const piece of line) {
          ctx.font = font(refSize, piece.italic);
          ctx.fillText(piece.text, x, y);
          x += piece.width;
        }
      }
      y += 34;
    }
    y += 14;
  }

  return y - 14 + PAD_BOTTOM + BORDER + STRIPE;
}

function paintFrame(ctx: Ctx, h: number): void {
  // diagonal 4-colour stripes
  const band = 16;
  for (let k = -h, i = 0; k < W + h; k += band, i++) {
    ctx.fillStyle = STRIPES[i % STRIPES.length];
    ctx.beginPath();
    ctx.moveTo(k, 0);
    ctx.lineTo(k + band, 0);
    ctx.lineTo(k + band - h, h);
    ctx.lineTo(k - h, h);
    ctx.closePath();
    ctx.fill();
  }
  // black border + paper + gold inner line
  ctx.fillStyle = INK;
  ctx.fillRect(STRIPE, STRIPE, W - 2 * STRIPE, h - 2 * STRIPE);
  ctx.fillStyle = PAPER;
  ctx.fillRect(STRIPE + BORDER, STRIPE + BORDER, W - 2 * (STRIPE + BORDER), h - 2 * (STRIPE + BORDER));
  const inset = STRIPE + BORDER + 12;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 5;
  ctx.strokeRect(inset, inset, W - 2 * inset, h - 2 * inset);
}

async function ensureFonts(): Promise<void> {
  try {
    await Promise.all([document.fonts.load(font(20)), document.fonts.load(font(20, true))]);
    await document.fonts.ready;
  } catch {
    /* offline: falls back to monospace, still a valid card */
  }
}

export async function renderCertificate(portraits: readonly HTMLCanvasElement[]): Promise<HTMLCanvasElement> {
  await ensureFonts();
  const measure = document.createElement('canvas').getContext('2d');
  if (!measure) throw new Error('Canvas 2D unavailable');
  const h = Math.ceil(layout(measure, portraits, false));

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  paintFrame(ctx, h);
  layout(ctx, portraits, true);
  return canvas;
}

/** Renders the card and triggers a PNG download. */
export async function downloadCertificatePng(portraits: readonly HTMLCanvasElement[]): Promise<void> {
  const canvas = await renderCertificate(portraits);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('PNG export failed');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = CERTIFICATE.fileName;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
