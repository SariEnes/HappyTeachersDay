import type { Appearance } from '../Appearance';
import { paintSeatedStudent } from './CharacterPainter';
import { glyph, type Pen } from './Pen';

/** Procedural pixel art for furniture & classroom fixtures. Each painter draws at (0,0). */

export type DeskItem = 'none' | 'laptop' | 'laptopFixed' | 'notebook' | 'books';

export const DESK_W = 16;
export const DESK_H = 24;

const DESK = '#d7b07c';
const DESK_L = '#e8c898';
const DESK_D = '#a77c4c';
const DESK_EDGE = '#86603a';
const METAL = '#8d939b';
const METAL_D = '#5e646c';
const SEAT = '#3c5a85';
const SEAT_D = '#2c4466';
const SEAT_L = '#5677a6';

/** Single-person desk with the chair attached by a metal bar; optional seated student. */
export function paintDeskUnit(
  ctx: CanvasRenderingContext2D,
  p: Pen,
  student: Appearance | null,
  item: DeskItem,
): void {
  // floor shadows
  p(1, 10, 14, 2, 'rgba(0,0,0,0.12)');
  p(2, 22, 12, 2, 'rgba(0,0,0,0.16)');
  // legs & connector bar
  p(2, 9, 1, 4, METAL_D);
  p(13, 9, 1, 4, METAL_D);
  p(13, 10, 1, 8, METAL);
  // desk top
  p(1, 3, 14, 6, DESK);
  p(1, 3, 14, 1, DESK_L);
  p(1, 8, 14, 1, DESK_D);
  p(1, 9, 14, 1, DESK_EDGE);

  switch (item) {
    case 'laptop':
      p(5, 0, 6, 5, '#2b2f36');
      p(6, 1, 4, 3, '#7fb4e6');
      p(6, 1, 4, 1, '#a9cff2');
      p(4, 5, 8, 2, '#b8bdc4');
      break;
    case 'laptopFixed': // formatting approved: green screen with a check mark
      p(5, 0, 6, 5, '#2b2f36');
      p(6, 1, 4, 3, '#2fbf71');
      p(6, 2, 1, 1, '#eafff2');
      p(7, 3, 1, 1, '#eafff2');
      p(8, 2, 1, 1, '#eafff2');
      p(9, 1, 1, 1, '#eafff2');
      p(4, 5, 8, 2, '#b8bdc4');
      break;
    case 'notebook':
      p(9, 4, 4, 4, '#f7f5ee');
      p(9, 5, 4, 1, '#c8d3e6');
      p(9, 7, 4, 1, '#c8d3e6');
      p(8, 4, 1, 3, '#2a5bd7');
      break;
    case 'books':
      p(2, 4, 5, 3, '#b03a3a');
      p(2, 4, 5, 1, '#d05555');
      p(3, 3, 4, 2, '#2f6b9a');
      break;
    case 'none':
      break;
  }

  // seat
  p(3, 13, 10, 4, SEAT);
  p(3, 13, 10, 1, SEAT_L);

  if (student) paintSeatedStudent(ctx, student, 0, 0);

  // backrest (closest to the viewer, drawn last)
  p(3, 17, 10, 5, SEAT_D);
  p(3, 17, 10, 1, SEAT_L);
  p(4, 18, 8, 3, SEAT);
  p(3, 22, 1, 2, METAL_D);
  p(12, 22, 1, 2, METAL_D);
}

export const PODIUM_W = 24;
export const PODIUM_H = 30;

export function paintPodium(p: Pen): void {
  const W = '#8b5a2b', WL = '#b07a45', WLL = '#c99460', WD = '#6b4421', WDD = '#4f3118';
  p(1, 28, 22, 2, 'rgba(0,0,0,0.2)');
  p(2, 8, 20, 20, W);
  p(5, 11, 14, 13, WD);
  p(6, 12, 12, 11, '#7d5026');
  p(10, 15, 4, 4, '#c8102e'); // red emblem sticker
  p(11, 16, 2, 2, '#f4f1e8');
  p(1, 26, 22, 2, WDD);
  p(2, 8, 1, 18, WL);
  // slanted reading top
  p(1, 2, 22, 7, WL);
  p(1, 2, 22, 1, WLL);
  p(1, 8, 22, 1, WD);
  // laptop
  p(5, 0, 8, 5, '#9aa0a8');
  p(5, 0, 8, 1, '#c4c9cf');
  p(8, 2, 2, 1, '#e9ecef');
  p(4, 5, 10, 2, '#bfc4ca');
  // gooseneck mic
  p(17, 1, 1, 5, '#333338');
  p(16, 0, 2, 1, '#111114');
}

export const SMARTBOARD_W = 96;
export const SMARTBOARD_H = 34;

export function paintSmartboard(p: Pen): void {
  p(0, 0, 96, 30, '#25272c');
  p(1, 1, 94, 1, '#3a3d44');
  p(3, 3, 90, 24, '#1d4f80');
  p(3, 3, 90, 6, '#2763a0');
  p(3, 9, 90, 4, '#225a92');
  // desktop icons
  const icons = ['#f0b44c', '#e8eef5', '#5fd38d', '#ff7b72'];
  icons.forEach((c, i) => p(6, 6 + i * 5, 3, 3, c));
  // slide window
  p(28, 7, 44, 16, '#eef3f9');
  p(28, 7, 44, 2, '#3d8ad8');
  p(69, 7, 2, 2, '#e05a4f');
  p(32, 11, 20, 2, '#1d4f80');
  p(32, 15, 22, 1, '#9db2c8');
  p(32, 17, 18, 1, '#9db2c8');
  p(32, 19, 20, 1, '#9db2c8');
  p(58, 11, 10, 9, '#f0b44c');
  p(60, 15, 3, 5, '#e07a2c');
  p(64, 13, 3, 7, '#c8102e');
  // taskbar
  p(3, 25, 90, 2, '#123555');
  p(5, 25, 2, 2, '#5fb0ff');
  p(47, 28, 2, 1, '#37d67a'); // power LED
  // pen tray
  p(18, 30, 60, 3, '#3b3e45');
  p(18, 30, 60, 1, '#50545c');
  p(24, 30, 5, 1, '#1f1f1f');
  p(31, 30, 5, 1, '#d33b3b');
  p(38, 30, 5, 1, '#2a6fdb');
  p(45, 30, 5, 1, '#2c9d4b');
  p(62, 30, 6, 2, '#e7e2d0');
}

export const WHITEBOARD_W = 160;
export const WHITEBOARD_H = 40;

export function paintWhiteboard(p: Pen): void {
  // frame & board
  p(0, 4, 160, 32, '#aeb4bc');
  p(1, 5, 158, 30, '#c9ced5');
  p(2, 6, 156, 28, '#fbfcfd');
  // marker scribbles on the visible left part
  p(6, 10, 26, 1, '#2f62c9');
  p(6, 13, 18, 1, '#2f62c9');
  p(6, 16, 24, 1, '#2f62c9');
  p(8, 21, 10, 1, '#c93a3a'); p(8, 26, 10, 1, '#c93a3a');
  p(8, 21, 1, 6, '#c93a3a'); p(17, 21, 1, 6, '#c93a3a');
  p(19, 24, 10, 1, '#c93a3a'); p(27, 23, 1, 3, '#c93a3a');
  p(30, 21, 6, 6, '#2e9b53'); p(31, 22, 4, 4, '#fbfcfd');
  // pull-down projector screen: housing
  p(38, 0, 120, 4, '#e6e6e2');
  p(38, 3, 120, 1, '#c4c4bf');
  p(38, 0, 2, 4, '#4a4a4a');
  p(156, 0, 2, 4, '#4a4a4a');
  // screen fabric
  p(42, 4, 112, 25, '#f4f4f0');
  p(42, 4, 112, 2, '#2a2a2a');
  p(42, 6, 1, 23, '#e2e2dc');
  p(153, 6, 1, 23, '#e2e2dc');
  p(41, 28, 114, 2, '#3d3d3d');
  p(42, 30, 112, 1, '#e3e5e8'); // shadow on board
  p(97, 30, 2, 3, '#3d3d3d');
  p(96, 33, 4, 1, '#3d3d3d');
  // marker tray
  p(4, 36, 152, 3, '#959ca6');
  p(4, 36, 152, 1, '#b3b9c1');
  p(12, 35, 6, 1, '#c93a3a');
  p(20, 35, 6, 1, '#2f62c9');
  p(28, 35, 6, 1, '#1f1f1f');
  p(36, 35, 6, 1, '#2e9b53');
  p(130, 34, 10, 3, '#3f4a5a');
  p(130, 36, 10, 1, '#e8e2cf');
}

export function paintClock(p: Pen): void {
  const rim = '#2b2b2b', face = '#fafafa';
  p(1, 1, 10, 10, rim); p(0, 3, 12, 6, rim); p(3, 0, 6, 12, rim);
  p(2, 2, 8, 8, face); p(1, 4, 10, 4, face); p(4, 1, 4, 10, face);
  p(5, 2, 1, 4, '#222');
  p(6, 5, 3, 1, '#c33');
  p(5, 5, 1, 1, '#222');
}

/** 16×48 window set into the right wall (seen from above). */
export function paintWindow(p: Pen): void {
  const frame = '#f7f7f5', glass = '#a6d6f0', glassD = '#8fc8e6', glare = '#e6f6ff';
  p(1, 0, 14, 48, frame);
  p(0, 0, 1, 48, '#cfcbc1');
  for (const top of [2, 26]) {
    p(3, top, 10, 20, glass);
    p(3, top + 14, 10, 6, glassD);
    p(4, top + 2, 1, 4, glare);
    p(5, top + 1, 1, 2, glare);
    p(10, top + 9, 1, 4, glare);
  }
  p(1, 23, 14, 2, '#dedcd6');
}

export const FLOOR_TILE = 16;

export function paintFloorTile(p: Pen, variant: number): void {
  const base = ['#ebe1cb', '#e8ddc6', '#ede4cf'][variant % 3];
  p(0, 0, 16, 16, base);
  p(0, 0, 15, 1, '#f3ebda');
  p(0, 0, 1, 15, '#f3ebda');
  p(15, 0, 1, 16, '#d8cbb0');
  p(0, 15, 16, 1, '#d8cbb0');
  const specks: Array<[number, number]> = [[4, 6], [11, 3], [7, 11], [12, 12], [3, 12]];
  specks.forEach(([x, y], i) => {
    if ((i + variant) % 2 === 0) p(x, y, 1, 1, '#e0d4bb');
  });
}

export function paintPlant(p: Pen): void {
  p(2, 21, 10, 1, 'rgba(0,0,0,0.2)');
  p(3, 14, 8, 7, '#b5653a');
  p(2, 13, 10, 2, '#c97a4a');
  p(3, 20, 8, 1, '#8e4c2a');
  p(3, 13, 8, 1, '#4a3020');
  p(5, 2, 4, 11, '#3f8f4a');
  p(1, 5, 5, 6, '#4fa35a');
  p(8, 4, 5, 7, '#4fa35a');
  p(3, 0, 3, 5, '#5fb86a');
  p(8, 1, 3, 4, '#3f8f4a');
  p(2, 6, 1, 2, '#7fd08a');
  p(10, 5, 1, 2, '#7fd08a');
  p(4, 1, 1, 2, '#8ade94');
}

export function paintBin(p: Pen): void {
  p(1, 11, 8, 1, 'rgba(0,0,0,0.2)');
  p(1, 2, 8, 9, '#6b7480');
  p(0, 1, 10, 2, '#8a939e');
  p(1, 2, 8, 1, '#2f343b');
  p(2, 4, 1, 6, '#7d8794');
}

export function paintShadow(p: Pen): void {
  const c = 'rgba(0,0,0,0.22)';
  p(2, 0, 8, 1, c);
  p(1, 1, 10, 2, c);
  p(2, 3, 8, 1, c);
}

const GLYPH_E = ['111', '100', '110', '100', '111'];
const GLYPH_BANG = ['1', '1', '1', '0', '1'];

/** 11×12 keycap speech bubble showing "E". */
export function paintKeyPrompt(p: Pen): void {
  const o = '#1b1b24';
  p(1, 0, 9, 1, o); p(0, 1, 1, 8, o); p(10, 1, 1, 8, o); p(1, 9, 9, 1, o);
  p(1, 1, 9, 7, '#f4f1e8');
  p(1, 8, 9, 1, '#b9b3a3');
  glyph(p, GLYPH_E, 4, 2, o);
  p(4, 10, 3, 1, o);
  p(5, 11, 1, 1, o);
}

/** 9×12 "!" emote bubble. */
export function paintEmoteBang(p: Pen): void {
  const o = '#1b1b24';
  p(1, 0, 7, 1, o); p(0, 1, 1, 8, o); p(8, 1, 1, 8, o); p(1, 9, 7, 1, o);
  p(1, 1, 7, 8, '#fffdf5');
  glyph(p, GLYPH_BANG, 4, 2, '#d63031');
  p(3, 10, 3, 1, o);
  p(4, 11, 1, 1, o);
}

const RING = ['00011111000', '01100000110', '10000000001', '10000000001', '10000000001', '01100000110', '00011111000'];

/** 11×8 pixel target ring shown where a touch is steering the professor. */
export function paintTouchRing(p: Pen): void {
  glyph(p, RING, 0, 1, 'rgba(27,27,36,0.45)'); // drop shadow
  glyph(p, RING, 0, 0, '#ffd23f');
}
