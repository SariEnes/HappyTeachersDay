import { clamp, type Rect } from '../core/geometry';

export class Camera {
  x = 0;
  y = 0;

  constructor(
    readonly viewWidth: number,
    readonly viewHeight: number,
    private readonly worldWidth: number,
    private readonly worldHeight: number,
  ) {}

  /** Centre on a target; result is snapped to whole pixels to avoid shimmer. */
  follow(targetX: number, targetY: number): void {
    this.x = clamp(Math.round(targetX) - this.viewWidth / 2, 0, Math.max(0, this.worldWidth - this.viewWidth));
    this.y = clamp(Math.round(targetY) - this.viewHeight / 2, 0, Math.max(0, this.worldHeight - this.viewHeight));
  }

  isVisible(r: Rect): boolean {
    return (
      r.x + r.w > this.x &&
      r.x < this.x + this.viewWidth &&
      r.y + r.h > this.y &&
      r.y < this.y + this.viewHeight
    );
  }
}
