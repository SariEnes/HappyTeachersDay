import type { SoundPlayer } from '../engine/AudioSynthesizer';
import type { CertificateChoice, DialogueOptions, QuestUI } from '../systems/QuestManager';
import { el } from './dom';
import './modal.css';
import { CertificateModal } from './modals/CertificateModal';
import { DialogueModal } from './modals/DialogueModal';
import { FormattingModal } from './modals/FormattingModal';
import { PipelineModal } from './modals/PipelineModal';
import { PresentationModal } from './modals/PresentationModal';
import { TitleScreenModal } from './modals/TitleScreenModal';
import type { ModalView } from './ModalView';

/**
 * Pixel-art HTML overlay: shows one modal at a time (requests are queued),
 * exposes `isOpen` so the game can pause movement, and owns the objective HUD.
 */
export class ModalManager implements QuestUI {
  private readonly overlay: HTMLElement;
  private readonly objective: HTMLElement;
  private active: ModalView<unknown> | null = null;
  private justClosed = false;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    hudHost: HTMLElement | null,
    private readonly sound: SoundPlayer,
    private readonly castPortraits: () => HTMLCanvasElement[] = () => [],
  ) {
    this.overlay = el('div', 'modal-overlay');
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-modal', 'true');
    document.body.append(this.overlay);

    this.objective = el('div', 'objective');
    (hudHost ?? document.body).append(this.objective);

    window.addEventListener('keydown', this.onKeyDown);
  }

  get isOpen(): boolean {
    return this.active !== null;
  }

  /** True once right after a modal closes — lets the game swallow the closing key press. */
  consumeJustClosed(): boolean {
    const v = this.justClosed;
    this.justClosed = false;
    return v;
  }

  open<T>(view: ModalView<T>): Promise<T> {
    const next = this.queue.then(() => this.show(view));
    this.queue = next.catch(() => undefined);
    return next;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    this.active?.dispose?.();
    this.overlay.remove();
    this.objective.remove();
  }

  // ------------------------------------------------------- QuestUI

  /** Opening title overlay; `onStart` runs inside the click/keypress gesture. */
  titleScreen(onStart: () => void): Promise<void> {
    return this.open(new TitleScreenModal(onStart, this.castPortraits()));
  }

  setObjective(text: string): void {
    this.objective.replaceChildren(el('span', 'objective-label', 'Objective: '), document.createTextNode(text));
    this.objective.classList.remove('flash');
    void this.objective.offsetWidth;
    this.objective.classList.add('flash');
  }

  dialogue(options: DialogueOptions): Promise<void> {
    return this.open(new DialogueModal(options, this.sound));
  }

  formattingQuiz(): Promise<void> {
    return this.open(new FormattingModal(this.sound));
  }

  pipelinePuzzle(): Promise<void> {
    return this.open(new PipelineModal(this.sound));
  }

  presentation(): Promise<void> {
    return this.open(new PresentationModal(this.sound));
  }

  certificate(): Promise<CertificateChoice> {
    return this.open(new CertificateModal(this.castPortraits(), this.sound));
  }

  // ------------------------------------------------------- internals

  private show<T>(view: ModalView<T>): Promise<T> {
    return new Promise<T>((resolve) => {
      const panel = el('div', 'modal');
      panel.tabIndex = -1;
      this.overlay.dataset.layout = view.layout;
      this.overlay.replaceChildren(panel);
      this.overlay.classList.add('open');
      this.active = view as ModalView<unknown>;

      let closed = false;
      view.mount(panel, (result: T) => {
        if (closed) return;
        closed = true;
        view.dispose?.();
        this.overlay.classList.remove('open');
        this.overlay.replaceChildren();
        this.active = null;
        this.justClosed = true;
        resolve(result);
      });
      // focus the panel (not a button) so Space/Enter don't double-trigger clicks
      panel.focus({ preventScroll: true });
    });
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    this.active?.onKeyDown?.(e);
  };
}
