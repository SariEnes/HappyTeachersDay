import { shade } from '../../core/color';
import type { Appearance } from '../Appearance';
import { makePen, type Pen } from './Pen';

/**
 * Procedural 16×24 character pixel art.
 * Coordinate conventions (inside one frame):
 *   head y 2..9, torso y 10..16, legs y 17..21, shoes y 22..23.
 */
export const CHAR_W = 16;
export const CHAR_H = 24;

export type PaintDir = 'down' | 'up' | 'right';
/** 0 = standing, 1 = step A, 2 = step B */
export type WalkFrame = 0 | 1 | 2;

const EYE = '#1c1a24';
const SHIRT_WHITE = '#f2f2f0';
const GLASS_FRAME = '#1d1d22';
const GLASS_LENS = '#cfe6fb';

interface Tones {
  skin: string; skinD: string; skinL: string; mouth: string;
  hair: string; hairD: string; hairL: string;
  top: string; topD: string; topL: string;
  pants: string; pantsD: string; belt: string;
  shoes: string; shoesD: string;
  accent: string; accentD: string;
}

function tones(a: Appearance): Tones {
  return {
    skin: a.skin, skinD: shade(a.skin, -0.16), skinL: shade(a.skin, 0.28), mouth: shade(a.skin, -0.32),
    hair: a.hair, hairD: shade(a.hair, -0.25), hairL: shade(a.hair, 0.22),
    top: a.top, topD: shade(a.top, -0.24), topL: shade(a.top, 0.14),
    pants: a.pants, pantsD: shade(a.pants, -0.28), belt: shade(a.pants, -0.5),
    shoes: a.shoes, shoesD: shade(a.shoes, -0.3),
    accent: a.accent, accentD: shade(a.accent, -0.25),
  };
}

// ---------------------------------------------------------------- public API

export function paintStandingFrame(
  ctx: CanvasRenderingContext2D,
  a: Appearance,
  dir: PaintDir,
  frame: WalkFrame,
  ox: number,
  oy: number,
): void {
  const p = makePen(ctx, ox, oy);
  const t = tones(a);
  switch (dir) {
    case 'down':
      legsFront(p, t, frame);
      torsoFront(p, a, t);
      armsFront(p, a, t, frame);
      headFront(p, a, t);
      break;
    case 'up':
      legsFront(p, t, frame);
      torsoBack(p, a, t);
      armsFront(p, a, t, frame);
      headBack(p, a, t);
      break;
    case 'right':
      legsSide(p, t, frame);
      torsoSide(p, a, t);
      armSide(p, a, t, frame);
      headSide(p, a, t);
      break;
  }
}

/** Student seen from behind, sitting, forearms resting on the desk in front. */
export function paintSeatedStudent(ctx: CanvasRenderingContext2D, a: Appearance, ox: number, oy: number): void {
  const p = makePen(ctx, ox, oy);
  const t = tones(a);
  const lower = a.outfit === 'tshirt' ? t.skin : t.topD;

  // forearms reaching onto the desk
  p(2, 11, 2, 3, t.topD); p(2, 8, 2, 3, lower); p(3, 7, 2, 1, t.skin);
  p(12, 11, 2, 3, t.topD); p(12, 8, 2, 3, lower); p(11, 7, 2, 1, t.skin);

  // torso (back)
  p(4, 12, 8, 6, t.top);
  p(4, 12, 8, 1, t.topL);
  switch (a.outfit) {
    case 'blazer': p(6, 12, 4, 1, SHIRT_WHITE); p(8, 13, 1, 5, t.topD); break;
    case 'hoodie': p(5, 12, 6, 3, t.topD); p(6, 12, 4, 1, shade(a.top, -0.4)); break;
    case 'sweater': p(5, 12, 6, 1, t.topD); break;
    case 'tshirt': p(6, 12, 4, 1, t.skin); break;
  }

  // head, shifted down 2px (seated)
  headBack(makePen(ctx, ox, oy + 2), a, t);
}

// ---------------------------------------------------------------- legs

function legsFront(p: Pen, t: Tones, frame: WalkFrame): void {
  const lLift = frame === 1 ? 1 : 0;
  const rLift = frame === 2 ? 1 : 0;
  p(5, 17, 3, 5 - lLift, t.pants); p(5, 22 - lLift, 3, 2, t.shoes);
  p(8, 17, 3, 5 - rLift, t.pants); p(8, 22 - rLift, 3, 2, t.shoes);
  p(8, 18, 1, 3 - rLift, t.pantsD);
}

function legsSide(p: Pen, t: Tones, frame: WalkFrame): void {
  if (frame === 0) {
    p(6, 17, 4, 5, t.pants);
    p(6, 18, 1, 4, t.pantsD);
    p(6, 22, 5, 2, t.shoes);
    return;
  }
  const leg = (forward: boolean, near: boolean) => {
    const col = near ? t.pants : t.pantsD;
    const sh = near ? t.shoes : t.shoesD;
    if (forward) { p(7, 17, 3, 2, col); p(8, 19, 3, 3, col); p(9, 22, 4, 2, sh); }
    else { p(6, 17, 3, 2, col); p(5, 19, 3, 3, col); p(3, 22, 4, 2, sh); }
  };
  const nearForward = frame === 1;
  leg(!nearForward, false); // far leg first
  leg(nearForward, true);
}

// ---------------------------------------------------------------- torso

function torsoFront(p: Pen, a: Appearance, t: Tones): void {
  p(4, 10, 8, 7, t.top);
  p(4, 10, 8, 1, t.topL);
  p(4, 16, 8, 1, t.topD);
  switch (a.outfit) {
    case 'blazer':
      p(6, 10, 4, 4, SHIRT_WHITE);
      p(7, 11, 2, 4, t.accent);
      p(7, 10, 2, 1, t.accentD);
      p(5, 10, 1, 5, t.topD); p(10, 10, 1, 5, t.topD);
      p(7, 15, 1, 1, t.topD);
      p(4, 17, 8, 1, t.belt);
      break;
    case 'sweater':
      p(6, 10, 4, 1, t.topD);
      p(7, 10, 2, 1, t.accent);
      p(4, 15, 8, 1, t.topD);
      break;
    case 'hoodie':
      p(5, 10, 6, 1, t.topD);
      p(6, 11, 1, 3, '#ececec'); p(9, 11, 1, 3, '#ececec');
      p(5, 14, 6, 2, t.topD);
      break;
    case 'tshirt':
      p(6, 10, 4, 1, t.skin);
      break;
  }
}

function torsoBack(p: Pen, a: Appearance, t: Tones): void {
  p(4, 10, 8, 7, t.top);
  p(4, 10, 8, 1, t.topL);
  p(4, 16, 8, 1, t.topD);
  switch (a.outfit) {
    case 'blazer': p(6, 10, 4, 1, SHIRT_WHITE); p(8, 11, 1, 6, t.topD); p(4, 17, 8, 1, t.belt); break;
    case 'hoodie': p(5, 10, 6, 3, t.topD); p(6, 10, 4, 1, shade(a.top, -0.4)); break;
    case 'sweater': p(5, 10, 6, 1, t.topD); p(4, 15, 8, 1, t.topD); break;
    case 'tshirt': p(6, 10, 4, 1, t.skin); break;
  }
}

function torsoSide(p: Pen, a: Appearance, t: Tones): void {
  p(5, 10, 6, 7, t.top);
  p(5, 10, 6, 1, t.topL);
  p(5, 10, 1, 7, t.topD);
  p(5, 16, 6, 1, t.topD);
  switch (a.outfit) {
    case 'blazer': p(10, 10, 1, 4, SHIRT_WHITE); p(10, 11, 1, 4, t.accent); p(5, 17, 6, 1, t.belt); break;
    case 'sweater': p(9, 10, 2, 1, t.topD); break;
    case 'hoodie': p(4, 10, 2, 3, t.topD); break;
    case 'tshirt': p(9, 10, 2, 1, t.skin); break;
  }
}

// ---------------------------------------------------------------- arms

function armsFront(p: Pen, a: Appearance, t: Tones, frame: WalkFrame): void {
  const s = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  const arm = (x: number, outerX: number, sw: number) => {
    const handTop = 15 + sw;
    const sleeveEnd = a.outfit === 'tshirt' ? 12 : handTop;
    p(x, 10, 2, sleeveEnd - 10, t.top);
    p(outerX, 10, 1, sleeveEnd - 10, t.topD);
    if (sleeveEnd < handTop) p(x, sleeveEnd, 2, handTop - sleeveEnd, t.skin);
    p(x, handTop, 2, 2, t.skin);
  };
  arm(2, 2, s);
  arm(12, 13, -s);
}

function armSide(p: Pen, a: Appearance, t: Tones, frame: WalkFrame): void {
  const s = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  const lower = a.outfit === 'tshirt' ? t.skin : t.topD;
  p(7, 10, 2, 3, t.topD);
  p(7 + s, 13, 2, 2, lower);
  p(7 + s, 15, 2, 2, t.skin);
}

// ---------------------------------------------------------------- heads

function headShape(p: Pen, t: Tones): void {
  p(5, 2, 6, 1, t.skin);
  p(4, 3, 8, 6, t.skin);
  p(5, 9, 6, 1, t.skin);
}

function headFront(p: Pen, a: Appearance, t: Tones): void {
  headShape(p, t);
  p(4, 8, 1, 1, t.skinD); p(11, 8, 1, 1, t.skinD);
  p(3, 5, 1, 2, t.skin); p(12, 5, 1, 2, t.skin);
  p(6, 5, 1, 2, EYE); p(9, 5, 1, 2, EYE);
  p(7, 8, 2, 1, t.mouth);
  hairFront(p, a, t);
  if (a.glasses) {
    p(4, 5, 8, 1, GLASS_FRAME);
    p(4, 6, 1, 1, GLASS_FRAME); p(7, 6, 2, 1, GLASS_FRAME); p(11, 6, 1, 1, GLASS_FRAME);
    p(5, 6, 1, 1, GLASS_LENS); p(10, 6, 1, 1, GLASS_LENS);
    p(6, 6, 1, 1, EYE); p(9, 6, 1, 1, EYE);
    p(5, 7, 2, 1, GLASS_FRAME); p(9, 7, 2, 1, GLASS_FRAME);
  }
}

function headBack(p: Pen, a: Appearance, t: Tones): void {
  headShape(p, t);
  p(3, 5, 1, 2, t.skin); p(12, 5, 1, 2, t.skin);
  hairBack(p, a, t);
}

function headSide(p: Pen, a: Appearance, t: Tones): void {
  headShape(p, t);
  p(12, 6, 1, 1, t.skin); // nose
  p(11, 9, 1, 1, t.skinD);
  hairSide(p, a, t);
  if (a.hairStyle !== 'hijab') p(7, 5, 1, 2, t.skinD); // ear
  p(10, 5, 1, 2, EYE);
  p(10, 8, 1, 1, t.mouth);
  if (a.glasses) {
    p(8, 5, 4, 1, GLASS_FRAME);
    p(10, 6, 1, 1, EYE);
    p(11, 6, 1, 1, GLASS_LENS);
    p(10, 7, 2, 1, GLASS_FRAME);
  }
}

// ---------------------------------------------------------------- hair

function hairFront(p: Pen, a: Appearance, t: Tones): void {
  const { hair: h, hairD: hd, hairL: hl } = t;
  const c = a.accent;
  const shortCut = () => {
    p(5, 1, 6, 1, h); p(4, 2, 8, 2, h);
    p(4, 4, 1, 2, h); p(11, 4, 1, 2, h);
    p(9, 4, 2, 1, h);
    p(6, 2, 3, 1, hl);
  };
  switch (a.hairStyle) {
    case 'short': shortCut(); break;
    case 'buzz':
      p(5, 1, 6, 1, h); p(4, 2, 8, 1, h); p(4, 3, 1, 2, h); p(11, 3, 1, 2, h);
      break;
    case 'long':
      shortCut();
      p(3, 3, 2, 9, h); p(11, 3, 2, 9, h);
      p(3, 3, 1, 9, hd); p(12, 3, 1, 9, hd);
      break;
    case 'ponytail': shortCut(); p(12, 6, 1, 4, hd); break;
    case 'bun': shortCut(); p(6, 0, 4, 1, hd); break;
    case 'curly':
      p(4, 1, 8, 3, h);
      p(5, 0, 1, 1, h); p(7, 0, 2, 1, h); p(10, 0, 1, 1, h);
      p(3, 2, 2, 5, h); p(11, 2, 2, 5, h);
      p(5, 2, 1, 1, hl); p(8, 1, 1, 1, hl); p(11, 3, 1, 1, hl);
      break;
    case 'cap':
      p(5, 1, 6, 1, c); p(4, 2, 8, 2, c);
      p(3, 4, 10, 1, shade(c, -0.25));
      p(7, 1, 2, 1, shade(c, 0.2));
      p(4, 5, 1, 1, h); p(11, 5, 1, 1, h);
      break;
    case 'hijab':
      p(4, 1, 8, 2, c);
      p(3, 2, 2, 9, c); p(11, 2, 2, 9, c);
      p(4, 9, 8, 2, c);
      p(3, 10, 10, 2, c);
      p(5, 3, 6, 1, shade(c, -0.18));
      break;
    case 'balding':
      // bare crown with a shine, silver hair only on the sides
      p(6, 2, 2, 1, t.skinL);
      p(5, 3, 1, 1, t.skinL);
      p(4, 3, 1, 5, h); p(11, 3, 1, 5, h);
      p(3, 3, 1, 2, h); p(12, 3, 1, 2, h);
      p(3, 7, 1, 1, hd); p(12, 7, 1, 1, hd);
      p(5, 4, 2, 1, h); p(9, 4, 2, 1, h); // bushy silver eyebrows
      break;
  }
}

function hairBack(p: Pen, a: Appearance, t: Tones): void {
  const { hair: h, hairD: hd, hairL: hl } = t;
  const c = a.accent;
  const shortBack = () => {
    p(5, 1, 6, 1, h); p(4, 2, 8, 6, h); p(5, 8, 6, 1, h);
    p(6, 2, 3, 1, hl); p(4, 7, 8, 1, hd);
  };
  switch (a.hairStyle) {
    case 'short': shortBack(); break;
    case 'buzz': p(5, 1, 6, 1, h); p(4, 2, 8, 6, shade(a.hair, 0.12)); p(4, 7, 8, 1, h); break;
    case 'long':
      p(5, 1, 6, 1, h); p(3, 2, 10, 10, h);
      p(3, 2, 1, 10, hd); p(12, 2, 1, 10, hd);
      p(4, 12, 8, 1, hd); p(6, 2, 3, 1, hl);
      break;
    case 'ponytail':
      shortBack();
      p(7, 7, 2, 1, c);
      p(7, 8, 2, 4, h); p(7, 12, 2, 1, hd);
      break;
    case 'bun': shortBack(); p(6, 2, 4, 3, hd); p(7, 2, 1, 1, hl); break;
    case 'curly':
      p(3, 1, 10, 8, h);
      p(4, 0, 2, 1, h); p(7, 0, 2, 1, h); p(10, 0, 2, 1, h);
      p(5, 3, 1, 1, hl); p(9, 2, 1, 1, hl); p(7, 5, 1, 1, hl); p(10, 6, 1, 1, hl); p(4, 6, 1, 1, hl);
      p(3, 8, 10, 1, hd);
      break;
    case 'cap':
      p(4, 4, 8, 4, h);
      p(5, 1, 6, 1, c); p(4, 2, 8, 3, c);
      p(6, 4, 4, 1, shade(c, -0.3));
      break;
    case 'hijab':
      p(4, 1, 8, 1, c); p(3, 2, 10, 10, c);
      p(4, 12, 8, 1, shade(c, -0.15));
      p(6, 4, 1, 6, shade(c, -0.12)); p(9, 5, 1, 6, shade(c, -0.12));
      p(5, 2, 3, 1, shade(c, 0.15));
      break;
    case 'balding':
      p(6, 2, 3, 1, t.skinL);
      p(4, 5, 8, 3, h); p(5, 8, 6, 1, h);
      p(4, 3, 1, 2, h); p(11, 3, 1, 2, h);
      p(4, 7, 8, 1, hd);
      break;
  }
}

function hairSide(p: Pen, a: Appearance, t: Tones): void {
  const { hair: h, hairD: hd, hairL: hl } = t;
  const c = a.accent;
  const shortSide = () => {
    p(5, 1, 6, 1, h); p(4, 2, 8, 2, h);
    p(4, 4, 3, 4, h); p(4, 8, 2, 1, hd);
    p(11, 4, 1, 1, h);
    p(6, 2, 3, 1, hl);
  };
  switch (a.hairStyle) {
    case 'short': shortSide(); break;
    case 'buzz': p(5, 1, 6, 1, h); p(4, 2, 8, 1, h); p(4, 3, 2, 5, h); break;
    case 'long': shortSide(); p(3, 3, 4, 9, h); p(3, 3, 1, 9, hd); p(4, 12, 3, 1, hd); break;
    case 'ponytail': shortSide(); p(3, 4, 1, 1, c); p(2, 5, 2, 5, h); p(2, 9, 2, 1, hd); break;
    case 'bun': shortSide(); p(2, 2, 2, 3, hd); break;
    case 'curly':
      p(4, 1, 8, 3, h); p(5, 0, 2, 1, h); p(8, 0, 2, 1, h);
      p(3, 3, 4, 6, h);
      p(6, 1, 1, 1, hl); p(4, 5, 1, 1, hl);
      break;
    case 'cap':
      p(4, 4, 3, 4, h);
      p(5, 1, 6, 1, c); p(4, 2, 8, 2, c);
      p(10, 4, 4, 1, shade(c, -0.25));
      break;
    case 'hijab':
      p(4, 1, 7, 2, c);
      p(3, 2, 6, 10, c);
      p(9, 2, 3, 1, c);
      p(8, 9, 4, 2, c);
      p(4, 10, 7, 2, c);
      p(4, 4, 1, 6, shade(c, -0.15));
      break;
    case 'balding':
      p(7, 2, 2, 1, t.skinL);
      p(4, 4, 3, 4, h); p(5, 8, 2, 1, hd);
      p(6, 4, 2, 1, h);
      p(10, 4, 2, 1, h);
      break;
  }
}
