import type { Appearance } from './Appearance';
import { CharacterSheet } from './CharacterSheet';
import { CHAR_H, CHAR_W, paintStandingFrame, type WalkFrame } from './sprites/CharacterPainter';
import { createCanvas, makePen, type Pen } from './sprites/Pen';
import {
  DESK_H, DESK_W, FLOOR_TILE, PODIUM_H, PODIUM_W, SMARTBOARD_H, SMARTBOARD_W, WHITEBOARD_H, WHITEBOARD_W,
  paintBin, paintClock, paintDeskUnit, paintEmoteBang, paintFloorTile, paintKeyPrompt, paintPlant,
  paintPodium, paintShadow, paintSmartboard, paintWhiteboard, paintWindow, type DeskItem,
} from './sprites/PropPainter';
import {
  ARROW_H, ARROW_W, GIFT_H, GIFT_W, SPOTLIGHT_H, SPOTLIGHT_W,
  paintGiftBox, paintProjectorSlide, paintQuestArrow, paintSpeechBubble, paintSpotlight, speechBubbleSize,
} from './sprites/QuestPainter';

const FRAMES: readonly WalkFrame[] = [0, 1, 2];

/**
 * Generates every sprite procedurally into offscreen canvases (zero PNGs)
 * and memoises them, so each piece of pixel art is painted exactly once.
 */
export class SpriteCache {
  private readonly images = new Map<string, HTMLCanvasElement>();
  private readonly sheets = new Map<Appearance, CharacterSheet>();
  private readonly portraits = new Map<Appearance, HTMLCanvasElement>();

  getCharacterSheet(a: Appearance): CharacterSheet {
    let sheet = this.sheets.get(a);
    if (!sheet) {
      sheet = this.buildSheet(a);
      this.sheets.set(a, sheet);
    }
    return sheet;
  }

  /** Desk units are unique per seat (different students), so they are not memoised by key. */
  createDeskUnit(student: Appearance | null, item: DeskItem): HTMLCanvasElement {
    const [canvas, ctx] = createCanvas(DESK_W, DESK_H);
    paintDeskUnit(ctx, makePen(ctx), student, item);
    return canvas;
  }

  podium(): HTMLCanvasElement { return this.memo('podium', PODIUM_W, PODIUM_H, paintPodium); }
  smartboard(): HTMLCanvasElement { return this.memo('smartboard', SMARTBOARD_W, SMARTBOARD_H, paintSmartboard); }
  whiteboard(): HTMLCanvasElement { return this.memo('whiteboard', WHITEBOARD_W, WHITEBOARD_H, paintWhiteboard); }
  clock(): HTMLCanvasElement { return this.memo('clock', 12, 12, paintClock); }
  window(): HTMLCanvasElement { return this.memo('window', 16, 48, paintWindow); }
  plant(): HTMLCanvasElement { return this.memo('plant', 14, 22, paintPlant); }
  bin(): HTMLCanvasElement { return this.memo('bin', 10, 12, paintBin); }
  shadow(): HTMLCanvasElement { return this.memo('shadow', 12, 4, paintShadow); }
  keyPrompt(): HTMLCanvasElement { return this.memo('key-e', 11, 12, paintKeyPrompt); }
  emoteBang(): HTMLCanvasElement { return this.memo('emote-bang', 9, 12, paintEmoteBang); }

  // ---- quest visuals (Phase 2)
  giftBox(): HTMLCanvasElement { return this.memo('gift', GIFT_W, GIFT_H, paintGiftBox); }
  questArrow(): HTMLCanvasElement { return this.memo('quest-arrow', ARROW_W, ARROW_H, paintQuestArrow); }
  spotlight(): HTMLCanvasElement { return this.memo('spotlight', SPOTLIGHT_W, SPOTLIGHT_H, paintSpotlight); }

  projectorSlide(w: number, h: number): HTMLCanvasElement {
    return this.memo(`slide-${w}x${h}`, w, h, (p) => paintProjectorSlide(p, w, h));
  }

  speechBubble(text: string, color = '#1b1b24'): HTMLCanvasElement {
    const { w, h } = speechBubbleSize(text);
    return this.memo(`bubble-${color}-${text}`, w, h, (p) => paintSpeechBubble(p, text, color));
  }

  /** Front-facing standing frame of a character, for dialogue / UI portraits. */
  portrait(a: Appearance): HTMLCanvasElement {
    let img = this.portraits.get(a);
    if (!img) {
      const sheet = this.getCharacterSheet(a);
      const [canvas, ctx] = createCanvas(CHAR_W, CHAR_H);
      sheet.draw(ctx, 'down', 0, 0, 0);
      img = canvas;
      this.portraits.set(a, img);
    }
    return img;
  }

  floorTile(variant: number): HTMLCanvasElement {
    const v = variant % 3;
    return this.memo(`floor-${v}`, FLOOR_TILE, FLOOR_TILE, (p) => paintFloorTile(p, v));
  }

  private memo(key: string, w: number, h: number, paint: (p: Pen) => void): HTMLCanvasElement {
    let img = this.images.get(key);
    if (!img) {
      const [canvas, ctx] = createCanvas(w, h);
      paint(makePen(ctx));
      img = canvas;
      this.images.set(key, img);
    }
    return img;
  }

  private buildSheet(a: Appearance): CharacterSheet {
    const [canvas, ctx] = createCanvas(CHAR_W * FRAMES.length, CHAR_H * 4);
    for (const f of FRAMES) {
      const x = f * CHAR_W;
      paintStandingFrame(ctx, a, 'down', f, x, CharacterSheet.rowOf('down') * CHAR_H);
      paintStandingFrame(ctx, a, 'right', f, x, CharacterSheet.rowOf('right') * CHAR_H);
      paintStandingFrame(ctx, a, 'up', f, x, CharacterSheet.rowOf('up') * CHAR_H);
      // left = mirrored right
      ctx.save();
      ctx.translate(x + CHAR_W, CharacterSheet.rowOf('left') * CHAR_H);
      ctx.scale(-1, 1);
      paintStandingFrame(ctx, a, 'right', f, 0, 0);
      ctx.restore();
    }
    return new CharacterSheet(canvas, CHAR_W, CHAR_H);
  }
}
