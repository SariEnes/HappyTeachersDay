import type { Direction, Rect, Vec2 } from '../core/geometry';
import type { Drawable } from '../engine/Drawable';
import type { CharacterSheet } from '../world/CharacterSheet';
import type { Body } from '../world/CollisionWorld';
import type { WalkFrame } from '../world/sprites/CharacterPainter';

const WALK_SEQUENCE: readonly WalkFrame[] = [1, 0, 2, 0];
const WALK_FRAME_TIME = 0.13;
const HITBOX_W = 10;
const HITBOX_H = 6;

/**
 * Base for every character in the world.
 * (x, y) is the centre of the character's feet; the sprite is drawn above it.
 * Keeps the previous position so rendering can interpolate between fixed steps.
 */
export abstract class Entity implements Drawable, Body {
  x: number;
  y: number;
  facing: Direction = 'down';

  private prevX: number;
  private prevY: number;
  private animTime = 0;
  private walking = false;
  private lastFrame: WalkFrame = 0;

  protected constructor(
    spawn: Vec2,
    private readonly sheet: CharacterSheet,
    private readonly shadow: CanvasImageSource,
  ) {
    this.x = this.prevX = spawn.x;
    this.y = this.prevY = spawn.y;
  }

  abstract update(dt: number): void;

  get sortY(): number {
    return this.y;
  }

  /** Call once at the start of every fixed update. */
  snapshot(): void {
    this.prevX = this.x;
    this.prevY = this.y;
  }

  renderPosition(alpha: number): Vec2 {
    return {
      x: this.prevX + (this.x - this.prevX) * alpha,
      y: this.prevY + (this.y - this.prevY) * alpha,
    };
  }

  hitboxAt(x: number, y: number): Rect {
    return { x: x - HITBOX_W / 2, y: y - HITBOX_H, w: HITBOX_W, h: HITBOX_H };
  }

  getHitbox(): Rect {
    return this.hitboxAt(this.x, this.y);
  }

  getBounds(): Rect {
    return { x: this.x - 8, y: this.y - 24, w: 16, h: 26 };
  }

  /** Instantly move (no interpolation smear), e.g. on game reset. */
  teleport(pos: Vec2, facing: Direction = this.facing): void {
    this.x = this.prevX = pos.x;
    this.y = this.prevY = pos.y;
    this.facing = facing;
    this.walking = false;
  }

  faceTowards(tx: number, ty: number): void {
    const dx = tx - this.x;
    const dy = ty - this.y;
    if (Math.abs(dx) > Math.abs(dy)) this.facing = dx < 0 ? 'left' : 'right';
    else this.facing = dy < 0 ? 'up' : 'down';
  }

  protected animate(dt: number, walking: boolean): void {
    if (walking) {
      if (!this.walking) this.animTime = 0;
      this.animTime += dt;
    }
    this.walking = walking;

    const frame = this.currentFrame();
    if (frame !== this.lastFrame) {
      if (frame !== 0) this.onFootstep();
      this.lastFrame = frame;
    }
  }

  /** Called each time a foot lands (walk frames 1 and 2). */
  protected onFootstep(): void {}

  private currentFrame(): WalkFrame {
    if (!this.walking) return 0;
    return WALK_SEQUENCE[Math.floor(this.animTime / WALK_FRAME_TIME) % WALK_SEQUENCE.length];
  }

  draw(ctx: CanvasRenderingContext2D, alpha: number): void {
    const pos = this.renderPosition(alpha);
    const px = Math.round(pos.x);
    const py = Math.round(pos.y);
    ctx.drawImage(this.shadow, px - 6, py - 3);
    this.sheet.draw(ctx, this.facing, this.currentFrame(), px - 8, py - 24);
  }
}
