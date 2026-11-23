import type { Rect } from '../core/geometry';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  spin: number;
  life: number;
  color: string;
}

const COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#c77dff', '#ff9f1c', '#ffffff'] as const;
const MAX_PARTICLES = 520;
const EMIT_RATE = 90; // particles / second while emitting
const GRAVITY = 60;
const TERMINAL_VY = 42;

/** Lightweight pixel confetti: 1×2 / 2×1 flakes that flutter as they fall. */
export class ConfettiSystem {
  private readonly particles: Particle[] = [];
  private emitTime = 0;
  private emitAcc = 0;

  /** Burst inside the current view, then keep raining from its top edge. */
  start(view: Rect, duration = 4): void {
    for (let i = 0; i < 140; i++) {
      this.spawn(view.x + Math.random() * view.w, view.y + Math.random() * view.h * 0.7, -10 - Math.random() * 60);
    }
    this.emitTime = duration;
  }

  clear(): void {
    this.particles.length = 0;
    this.emitTime = 0;
    this.emitAcc = 0;
  }

  update(dt: number, view: Rect): void {
    if (this.emitTime > 0) {
      this.emitTime -= dt;
      this.emitAcc += dt * EMIT_RATE;
      while (this.emitAcc >= 1) {
        this.spawn(view.x + Math.random() * view.w, view.y - 4, 10 + Math.random() * 20);
        this.emitAcc -= 1;
      }
    }

    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.phase += p.spin * dt;
      p.vy = Math.min(p.vy + GRAVITY * dt, TERMINAL_VY);
      p.x += (p.vx + Math.sin(p.phase) * 14) * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0 || p.y > view.y + view.h + 16) {
        ps[i] = ps[ps.length - 1];
        ps.pop();
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      const flat = Math.sin(p.phase * 2) > 0;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), flat ? 2 : 1, flat ? 1 : 2);
    }
  }

  private spawn(x: number, y: number, vy: number): void {
    if (this.particles.length >= MAX_PARTICLES) return;
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 16,
      vy,
      phase: Math.random() * Math.PI * 2,
      spin: 3 + Math.random() * 4,
      life: 4 + Math.random() * 2.5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    });
  }
}
