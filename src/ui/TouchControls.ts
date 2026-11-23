import type { Vec2 } from '../core/geometry';
import type { Camera } from '../engine/Camera';
import type { VirtualInputSink } from '../engine/InputManager';
import type { Entity } from '../entities/Entity';
import type { Interactable } from '../entities/Interactable';
import { button } from './dom';

export interface TouchContext {
  readonly canvas: HTMLCanvasElement;
  readonly camera: Camera;
  readonly player: Entity;
  /** Interactable currently in range (the one showing the floating [E] prompt). */
  focusedTarget(): Interactable | null;
  isPaused(): boolean;
}

const TAP_MAX_MS = 280;
const TAP_MAX_MOVE_PX = 10; // CSS px
const HOLD_DEAD_ZONE = 5; // world px around the steering point
const ARRIVE_DIST = 2.5;
const STUCK_TIME = 0.35;
const STEER_OFFSET_Y = 5; // steer by a point just above the feet, so the feet end up under the finger

/**
 * Mobile controls on top of the keyboard ones:
 *  - hold / drag on the canvas → the professor walks towards your finger (like a thumbstick
 *    centred on him); a quick tap → walks to that spot, or interacts if you tap the target;
 *  - an INTERACT button (touch devices only) that lights up when a target is in range.
 * Feeds the same InputManager actions, so gameplay code is unchanged.
 */
export class TouchControls {
  private pointerId: number | null = null;
  private screenPoint: Vec2 | null = null; // canvas logical px
  private downAt = 0;
  private downClient: Vec2 = { x: 0, y: 0 };
  private dragged = false;
  private destination: Vec2 | null = null; // world px (tap-to-walk)
  private ring: Vec2 | null = null;
  private lastPos: Vec2 = { x: 0, y: 0 };
  private stuck = 0;
  private time = 0;

  private readonly interactBtn: HTMLButtonElement;
  private btnState = '';

  constructor(
    private readonly ctx: TouchContext,
    private readonly sink: VirtualInputSink,
    private readonly ringSprite: HTMLCanvasElement,
    host: HTMLElement = document.body,
  ) {
    const c = ctx.canvas;
    c.addEventListener('pointerdown', this.onDown);
    c.addEventListener('pointermove', this.onMove);
    c.addEventListener('pointerup', this.onUp);
    c.addEventListener('pointercancel', this.onCancel);
    c.addEventListener('contextmenu', this.preventDefault);

    this.interactBtn = button('INTERACT', 'touch-interact');
    this.interactBtn.setAttribute('aria-label', 'Interact');
    this.interactBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault(); // no focus / no double-tap zoom
      this.sink.triggerAction('interact');
    });
    this.interactBtn.addEventListener('contextmenu', this.preventDefault);
    host.append(this.interactBtn);

    if (window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0) this.markTouchDevice();
  }

  dispose(): void {
    const c = this.ctx.canvas;
    c.removeEventListener('pointerdown', this.onDown);
    c.removeEventListener('pointermove', this.onMove);
    c.removeEventListener('pointerup', this.onUp);
    c.removeEventListener('pointercancel', this.onCancel);
    c.removeEventListener('contextmenu', this.preventDefault);
    this.interactBtn.remove();
  }

  /** Call once per fixed step, before the player updates. */
  update(dt: number): void {
    this.time += dt;
    const { camera, player } = this.ctx;
    this.syncButton();

    if (this.ctx.isPaused()) {
      this.destination = null;
      this.ring = null;
      this.sink.setVirtualAxis(null);
      return;
    }

    let axis: Vec2 | null = null;
    this.ring = null;

    if (this.pointerId !== null && this.screenPoint) {
      // Holding: steer towards the finger, re-projected through the moving camera.
      const target = { x: this.screenPoint.x + camera.x, y: this.screenPoint.y + camera.y };
      const dx = target.x - player.x;
      const dy = target.y - (player.y - STEER_OFFSET_Y);
      const d = Math.hypot(dx, dy);
      if (d > HOLD_DEAD_ZONE) axis = { x: dx / d, y: dy / d };
      this.ring = target;
    } else if (this.destination) {
      // Tap-to-walk: feet go to the tapped spot; give up if blocked by furniture.
      const dx = this.destination.x - player.x;
      const dy = this.destination.y - player.y;
      const d = Math.hypot(dx, dy);
      const progress = Math.hypot(player.x - this.lastPos.x, player.y - this.lastPos.y);
      this.stuck = progress < 0.2 ? this.stuck + dt : 0;
      if (d <= ARRIVE_DIST || this.stuck > STUCK_TIME) {
        this.destination = null;
      } else {
        axis = { x: dx / d, y: dy / d };
        this.ring = this.destination;
      }
    }

    this.lastPos = { x: player.x, y: player.y };
    this.sink.setVirtualAxis(axis);
  }

  /** World-space overlay (call inside the camera transform). */
  drawOverlay(ctx: CanvasRenderingContext2D): void {
    if (!this.ring) return;
    const pulse = Math.sin(this.time * 8) > 0 ? 0 : 1;
    ctx.globalAlpha = 0.85;
    ctx.drawImage(this.ringSprite, Math.round(this.ring.x) - 5, Math.round(this.ring.y) - 3 - pulse);
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------ pointer handling

  private readonly onDown = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' || this.pointerId !== null) return; // desktop mouse keeps its old behaviour
    e.preventDefault();
    this.markTouchDevice();
    this.ctx.canvas.setPointerCapture(e.pointerId);
    this.pointerId = e.pointerId;
    this.downAt = performance.now();
    this.downClient = { x: e.clientX, y: e.clientY };
    this.dragged = false;
    this.destination = null;
    this.screenPoint = this.toCanvas(e);
  };

  private readonly onMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    e.preventDefault();
    if (Math.hypot(e.clientX - this.downClient.x, e.clientY - this.downClient.y) > TAP_MAX_MOVE_PX) this.dragged = true;
    this.screenPoint = this.toCanvas(e);
  };

  private readonly onUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    e.preventDefault();
    const quick = performance.now() - this.downAt <= TAP_MAX_MS && !this.dragged;
    const p = this.toCanvas(e);
    this.release();
    if (quick && !this.ctx.isPaused()) this.handleTap({ x: p.x + this.ctx.camera.x, y: p.y + this.ctx.camera.y });
  };

  private readonly onCancel = (e: PointerEvent): void => {
    if (e.pointerId === this.pointerId) this.release();
  };

  private readonly preventDefault = (e: Event): void => e.preventDefault();

  private release(): void {
    this.pointerId = null;
    this.screenPoint = null;
    this.sink.setVirtualAxis(null);
  }

  private handleTap(world: Vec2): void {
    const target = this.ctx.focusedTarget();
    if (target && this.hitsTarget(target, world)) {
      this.destination = null;
      this.sink.triggerAction('interact');
      return;
    }
    this.destination = world;
    this.stuck = 0;
    this.lastPos = { x: this.ctx.player.x, y: this.ctx.player.y };
  }

  /** Generous hit area: the target itself, its floating [E] prompt, or anything between. */
  private hitsTarget(t: Interactable, w: Vec2): boolean {
    const pt = t.getInteractionPoint();
    const a = t.getPromptAnchor(1);
    if (Math.hypot(w.x - pt.x, w.y - pt.y) <= 18) return true;
    if (Math.abs(w.x - a.x) <= 10 && w.y >= a.y - 16 && w.y <= a.y + 4) return true;
    return Math.abs(w.x - pt.x) <= 12 && w.y >= a.y - 16 && w.y <= pt.y + 8;
  }

  private toCanvas(e: PointerEvent): Vec2 {
    const c = this.ctx.canvas;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * c.width) / r.width,
      y: ((e.clientY - r.top) * c.height) / r.height,
    };
  }

  private markTouchDevice(): void {
    document.body.classList.add('is-touch');
  }

  private syncButton(): void {
    const state = this.ctx.isPaused() ? 'hidden' : this.ctx.focusedTarget() ? 'ready' : 'idle';
    if (state === this.btnState) return;
    this.btnState = state;
    this.interactBtn.classList.toggle('is-hidden', state === 'hidden');
    this.interactBtn.classList.toggle('is-ready', state === 'ready');
  }
}
