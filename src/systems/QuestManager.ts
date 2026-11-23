import type { Rect, Vec2 } from '../core/geometry';
import type { Drawable } from '../engine/Drawable';
import type { Entity } from '../entities/Entity';
import type { Interactable } from '../entities/Interactable';
import type { NPC } from '../entities/NPC';
import { PointInteractable } from '../entities/PointInteractable';
import type { ClassroomMap } from '../world/ClassroomMap';
import type { InteractableProvider } from './InteractionSystem';
import type { RoomEffects } from './RoomEffects';

export enum QuestStep {
  TalkToSevki = 0,
  FixFormatting = 1,
  OrderPipeline = 2,
  Presentation = 3,
  OpenGift = 4,
}

export const TOTAL_STEPS = 4;

export interface DialogueOptions {
  readonly speaker: string;
  readonly text: string;
  readonly portrait?: HTMLCanvasElement;
}

export type CertificateChoice = 'replay' | 'close';

/** Everything the quest needs from the UI layer (implemented by ModalManager). */
export interface QuestUI {
  setObjective(text: string): void;
  dialogue(options: DialogueOptions): Promise<void>;
  formattingQuiz(): Promise<void>;
  pipelinePuzzle(): Promise<void>;
  presentation(): Promise<void>;
  certificate(): Promise<CertificateChoice>;
}

export interface QuestDeps {
  readonly map: ClassroomMap;
  readonly ui: QuestUI;
  readonly effects: RoomEffects;
  readonly player: Entity;
  readonly sevki: NPC;
  readonly portraits: { readonly sevki: HTMLCanvasElement; readonly presenter: HTMLCanvasElement };
  /** Called when the player chooses "Play Again" on the final card. */
  readonly onPlayAgain: () => void;
}

const OBJECTIVES: Readonly<Record<QuestStep, string>> = {
  [QuestStep.TalkToSevki]: 'Talk to Şevki',
  [QuestStep.FixFormatting]: 'Check the glowing laptop',
  [QuestStep.OrderPipeline]: 'Use the podium',
  [QuestStep.Presentation]: 'Step into the spotlight',
  [QuestStep.OpenGift]: 'Open the golden gift',
};

const TEXT = {
  sevki:
    "Welcome, Hocam! Happy Teachers' Day. The students prepared a special surprise for you, and the projector is locked until we complete a few required tasks from your syllabus. Today, you don't just teach—you DO to learn!",
  presenter:
    "Great slides, Hocam! Now, could you please stay in the spotlight and present them to the class? Just a quick 2-minute summary—and please don't read directly from the slides!",
} as const;

/**
 * Quest state machine (steps 0 → 4). Decides which single target is active,
 * runs each step's UI flow, and tells RoomEffects what to change in the room.
 */
export class QuestManager implements InteractableProvider {
  private step: QuestStep = QuestStep.TalkToSevki;
  private busy = false;
  private paused = false;
  private generation = 0;
  private lastView: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private readonly targets: Readonly<Record<QuestStep, Interactable>>;
  private readonly activeList: Interactable[] = [];

  constructor(private readonly deps: QuestDeps) {
    const { map, sevki } = deps;
    sevki.setOnInteract(() => this.run(() => this.talkToSevki()));

    const desk = map.questDesks.laptop;
    const podiumPrompt = { x: map.podiumInteractPoint.x, y: map.podiumPos.y - 2 };
    const sc = map.spotlightCenter;
    this.targets = {
      [QuestStep.TalkToSevki]: sevki,
      [QuestStep.FixFormatting]: new PointInteractable(
        { x: desk.x + 8, y: desk.y },
        { x: desk.x + 8, y: desk.y - 10 },
        () => this.run(() => this.fixFormatting()),
      ),
      [QuestStep.OrderPipeline]: new PointInteractable(
        map.podiumInteractPoint,
        podiumPrompt,
        () => this.run(() => this.orderPipeline()),
      ),
      [QuestStep.Presentation]: new PointInteractable(
        sc,
        { x: sc.x, y: sc.y - 26 },
        () => this.run(() => this.presentationTrap()),
      ),
      [QuestStep.OpenGift]: new PointInteractable(
        map.podiumInteractPoint,
        { x: map.giftPos.x + 6, y: map.giftPos.y - 2 },
        () => this.run(() => this.openGift()),
      ),
    };
    this.setStep(QuestStep.TalkToSevki);
  }

  get currentStep(): QuestStep {
    return this.step;
  }

  // ------------------------------------------------------- InteractableProvider

  getInteractables(): readonly Interactable[] {
    this.activeList.length = 0;
    if (!this.busy) this.activeList.push(this.targets[this.step]);
    return this.activeList;
  }

  // ------------------------------------------------------- frame hooks

  update(dt: number, paused: boolean, view: Rect): void {
    this.paused = paused;
    this.lastView = view;
    this.deps.effects.update(dt, view);

    // Step 3 also triggers just by walking into the spotlight.
    const p = this.deps.player;
    if (!paused && !this.busy && this.step === QuestStep.Presentation && this.deps.effects.isInSpotlight(p.x, p.y)) {
      this.run(() => this.presentationTrap());
    }
  }

  collectDrawables(out: Drawable[]): void {
    this.deps.effects.collectDrawables(out);
  }

  drawBackdrop(ctx: CanvasRenderingContext2D): void {
    this.deps.effects.drawBackdrop(ctx);
  }

  drawOverlay(ctx: CanvasRenderingContext2D, alpha: number): void {
    this.deps.effects.drawOverlay(ctx, this.markerAnchor(alpha));
  }

  /** Back to step 0 with a pristine room. */
  reset(): void {
    this.generation++;
    this.busy = false;
    this.deps.effects.reset();
    this.deps.sevki.resetState();
    this.setStep(QuestStep.TalkToSevki);
  }

  // ------------------------------------------------------- step flows

  private async talkToSevki(): Promise<void> {
    await this.deps.ui.dialogue({ speaker: 'Şevki', text: TEXT.sevki, portrait: this.deps.portraits.sevki });
    this.setStep(QuestStep.FixFormatting);
  }

  private async fixFormatting(): Promise<void> {
    await this.deps.ui.formattingQuiz();
    this.deps.effects.setLaptopFixed(true);
    this.setStep(QuestStep.OrderPipeline);
  }

  private async orderPipeline(): Promise<void> {
    await this.deps.ui.pipelinePuzzle();
    this.deps.effects.setProjectorSlide(true);
    this.deps.effects.setSpotlight(true);
    this.setStep(QuestStep.Presentation);
  }

  private async presentationTrap(): Promise<void> {
    const { effects, ui, player, portraits } = this.deps;
    player.facing = 'down';
    effects.standUpPresenter();
    await ui.dialogue({ speaker: 'Front-Row Student', text: TEXT.presenter, portrait: portraits.presenter });
    await ui.presentation();
    effects.sitDownPresenter();
    effects.celebrate(this.lastView);
    effects.setGiftVisible(true);
    this.setStep(QuestStep.OpenGift);
  }

  private async openGift(): Promise<void> {
    const choice = await this.deps.ui.certificate();
    if (choice === 'replay') this.deps.onPlayAgain();
  }

  // ------------------------------------------------------- helpers

  private setStep(step: QuestStep): void {
    this.step = step;
    this.deps.effects.setLaptopHighlight(step === QuestStep.FixFormatting);
    this.deps.ui.setObjective(`${OBJECTIVES[step]} (${step}/${TOTAL_STEPS})`);
  }

  /** Runs one step's async flow; ignores re-entry and results from before a reset. */
  private run(flow: () => Promise<void>): void {
    if (this.busy) return;
    this.busy = true;
    const gen = this.generation;
    flow()
      .catch((err) => console.error('[quest]', err))
      .finally(() => {
        if (gen === this.generation) this.busy = false;
      });
  }

  /** Golden arrow over the active target while the player is out of reach. */
  private markerAnchor(alpha: number): Vec2 | null {
    if (this.busy || this.paused) return null;
    const target = this.targets[this.step];
    const pt = target.getInteractionPoint();
    const p = this.deps.player;
    if (Math.hypot(pt.x - p.x, pt.y - p.y) <= target.interactionRadius) return null;
    const a = target.getPromptAnchor(alpha);
    return { x: a.x, y: a.y - 4 };
  }
}
