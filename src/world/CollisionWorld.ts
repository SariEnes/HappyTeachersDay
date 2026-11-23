import { rectsOverlap, type Rect, type Vec2 } from '../core/geometry';
import type { ClassroomMap } from './ClassroomMap';

/** Anything with a solid hitbox anchored at its feet position. */
export interface Body {
  hitboxAt(x: number, y: number): Rect;
  getHitbox(): Rect;
}

const NUDGE_RANGE = 6; // px of corner forgiveness when sliding past desk corners
const MOSTLY_STRAIGHT = 0.35; // minor/major axis ratio still treated as a straight push

/**
 * Resolves movement against static map geometry and other bodies.
 * Axis-separated AABB sweep + corner nudging for buttery sliding.
 */
export class CollisionWorld {
  private readonly bodies: Body[] = [];
  private readonly scratch: Rect[] = [];

  constructor(private readonly map: ClassroomMap) {}

  addBody(body: Body): void {
    this.bodies.push(body);
  }

  removeBody(body: Body): void {
    const i = this.bodies.indexOf(body);
    if (i >= 0) this.bodies.splice(i, 1);
  }

  isFree(r: Rect, self?: Body): boolean {
    if (this.map.isBlocked(r)) return false;
    for (const b of this.bodies) if (b !== self && rectsOverlap(r, b.getHitbox())) return false;
    return true;
  }

  move(body: Body, x: number, y: number, dx: number, dy: number): Vec2 {
    let nx = x;
    let ny = y;
    let blockedX = false;
    let blockedY = false;

    if (dx !== 0) {
      const tx = this.sweepX(body, x, ny, dx);
      blockedX = tx !== x + dx;
      nx = tx;
    }
    if (dy !== 0) {
      const ty = this.sweepY(body, nx, y, dy);
      blockedY = ty !== y + dy;
      ny = ty;
    }

    // Corner assist: pushing (mostly) straight into a corner slides you around it.
    // "Mostly" matters for analog touch input, which is never perfectly axis-aligned.
    if (blockedX && Math.abs(dy) <= Math.abs(dx) * MOSTLY_STRAIGHT) {
      ny += this.nudge(body, nx, ny, Math.sign(dx), 0, Math.abs(dx), Math.sign(dy));
    } else if (blockedY && Math.abs(dx) <= Math.abs(dy) * MOSTLY_STRAIGHT) {
      nx += this.nudge(body, nx, ny, 0, Math.sign(dy), Math.abs(dy), Math.sign(dx));
    }

    return { x: nx, y: ny };
  }

  private collect(r: Rect, self: Body, startBox: Rect): Rect[] {
    const out = this.scratch;
    out.length = 0;
    this.map.collidersIn(r, out);
    for (const b of this.bodies) {
      if (b === self) continue;
      const hb = b.getHitbox();
      if (rectsOverlap(r, hb)) out.push(hb);
    }
    // Ignore anything we already overlap so a stuck body can always walk out.
    for (let i = out.length - 1; i >= 0; i--) if (rectsOverlap(startBox, out[i])) out.splice(i, 1);
    return out;
  }

  private sweepX(body: Body, x: number, y: number, dx: number): number {
    const start = body.hitboxAt(x, y);
    const target = x + dx;
    const r = body.hitboxAt(target, y);
    const hits = this.collect(r, body, start);
    let result = target;
    const leftOff = target - r.x;
    const rightOff = r.x + r.w - target;
    for (const s of hits) {
      if (dx > 0) result = Math.min(result, s.x - rightOff);
      else result = Math.max(result, s.x + s.w + leftOff);
    }
    return dx > 0 ? Math.max(result, x) : Math.min(result, x);
  }

  private sweepY(body: Body, x: number, y: number, dy: number): number {
    const start = body.hitboxAt(x, y);
    const target = y + dy;
    const r = body.hitboxAt(x, target);
    const hits = this.collect(r, body, start);
    let result = target;
    const topOff = target - r.y;
    const bottomOff = r.y + r.h - target;
    for (const s of hits) {
      if (dy > 0) result = Math.min(result, s.y - bottomOff);
      else result = Math.max(result, s.y + s.h + topOff);
    }
    return dy > 0 ? Math.max(result, y) : Math.min(result, y);
  }

  /** Returns a perpendicular offset (≤ speed) that frees the blocked direction, or 0. */
  private nudge(body: Body, x: number, y: number, dirX: number, dirY: number, speed: number, prefer = 0): number {
    const signs = prefer > 0 ? [1, -1] : [-1, 1]; // try the side the input leans towards first
    for (let o = 1; o <= NUDGE_RANGE; o++) {
      for (const sign of signs) {
        const off = sign * o;
        const px = dirY !== 0 ? x + off : x + dirX;
        const py = dirX !== 0 ? y + off : y + dirY;
        if (!this.isFree(body.hitboxAt(px, py), body)) continue;
        const step = sign * Math.min(o, speed);
        const sx = dirY !== 0 ? x + step : x;
        const sy = dirX !== 0 ? y + step : y;
        if (this.isFree(body.hitboxAt(sx, sy), body)) return step;
      }
    }
    return 0;
  }
}
