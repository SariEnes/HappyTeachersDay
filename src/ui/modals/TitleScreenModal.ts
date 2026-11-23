import { button, el, pixelPortrait } from '../dom';
import type { ModalView } from '../ModalView';

/**
 * Opening overlay drawn over the live classroom. "Start Class" (or Enter / Space / E)
 * runs `onStart` inside the user gesture — that's where the AudioContext gets unlocked.
 */
export class TitleScreenModal implements ModalView<void> {
  readonly layout = 'title' as const;
  private start: () => void = () => undefined;

  constructor(
    private readonly onStart: () => void,
    private readonly portraits: readonly HTMLCanvasElement[],
  ) {}

  mount(host: HTMLElement, done: () => void): void {
    let started = false;
    this.start = () => {
      if (started) return;
      started = true;
      this.onStart();
      done();
    };

    host.classList.add('title-screen');

    const logo = el('h1', 'title-logo');
    logo.append(el('span', 'title-main', 'DO TO LEARN:'), el('span', 'title-tagline', 'The Presentation Trap'));
    host.append(logo);
    host.append(el('p', 'title-subtitle', "CEIT 111 — Teachers' Day Special"));

    if (this.portraits.length) {
      const cast = el('div', 'title-cast');
      for (const p of this.portraits) cast.append(pixelPortrait(p, 4));
      host.append(cast);
    }

    host.append(el('div', 'title-controls', 'Move: WASD / Arrows  •  Interact: E / Space'));

    const actions = el('div', 'title-actions');
    actions.append(button('Start Class', 'px-btn px-btn--start', () => this.start()));
    host.append(actions);
    host.append(el('div', 'title-blink', 'Press Enter to begin'));
  }

  onKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return;
    if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') {
      e.preventDefault();
      this.start();
    }
  }
}
