import type { SoundPlayer } from '../../engine/AudioSynthesizer';
import type { CertificateChoice } from '../../systems/QuestManager';
import { button, el, pixelPortrait } from '../dom';
import type { ModalView } from '../ModalView';

/** Step 4 — the full-screen Teachers' Day card, formatted by the professor's own rules. */
export class CertificateModal implements ModalView<CertificateChoice> {
  readonly layout = 'fullscreen' as const;

  constructor(
    private readonly portraits: readonly HTMLCanvasElement[],
    private readonly sound: SoundPlayer,
  ) {}

  mount(host: HTMLElement, done: (choice: CertificateChoice) => void): void {
    this.sound.play('fanfare');
    this.sound.play('applause');
    const card = el('div', 'cert');
    const inner = el('div', 'cert-inner');

    inner.append(el('div', 'cert-ribbon', 'CEIT 111 · METU · 24 NOVEMBER 2026'));
    inner.append(el('h1', 'cert-title', "HAPPY TEACHERS' DAY, HOCAM!"));

    if (this.portraits.length) {
      const row = el('div', 'cert-portraits');
      for (const p of this.portraits) row.append(pixelPortrait(p, 4));
      inner.append(row);
    }

    inner.append(
      el(
        'p',
        'cert-body',
        "Thank you for inspiring us in CEIT 111. We didn't just learn to do—we DID to learn! (And yes, we checked the parentheses and references.)",
      ),
    );

    const refs = el('div', 'cert-refs');
    refs.append(el('div', 'cert-refs-title', 'References'));
    const r1 = el('div', 'cert-ref');
    r1.append(
      document.createTextNode('1. You, Hocam. (2026). '),
      el('em', undefined, '"Do to Learn: Mastering Presentations & Formatting."'),
      document.createTextNode(' CEIT 111 Lectures, METU.'),
    );
    const r2 = el('div', 'cert-ref');
    r2.append(
      document.createTextNode('2. Şevki. (2026). '),
      el('em', undefined, 'Classroom Survival & Technical Support Guide'),
      document.createTextNode('.'),
    );
    refs.append(r1, r2);
    inner.append(refs);
    inner.append(el('div', 'cert-pagenum', '(1)'));

    card.append(inner);
    host.append(card);

    const actions = el('div', 'cert-actions');
    actions.append(
      button('Play Again', 'px-btn px-btn--ok', () => done('replay')),
      button('Keep Celebrating', 'px-btn px-btn--ghost', () => done('close')),
    );
    host.append(actions);
  }

  onKeyDown(e: KeyboardEvent): void {
    // swallow E so it doesn't leak into the game while the card is open
    if (e.code === 'KeyE') e.preventDefault();
  }
}
