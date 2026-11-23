import type { Pen } from './Pen';
import { GLYPH_H, drawPixelText, measurePixelText } from './PixelFont';

/** Procedural pixel art for quest-only visuals. */

const OUTLINE = '#1b1b24';

export const GIFT_W = 12;
export const GIFT_H = 14;

export function paintGiftBox(p: Pen): void {
  p(1, 13, 10, 1, 'rgba(0,0,0,0.25)');
  p(1, 6, 10, 7, '#f2c14e');
  p(1, 11, 10, 2, '#d49a2a');
  p(1, 6, 1, 5, '#ffe08a');
  p(0, 4, 12, 3, '#ffd76a');
  p(0, 4, 12, 1, '#fff0b0');
  p(0, 6, 12, 1, '#c98f22');
  p(5, 4, 2, 9, '#d63031');
  p(5, 11, 2, 2, '#a61e1e');
  // bow
  p(2, 1, 3, 3, '#d63031');
  p(7, 1, 3, 3, '#d63031');
  p(3, 2, 1, 1, '#ff7675');
  p(8, 2, 1, 1, '#ff7675');
  p(5, 2, 2, 2, '#a61e1e');
}

export const ARROW_W = 7;
export const ARROW_H = 5;

/** Bouncing golden "go here" marker. */
export function paintQuestArrow(p: Pen): void {
  const g = '#ffd23f';
  p(0, 0, 7, 1, OUTLINE);
  p(0, 1, 1, 1, OUTLINE); p(1, 1, 5, 1, g); p(6, 1, 1, 1, OUTLINE);
  p(1, 2, 1, 1, OUTLINE); p(2, 2, 3, 1, g); p(5, 2, 1, 1, OUTLINE);
  p(2, 3, 1, 1, OUTLINE); p(3, 3, 1, 1, g); p(4, 3, 1, 1, OUTLINE);
  p(3, 4, 1, 1, OUTLINE);
  p(1, 1, 2, 1, '#fff2a8');
}

export const SPOTLIGHT_W = 56;
export const SPOTLIGHT_H = 28;

/** Stepped (pixel) elliptical pool of light, three intensity bands. */
export function paintSpotlight(p: Pen): void {
  const rx = SPOTLIGHT_W / 2;
  const ry = SPOTLIGHT_H / 2;
  const bands: Array<[number, number]> = [[1, 0.2], [0.74, 0.22], [0.45, 0.28]];
  for (let y = 0; y < SPOTLIGHT_H; y++) {
    const dy = (y + 0.5 - ry) / ry;
    for (const [s, a] of bands) {
      if (Math.abs(dy) >= s) continue;
      const hw = Math.round(rx * Math.sqrt(s * s - dy * dy));
      p(rx - hw, y, hw * 2, 1, `rgba(255,247,205,${a})`);
    }
  }
}

/** Slide shown on the pull-down projector screen once the pipeline is solved. */
export function paintProjectorSlide(p: Pen, w: number, h: number): void {
  p(0, 0, w, h, '#fffaf0');
  p(0, 0, w, 1, '#f3e7cc');
  p(0, h - 1, w, 1, '#f3e7cc');
  const lines: Array<[string, string]> = [
    ['CEIT 111:', '#c8102e'],
    ["TEACHERS' DAY", '#1d3557'],
    ['SPECIAL', '#c8102e'],
  ];
  const gap = 2;
  const total = lines.length * GLYPH_H + (lines.length - 1) * gap;
  let y = Math.floor((h - total) / 2);
  for (const [text, color] of lines) {
    drawPixelText(p, text, Math.floor((w - measurePixelText(text)) / 2), y, color);
    y += GLYPH_H + gap;
  }
  // little gold sparkles either side
  for (const sx of [8, w - 11]) {
    p(sx + 1, 8, 1, 5, '#f0b44c');
    p(sx - 1, 10, 5, 1, '#f0b44c');
    p(sx + 1, 10, 1, 1, '#fff2a8');
  }
}

export function speechBubbleSize(text: string): { w: number; h: number } {
  return { w: measurePixelText(text) + 6, h: 13 };
}

/** White speech bubble with a tail at the bottom centre. */
export function paintSpeechBubble(p: Pen, text: string, color: string): void {
  const { w } = speechBubbleSize(text);
  const h = 11;
  const bg = '#fffdf5';
  p(1, 0, w - 2, 1, OUTLINE);
  p(0, 1, 1, h - 2, OUTLINE);
  p(w - 1, 1, 1, h - 2, OUTLINE);
  p(1, h - 1, w - 2, 1, OUTLINE);
  p(1, 1, w - 2, h - 2, bg);
  p(1, h - 2, w - 2, 1, '#ece4cf');
  drawPixelText(p, text, 3, 3, color);
  const cx = Math.floor(w / 2);
  p(cx - 1, h - 1, 3, 1, bg);
  p(cx - 2, h - 1, 1, 1, OUTLINE);
  p(cx + 2, h - 1, 1, 1, OUTLINE);
  p(cx - 1, h, 1, 1, OUTLINE);
  p(cx + 1, h, 1, 1, OUTLINE);
  p(cx, h, 1, 1, bg);
  p(cx, h + 1, 1, 1, OUTLINE);
}
