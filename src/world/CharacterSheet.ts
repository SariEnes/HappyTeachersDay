import type { Direction } from '../core/geometry';
import type { WalkFrame } from './sprites/CharacterPainter';

const DIR_ROW: Readonly<Record<Direction, number>> = { down: 0, left: 1, right: 2, up: 3 };

/** A pre-rendered 3-frame × 4-direction sprite sheet for one character. */
export class CharacterSheet {
  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly frameWidth: number,
    readonly frameHeight: number,
  ) {}

  static rowOf(dir: Direction): number {
    return DIR_ROW[dir];
  }

  draw(ctx: CanvasRenderingContext2D, dir: Direction, frame: WalkFrame, x: number, y: number): void {
    const fw = this.frameWidth;
    const fh = this.frameHeight;
    ctx.drawImage(this.canvas, frame * fw, DIR_ROW[dir] * fh, fw, fh, x, y, fw, fh);
  }
}
