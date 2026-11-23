import type { Rect } from '../core/geometry';
import type { Drawable } from '../engine/Drawable';

/** A static, depth-sorted sprite (desk unit, podium, plant…). */
type Sprite = CanvasImageSource & { width: number; height: number };

export class Prop implements Drawable {
  private readonly bounds: Rect;

  constructor(
    private image: Sprite,
    x: number,
    y: number,
    readonly sortY: number,
  ) {
    this.bounds = { x, y, w: image.width, h: image.height };
  }

  /** Swap the sprite (e.g. laptop screen turns green, student stands up). */
  setImage(image: Sprite): void {
    this.image = image;
    this.bounds.w = image.width;
    this.bounds.h = image.height;
  }

  getBounds(): Rect {
    return this.bounds;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.image, this.bounds.x, this.bounds.y);
  }
}
