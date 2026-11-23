import type { SoundPlayer } from '../../engine/AudioSynthesizer';
import { button, el } from '../dom';
import type { ModalView } from '../ModalView';

export const PIPELINE_ORDER = ['Input', 'Processing', 'Output', 'Storage', 'Communications'] as const;
type Stage = (typeof PIPELINE_ORDER)[number];

const STAGE_COLOR: Readonly<Record<Stage, string>> = {
  Input: 'stage--input',
  Processing: 'stage--processing',
  Output: 'stage--output',
  Storage: 'stage--storage',
  Communications: 'stage--comms',
};

function shuffledStages(): Stage[] {
  const s = [...PIPELINE_ORDER];
  do {
    for (let i = s.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [s[i], s[j]] = [s[j], s[i]];
    }
  } while (s.filter((x, i) => x === PIPELINE_ORDER[i]).length > 1); // at most one already in place
  return s;
}

/** Step 2 — order the 5 basic computer operations. Click-to-swap or drag-and-drop. */
export class PipelineModal implements ModalView<void> {
  readonly layout = 'center' as const;

  private order: Stage[] = shuffledStages();
  private selected = -1;
  private marks: Array<'right' | 'wrong' | null> = [];
  private solved = false;
  private closeTimer = 0;

  constructor(private readonly sound: SoundPlayer) {}
  private list!: HTMLElement;
  private feedback!: HTMLElement;

  mount(host: HTMLElement, done: () => void): void {
    host.append(el('div', 'modal-kicker', "Teacher's podium"));
    host.append(el('h2', 'modal-title', 'Basic Computer Operations'));
    host.append(
      el('p', 'modal-prompt', 'Arrange the operations into the correct pipeline. Click two blocks to swap them, or drag & drop.'),
    );

    this.list = el('div', 'pipeline');
    host.append(this.list);

    this.feedback = el('div', 'modal-feedback');
    const verify = button('Verify Pipeline', 'px-btn px-btn--ok', () => {
      if (this.solved) return;
      this.marks = this.order.map((s, i) => (s === PIPELINE_ORDER[i] ? 'right' : 'wrong'));
      if (this.marks.every((m) => m === 'right')) {
        this.solved = true;
        this.sound.play('success');
        verify.disabled = true;
        this.feedback.className = 'modal-feedback ok';
        this.feedback.textContent = 'Pipeline verified! The projector is warming up...';
        this.closeTimer = window.setTimeout(done, 1400);
      } else {
        this.sound.play('error');
        this.feedback.className = 'modal-feedback warn';
        this.feedback.textContent = 'Check the order from our CEIT 111 slides, Hocam!';
        void this.feedback.offsetWidth;
        this.feedback.classList.add('shake');
      }
      this.render();
    });
    const actions = el('div', 'modal-actions');
    actions.append(verify);
    host.append(actions, this.feedback);
    this.render();
  }

  dispose(): void {
    window.clearTimeout(this.closeTimer);
  }

  private swap(a: number, b: number): void {
    if (this.solved || a === b || a < 0 || b < 0) return;
    [this.order[a], this.order[b]] = [this.order[b], this.order[a]];
    this.marks = [];
    this.feedback.className = 'modal-feedback';
    this.feedback.textContent = '';
  }

  private render(): void {
    const nodes: HTMLElement[] = [];
    this.order.forEach((stage, i) => {
      if (i > 0) nodes.push(el('span', 'pipeline-arrow', '→'));
      const block = button('', `stage ${STAGE_COLOR[stage]}`);
      block.append(el('span', 'stage-num', String(i + 1)), el('span', 'stage-label', stage));
      if (i === this.selected) block.classList.add('selected');
      const mark = this.marks[i];
      if (mark) block.classList.add(mark);
      block.draggable = !this.solved;

      block.addEventListener('click', () => {
        if (this.solved) return;
        if (this.selected === -1) this.selected = i;
        else {
          this.swap(this.selected, i);
          this.selected = -1;
        }
        this.render();
      });
      block.addEventListener('dragstart', (e) => {
        e.dataTransfer?.setData('text/plain', String(i));
        block.classList.add('dragging');
      });
      block.addEventListener('dragend', () => block.classList.remove('dragging'));
      block.addEventListener('dragover', (e) => {
        e.preventDefault();
        block.classList.add('drop-target');
      });
      block.addEventListener('dragleave', () => block.classList.remove('drop-target'));
      block.addEventListener('drop', (e) => {
        e.preventDefault();
        const from = Number(e.dataTransfer?.getData('text/plain') ?? -1);
        this.selected = -1;
        this.swap(from, i);
        this.render();
      });
      nodes.push(block);
    });
    this.list.replaceChildren(...nodes);
  }
}
