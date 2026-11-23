import type { Rect } from '../core/geometry';
import { mulberry32 } from '../core/rng';
import { AudioSynthesizer } from '../engine/AudioSynthesizer';
import { Camera } from '../engine/Camera';
import { Display } from '../engine/Display';
import type { Drawable } from '../engine/Drawable';
import { GameLoop } from '../engine/GameLoop';
import { InputManager } from '../engine/InputManager';
import type { Entity } from '../entities/Entity';
import { NPC } from '../entities/NPC';
import { Player } from '../entities/Player';
import { InteractionSystem } from '../systems/InteractionSystem';
import { QuestManager } from '../systems/QuestManager';
import { RoomEffects } from '../systems/RoomEffects';
import { ModalManager } from '../ui/ModalManager';
import { SoundToggle } from '../ui/SoundToggle';
import { TouchControls } from '../ui/TouchControls';
import { PROFESSOR, SEVKI, createRandomStudent } from '../world/Appearance';
import { ClassroomMap, MAP_ROWS, TILE } from '../world/ClassroomMap';
import { ClassroomRenderer, type ClassroomProps } from '../world/ClassroomRenderer';
import { CollisionWorld } from '../world/CollisionWorld';
import { SpriteCache } from '../world/SpriteCache';

export const VIEW_WIDTH = 384;
export const VIEW_HEIGHT = 256;
const CLASSROOM_SEED = 0x2411_2026; // 24 Nov — Teachers' Day

export interface GameOptions {
  fpsElement?: HTMLElement | null;
  hintElement?: HTMLElement | null;
  hudElement?: HTMLElement | null;
  /** Top-right HUD container that receives the [Sound: ON/OFF] toggle. */
  soundToggleHost?: HTMLElement | null;
}

/** Composition root: wires engine, world, entities, quest and UI together. */
export class Game {
  private readonly display: Display;
  private readonly input: InputManager;
  private readonly camera: Camera;
  private readonly map: ClassroomMap;
  private readonly renderer: ClassroomRenderer;
  private readonly loop: GameLoop;
  private readonly interactions: InteractionSystem;
  private readonly modals: ModalManager;
  private readonly quest: QuestManager;
  private readonly audio = new AudioSynthesizer();
  private readonly soundToggle: SoundToggle | null;
  private readonly touch: TouchControls;

  private readonly player: Player;
  private readonly sevki: NPC;
  private readonly entities: Entity[];
  private readonly props: ClassroomProps;
  private readonly drawList: Drawable[] = [];
  private readonly view: Rect = { x: 0, y: 0, w: VIEW_WIDTH, h: VIEW_HEIGHT };

  private time = 0;
  private fpsFrames = 0;
  private fpsTimer = performance.now();
  private hintHidden = false;
  private classStartTime = -1;

  constructor(canvas: HTMLCanvasElement, private readonly options: GameOptions = {}) {
    // Portrait phones get a taller view (up to the whole room height).
    this.display = new Display(canvas, VIEW_WIDTH, VIEW_HEIGHT, MAP_ROWS * TILE, (w, h) => this.onViewResize(w, h));
    this.input = new InputManager(window);

    const rng = mulberry32(CLASSROOM_SEED);
    const sprites = new SpriteCache();
    const map = new ClassroomMap(rng, createRandomStudent);
    const world = new CollisionWorld(map);
    this.map = map;

    this.renderer = new ClassroomRenderer(map, sprites);
    this.props = this.renderer.createProps();
    this.camera = new Camera(VIEW_WIDTH, this.display.height, map.width, map.height);
    this.view.h = this.display.height;

    const shadow = sprites.shadow();
    this.player = new Player(map.playerSpawn, sprites.getCharacterSheet(PROFESSOR), shadow, this.input, world, this.audio);
    this.sevki = new NPC('Şevki', map.sevkiSpawn, sprites.getCharacterSheet(SEVKI), shadow, sprites.emoteBang(), rng);
    this.sevki.setLookTarget(this.player);

    world.addBody(this.player);
    world.addBody(this.sevki);
    this.entities = [this.player, this.sevki];

    // ---- Phase 2: UI, room effects, quest state machine
    const hud = options.hudElement ?? document.getElementById('hud');
    this.modals = new ModalManager(hud, this.audio, () => [sprites.portrait(PROFESSOR), sprites.portrait(SEVKI)]);
    const toggleHost = options.soundToggleHost ?? document.getElementById('hud-right');
    this.soundToggle = toggleHost ? new SoundToggle(toggleHost, this.audio) : null;

    const effects = new RoomEffects({ map, sprites, props: this.props, world, player: this.player, rng });
    const presenter = map.questDesks.presenter.student ?? SEVKI;
    this.quest = new QuestManager({
      map,
      ui: this.modals,
      effects,
      player: this.player,
      sevki: this.sevki,
      portraits: { sevki: sprites.portrait(SEVKI), presenter: sprites.portrait(presenter) },
      onPlayAgain: () => this.resetGame(),
    });

    this.interactions = new InteractionSystem(this.player, this.input, sprites.keyPrompt(), this.quest);

    // ---- Mobile: touch-to-move, tap-to-interact, INTERACT button
    this.touch = new TouchControls(
      {
        canvas,
        camera: this.camera,
        player: this.player,
        focusedTarget: () => this.interactions.focusedTarget,
        isPaused: () => this.modals.isOpen,
      },
      this.input,
      sprites.touchRing(),
    );

    this.loop = new GameLoop(
      (dt) => this.update(dt),
      (alpha) => this.render(alpha),
    );
  }

  /** Starts rendering the live classroom behind the title screen; play begins on "Start Class". */
  start(): void {
    this.loop.start();
    void this.modals.titleScreen(() => this.beginClass());
  }

  /** Runs inside the Start gesture, so the AudioContext may be unlocked here. */
  private beginClass(): void {
    this.audio.unlock();
    this.audio.play('success');
    this.classStartTime = this.time;
  }

  destroy(): void {
    this.loop.stop();
    this.input.dispose();
    this.touch.dispose();
    this.display.dispose();
    this.modals.dispose();
    this.soundToggle?.dispose();
    this.audio.dispose();
  }

  /** "Play Again": quest back to step 0, everyone back to their spawn. */
  private resetGame(): void {
    this.quest.reset();
    this.player.teleport(this.map.playerSpawn, 'up');
    this.sevki.teleport(this.map.sevkiSpawn, 'down');
    this.interactions.clearFocus();
  }

  /** Display changed its internal height (phone rotated / resized). */
  private onViewResize(width: number, height: number): void {
    // Called once from the Display constructor too, before the camera exists.
    this.camera?.resize(width, height);
    this.view.w = width;
    this.view.h = height;
  }

  private update(dt: number): void {
    this.time += dt;
    const paused = this.modals.isOpen;
    // The key press that closed a modal must not also trigger an interaction.
    const swallowInput = this.modals.consumeJustClosed();

    this.player.frozen = paused;
    this.touch.update(dt);
    for (const e of this.entities) e.snapshot();
    for (const e of this.entities) e.update(dt);

    this.view.x = this.camera.x;
    this.view.y = this.camera.y;
    this.quest.update(dt, paused, this.view);

    if (paused || swallowInput) this.interactions.clearFocus();
    else this.interactions.update();
    this.input.endStep();

    if (!this.hintHidden && this.classStartTime >= 0 && this.time - this.classStartTime > 8 && this.options.hintElement) {
      this.options.hintElement.style.opacity = '0.35';
      this.hintHidden = true;
    }
  }

  private render(alpha: number): void {
    const ctx = this.display.ctx;
    const cam = this.camera;
    const focus = this.player.renderPosition(alpha);
    cam.follow(focus.x, focus.y - 12);

    // 1. static background slice
    this.renderer.drawBackground(ctx, cam);

    // 2. world: wall/floor decals, then depth-sorted objects
    const list = this.drawList;
    list.length = 0;
    for (const p of this.props.all) if (cam.isVisible(p.getBounds())) list.push(p);
    for (const e of this.entities) if (cam.isVisible(e.getBounds())) list.push(e);
    this.quest.collectDrawables(list);
    list.sort((a, b) => a.sortY - b.sortY);

    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    this.quest.drawBackdrop(ctx);
    for (const d of list) d.draw(ctx, alpha);
    ctx.restore();

    // 3. window daylight over everything in the room
    this.renderer.drawDaylight(ctx, cam);

    // 4. overlays in world space (effects, bubbles, prompts, emotes)
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    this.touch.drawOverlay(ctx);
    this.quest.drawOverlay(ctx, alpha);
    this.sevki.drawOverlay(ctx, alpha);
    this.interactions.drawOverlay(ctx, alpha, this.time);
    ctx.restore();

    this.trackFps();
  }

  private trackFps(): void {
    this.fpsFrames++;
    const now = performance.now();
    if (now - this.fpsTimer >= 500) {
      const fps = Math.round((this.fpsFrames * 1000) / (now - this.fpsTimer));
      if (this.options.fpsElement) this.options.fpsElement.textContent = `${fps} FPS`;
      this.fpsFrames = 0;
      this.fpsTimer = now;
    }
  }
}
