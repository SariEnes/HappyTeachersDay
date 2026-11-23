import type { Direction, Vec2 } from '../core/geometry';
import type { Rng } from '../core/rng';
import type { CharacterSheet } from '../world/CharacterSheet';
import { Entity } from './Entity';
import type { Interactable } from './Interactable';

const NOTICE_DISTANCE = 44;
const EMOTE_DURATION = 1.2;
const IDLE_LOOKS: readonly Direction[] = ['down', 'down', 'down', 'left', 'right'];

/** A standing NPC (e.g. Şevki): idles, glances around, turns to face the player. */
export class NPC extends Entity implements Interactable {
  readonly interactionRadius = 24; // 1.5 tiles

  private lookTimer = 2;
  private emoteTimer = 0;
  private target: Entity | null = null;
  private onInteract: ((npc: NPC) => void) | null = null;

  constructor(
    readonly name: string,
    spawn: Vec2,
    sheet: CharacterSheet,
    shadow: CanvasImageSource,
    private readonly emoteSprite: CanvasImageSource,
    private readonly rng: Rng,
  ) {
    super(spawn, sheet, shadow);
  }

  setLookTarget(target: Entity | null): void {
    this.target = target;
  }

  /** Hook for quest logic (Phase 2+) — NPC itself stays quest-agnostic. */
  setOnInteract(handler: ((npc: NPC) => void) | null): void {
    this.onInteract = handler;
  }

  resetState(): void {
    this.emoteTimer = 0;
    this.lookTimer = 2;
  }

  update(dt: number): void {
    if (this.emoteTimer > 0) this.emoteTimer = Math.max(0, this.emoteTimer - dt);

    const t = this.target;
    if (t && Math.hypot(t.x - this.x, t.y - this.y) < NOTICE_DISTANCE) {
      this.faceTowards(t.x, t.y);
    } else {
      this.lookTimer -= dt;
      if (this.lookTimer <= 0) {
        this.facing = IDLE_LOOKS[Math.floor(this.rng() * IDLE_LOOKS.length)];
        this.lookTimer = 2 + this.rng() * 3;
      }
    }
    this.animate(dt, false);
  }

  // ------------------------------------------------------- Interactable

  getInteractionPoint(): Vec2 {
    return { x: this.x, y: this.y - 4 };
  }

  getPromptAnchor(alpha: number): Vec2 {
    const p = this.renderPosition(alpha);
    return { x: p.x, y: p.y - 26 };
  }

  canInteract(): boolean {
    return this.emoteTimer === 0;
  }

  interact(): void {
    this.emoteTimer = EMOTE_DURATION;
    if (this.target) this.faceTowards(this.target.x, this.target.y);
    this.onInteract?.(this);
  }

  /** Overlay drawn above everything else (after lighting). */
  drawOverlay(ctx: CanvasRenderingContext2D, alpha: number): void {
    if (this.emoteTimer <= 0) return;
    const a = this.getPromptAnchor(alpha);
    const pop = this.emoteTimer > EMOTE_DURATION - 0.1 ? 2 : 0;
    ctx.drawImage(this.emoteSprite, Math.round(a.x) - 4, Math.round(a.y) - 12 - pop);
  }
}
