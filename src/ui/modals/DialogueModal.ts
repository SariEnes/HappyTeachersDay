import type { SoundPlayer } from '../../engine/AudioSynthesizer';
import type { DialogueOptions } from '../../systems/QuestManager';
import { button, el, pixelPortrait } from '../dom';
import type { ModalView } from '../ModalView';

const CHAR_MS = 18;

/** Bottom-of-screen RPG dialogue box with a typewriter effect. E / Enter / Space to continue. */
export class DialogueModal implements ModalView<void> {
  readonly layout = 'bottom' as const;

  private timer = 0;
  private shown = 0;
  private textEl!: HTMLElement;
  private finish!: () => void;

  constructor(
    private readonly options: DialogueOptions,
    private readonly sound: SoundPlayer,
  ) {}

  mount(host: HTMLElement, done: () => void): void {
    this.finish = done;
    host.classList.add('dialogue');

    if (this.options.portrait) {
      const frame = el('div', 'dialogue-portrait');
      frame.append(pixelPortrait(this.options.portrait, 4));
      host.append(frame);
    }

    const body = el('div', 'dialogue-body');
    body.append(el('div', 'dialogue-speaker', this.options.speaker));
    this.textEl = el('p', 'dialogue-text');
    body.append(this.textEl);
    const next = button('Continue [E]', 'px-btn px-btn--small', () => this.advance());
    const row = el('div', 'dialogue-actions');
    row.append(next);
    body.append(row);
    host.append(body);

    this.timer = window.setInterval(() => {
      this.shown++;
      this.render();
      const ch = this.options.text[this.shown - 1];
      if (this.shown % 2 === 0 && ch && ch.trim()) this.sound.play('blip');
      if (this.shown >= this.options.text.length) window.clearInterval(this.timer);
    }, CHAR_MS);
  }

  onKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return;
    if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      this.advance();
    }
  }

  dispose(): void {
    window.clearInterval(this.timer);
  }

  private advance(): void {
    if (this.shown < this.options.text.length) {
      this.shown = this.options.text.length;
      window.clearInterval(this.timer);
      this.render();
      return;
    }
    this.finish();
  }

  private render(): void {
    this.textEl.textContent = this.options.text.slice(0, this.shown);
  }
}
