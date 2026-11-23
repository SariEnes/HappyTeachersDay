import type { SoundPlayer } from '../../engine/AudioSynthesizer';
import { button, el } from '../dom';
import type { ModalView } from '../ModalView';

const PROMPTS: ReadonlyArray<{ line: string; reaction: string; gain: number }> = [
  { line: 'We must DO to learn, not learn to do!', reaction: 'The front row nods so hard their glasses slip.', gain: 34 },
  { line: 'Is this clear? Any questions from the back rows?', reaction: 'The back row wakes up and waves enthusiastically!', gain: 33 },
  { line: 'Pay attention, this will be on the midterm!', reaction: 'Forty-six pens start writing at once.', gain: 33 },
];
const SEGMENTS = 20;

/** Step 3 — present in the spotlight and fill the Class Applause Meter to 100%. */
export class PresentationModal implements ModalView<void> {
  readonly layout = 'center' as const;
  private value = 0;
  private closeTimer = 0;

  constructor(private readonly sound: SoundPlayer) {}

  mount(host: HTMLElement, done: () => void): void {
    host.append(el('div', 'modal-kicker', 'In the spotlight'));
    host.append(el('h2', 'modal-title', 'The Presentation Trap'));
    host.append(el('p', 'modal-prompt', "Present your slides — and don't read from them! Pick your lines, Hocam:"));

    const meterWrap = el('div', 'meter');
    const meterHead = el('div', 'meter-head');
    const pct = el('span', 'meter-pct', '0%');
    meterHead.append(el('span', undefined, 'Class Applause Meter'), pct);
    const bar = el('div', 'meter-bar');
    const segs: HTMLElement[] = [];
    for (let i = 0; i < SEGMENTS; i++) {
      const s = el('span', 'meter-seg');
      segs.push(s);
      bar.append(s);
    }
    meterWrap.append(meterHead, bar);
    host.append(meterWrap);

    const log = el('div', 'reaction-log');
    const choices = el('div', 'choices');
    PROMPTS.forEach(({ line, reaction, gain }) => {
      const b = button(`“${line}”`, 'px-btn');
      b.addEventListener('click', () => {
        b.disabled = true;
        this.value = Math.min(100, this.value + gain);
        pct.textContent = `${this.value}%`;
        const lit = Math.round((this.value / 100) * SEGMENTS);
        segs.forEach((s, i) => s.classList.toggle('on', i < lit));
        log.append(el('div', 'reaction', `» ${reaction}`));
        if (this.value < 100) this.sound.play('success');
        if (this.value >= 100) {
          this.sound.play('fanfare');
          this.sound.play('applause');
          meterWrap.classList.add('full');
          log.append(el('div', 'reaction reaction--big', 'STANDING OVATION!'));
          this.closeTimer = window.setTimeout(done, 1700);
        }
      });
      choices.append(b);
    });
    host.append(choices, log);
  }

  dispose(): void {
    window.clearTimeout(this.closeTimer);
  }
}
