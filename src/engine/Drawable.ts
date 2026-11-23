import type { Rect } from '../core/geometry';

/** Anything that is depth-sorted by its "feet" Y coordinate and drawn in world space. */
export interface Drawable {
  readonly sortY: number;
  getBounds(): Rect;
  draw(ctx: CanvasRenderingContext2D, alpha: number): void;
}
