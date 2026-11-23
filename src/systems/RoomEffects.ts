import type { Rect, Vec2 } from '../core/geometry';
import { shuffle, type Rng } from '../core/rng';
import type { Drawable } from '../engine/Drawable';
import type { Entity } from '../entities/Entity';
import { NPC } from '../entities/NPC';
import type { ClassroomMap, DeskSlot } from '../world/ClassroomMap';
import type { ClassroomProps } from '../world/ClassroomRenderer';
import type { CollisionWorld } from '../world/CollisionWorld';
import type { SpriteCache } from '../world/SpriteCache';
import { ConfettiSystem } from './ConfettiSystem';

export interface RoomEffectsDeps {
  readonly map: ClassroomMap;
  readonly sprites: SpriteCache;
  readonly props: ClassroomProps;
  readonly world: CollisionWorld;
  readonly player: Entity;
  readonly rng: Rng;
}

/** A depth-sorted world drawable backed by a callback. */
class CallbackDrawable implements Drawable {
  constructor(
    readonly sortY: number,
    private readonly bounds: Rect,
    private readonly paint: (ctx: CanvasRenderingContext2D) => void,
  ) {}
  getBounds(): Rect { return this.bounds; }
  draw(ctx: CanvasRenderingContext2D): void { this.paint(ctx); }
}

interface Bubble {
  readonly desk: DeskSlot;
  readonly image: HTMLCanvasElement;
  readonly delay: number;
  readonly period: number;
}

const CHEERS: ReadonlyArray<[string, string]> = [
  ["Happy Teachers' Day!", '#c8102e'],
  ['Best Hocam!', '#1d3557'],
  ['Thank you, Hocam!', '#2b8a3e'],
  ['We DID to learn!', '#5f3dc4'],
];
const BUBBLE_ON_TIME = 2.6;
/** Spotlight trigger ellipse (normalised radii). */
const SPOT_RX = 24;
const SPOT_RY = 12;

/**
 * Every quest-driven change to the room's look: laptop screen, projector slide,
 * floor spotlight, the presenter standing up, confetti, cheering bubbles, gift box.
 * Knows nothing about quest *order* — QuestManager decides when to call what.
 */
export class RoomEffects {
  private time = 0;
  private laptopHighlight = false;
  private projectorOn = false;
  private spotlightOn = false;
  private giftVisible = false;
  private celebrateStart = -1;
  private presenter: NPC | null = null;
  private bubbles: Bubble[] = [];

  private readonly confetti = new ConfettiSystem();
  private readonly laptopGlow: CallbackDrawable;
  private readonly gift: CallbackDrawable;
  private readonly images: {
    laptopDesk: HTMLCanvasElement;
    laptopDeskFixed: HTMLCanvasElement;
    presenterDesk: HTMLCanvasElement;
    presenterDeskEmpty: HTMLCanvasElement;
  };

  constructor(private readonly deps: RoomEffectsDeps) {
    const { map, sprites } = deps;
    const { laptop, presenter } = map.questDesks;
    this.images = {
      laptopDesk: sprites.createDeskUnit(laptop.student, 'laptop'),
      laptopDeskFixed: sprites.createDeskUnit(laptop.student, 'laptopFixed'),
      presenterDesk: sprites.createDeskUnit(presenter.student, presenter.item),
      presenterDeskEmpty: sprites.createDeskUnit(null, presenter.item),
    };

    // pulsing frame around the front-left laptop (drawn right above its desk)
    const lx = laptop.x + 4;
    const ly = laptop.y - 9;
    this.laptopGlow = new CallbackDrawable(laptop.y + 14.01, { x: lx - 2, y: ly - 2, w: 12, h: 11 }, (ctx) => {
      const pulse = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(this.time * 5));
      ctx.fillStyle = `rgba(255,222,89,${pulse})`;
      ctx.fillRect(lx - 1, ly - 1, 10, 1);
      ctx.fillRect(lx - 1, ly + 7, 10, 1);
      ctx.fillRect(lx - 1, ly, 1, 7);
      ctx.fillRect(lx + 8, ly, 1, 7);
      ctx.fillStyle = `rgba(255,255,220,${pulse * 0.45})`;
      ctx.fillRect(lx + 2, ly + 2, 4, 3);
    });

    const giftImg = sprites.giftBox();
    const gp = map.giftPos;
    this.gift = new CallbackDrawable(deps.props.podium.sortY + 0.01, { x: gp.x, y: gp.y, w: giftImg.width, h: giftImg.height }, (ctx) => {
      ctx.drawImage(giftImg, gp.x, gp.y);
    });
  }

  // ------------------------------------------------------------ toggles

  setLaptopHighlight(on: boolean): void {
    this.laptopHighlight = on;
  }

  setLaptopFixed(fixed: boolean): void {
    const desk = this.deps.map.questDesks.laptop;
    this.deps.props.desks.get(desk.id)?.setImage(fixed ? this.images.laptopDeskFixed : this.images.laptopDesk);
  }

  setProjectorSlide(on: boolean): void {
    this.projectorOn = on;
  }

  setSpotlight(on: boolean): void {
    this.spotlightOn = on;
  }

  setGiftVisible(on: boolean): void {
    this.giftVisible = on;
  }

  isInSpotlight(x: number, y: number): boolean {
    if (!this.spotlightOn) return false;
    const c = this.deps.map.spotlightCenter;
    const nx = (x - c.x) / SPOT_RX;
    const ny = (y - c.y) / SPOT_RY;
    return nx * nx + ny * ny <= 1;
  }

  /** The front-row student gets up and stands in the aisle beside their desk. */
  standUpPresenter(): void {
    if (this.presenter) return;
    const { map, sprites, props, world, player, rng } = this.deps;
    const desk = map.questDesks.presenter;
    if (!desk.student) return;
    props.desks.get(desk.id)?.setImage(this.images.presenterDeskEmpty);
    const npc = new NPC('Student', map.presenterStandPos, sprites.getCharacterSheet(desk.student), sprites.shadow(), sprites.emoteBang(), rng);
    npc.setLookTarget(player);
    npc.faceTowards(player.x, player.y);
    world.addBody(npc);
    this.presenter = npc;
  }

  sitDownPresenter(): void {
    if (!this.presenter) return;
    const desk = this.deps.map.questDesks.presenter;
    this.deps.props.desks.get(desk.id)?.setImage(this.images.presenterDesk);
    this.deps.world.removeBody(this.presenter);
    this.presenter = null;
  }

  /** Confetti across the room + students cheering in speech bubbles. */
  celebrate(view: Rect): void {
    this.confetti.start(view, 4.5);
    this.celebrateStart = this.time;
    const { map, sprites, rng } = this.deps;
    const seated = shuffle(rng, map.desks.filter((d) => d.student && d !== map.questDesks.presenter));
    // spread cheering students across front, middle and back rows
    const picks = [...seated].sort((a, b) => a.row - b.row).filter((_, i) => i % 4 === 0).slice(0, 11);
    this.bubbles = picks.map((desk, i) => {
      const [text, color] = CHEERS[i % CHEERS.length];
      return { desk, image: sprites.speechBubble(text, color), delay: i * 0.25, period: 4 + rng() * 3 };
    });
  }

  reset(): void {
    this.time = 0;
    this.laptopHighlight = false;
    this.projectorOn = false;
    this.spotlightOn = false;
    this.giftVisible = false;
    this.celebrateStart = -1;
    this.bubbles = [];
    this.confetti.clear();
    this.sitDownPresenter();
    this.setLaptopFixed(false);
  }

  // ------------------------------------------------------------ frame hooks

  update(dt: number, view: Rect): void {
    this.time += dt;
    this.confetti.update(dt, view);
    if (this.presenter) {
      this.presenter.snapshot();
      this.presenter.update(dt);
    }
  }

  collectDrawables(out: Drawable[]): void {
    if (this.laptopHighlight) out.push(this.laptopGlow);
    if (this.giftVisible) out.push(this.gift);
    if (this.presenter) out.push(this.presenter);
  }

  /** World-space, after the static background and before depth-sorted objects. */
  drawBackdrop(ctx: CanvasRenderingContext2D): void {
    const { map, sprites } = this.deps;
    if (this.projectorOn) {
      const r = map.projectorScreenRect;
      ctx.drawImage(sprites.projectorSlide(r.w, r.h), r.x, r.y);
    }
    if (this.spotlightOn) {
      const s = sprites.spotlight();
      const c = map.spotlightCenter;
      ctx.drawImage(s, c.x - s.width / 2, c.y - s.height / 2);
    }
  }

  /** World-space, after lighting: beams, sparkles, confetti, cheering bubbles, quest marker. */
  drawOverlay(ctx: CanvasRenderingContext2D, marker: Vec2 | null): void {
    const { map, sprites } = this.deps;

    if (this.spotlightOn) {
      // additive glow so whoever stands in it is lit up
      const s = sprites.spotlight();
      const c = map.spotlightCenter;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.28 + 0.1 * Math.sin(this.time * 3);
      ctx.drawImage(s, c.x - s.width / 2, c.y - s.height / 2);
      ctx.restore();
    }

    if (this.projectorOn) {
      const r = map.projectorScreenRect;
      ctx.fillStyle = `rgba(255,255,230,${0.18 + 0.06 * Math.sin(this.time * 2)})`;
      ctx.fillRect(r.x - 1, r.y - 1, r.w + 2, 1);
      ctx.fillRect(r.x - 1, r.y + r.h, r.w + 2, 1);
    }

    if (this.giftVisible) this.drawSparkles(ctx);

    this.confetti.draw(ctx);
    this.drawBubbles(ctx);

    if (marker) {
      const arrow = sprites.questArrow();
      const bob = Math.round(Math.abs(Math.sin(this.time * 4)) * -3);
      ctx.drawImage(arrow, Math.round(marker.x) - 3, Math.round(marker.y) - 8 + bob);
    }
  }

  private drawSparkles(ctx: CanvasRenderingContext2D): void {
    const gp = this.deps.map.giftPos;
    const spots: Array<[number, number]> = [[-3, 2], [13, 0], [6, -5], [15, 9], [-2, 10]];
    spots.forEach(([dx, dy], i) => {
      const t = (this.time * 2 + i * 0.37) % 1;
      if (t > 0.5) return;
      const big = t < 0.25;
      ctx.fillStyle = '#fff6b0';
      const x = gp.x + dx;
      const y = gp.y + dy;
      ctx.fillRect(x, y, 1, 1);
      if (big) {
        ctx.fillRect(x - 1, y, 3, 1);
        ctx.fillRect(x, y - 1, 1, 3);
      }
    });
  }

  private drawBubbles(ctx: CanvasRenderingContext2D): void {
    if (this.celebrateStart < 0) return;
    const elapsed = this.time - this.celebrateStart;
    for (const b of this.bubbles) {
      const t = elapsed - b.delay;
      if (t < 0) continue;
      const local = t % b.period;
      if (local > BUBBLE_ON_TIME) continue;
      const pop = local < 0.12 ? 1 : 0;
      const img = b.image;
      const x = Math.round(b.desk.x + 8 - img.width / 2);
      const y = Math.round(b.desk.y - 8 - img.height + 5) - pop;
      ctx.drawImage(img, x, y);
    }
  }
}
