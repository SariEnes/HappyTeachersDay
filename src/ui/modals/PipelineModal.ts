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

const DRAG_THRESHOLD_PX = 8;

interface DragState {
  from: number;
  pointerId: number;
  x0: number;
  y0: number;
  ghost: HTMLElement | null;
  over: number;
}

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

  private list!: HTMLElement;
  private feedback!: HTMLElement;
  private drag: DragState | null = null;
  private suppressClick = false;

  constructor(private readonly sound: SoundPlayer) {}

  mount(host: HTMLElement, done: () => void): void {
    host.append(el('div', 'modal-kicker', "Teacher's podium"));
    host.append(el('h2', 'modal-title', 'Basic Computer Operations'));
    host.append(
      el('p', 'modal-prompt', 'Arrange the operations into the correct pipeline. Tap two blocks to swap them, or drag & drop.'),
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
    this.drag?.ghost?.remove();
    this.drag = null;
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
      block.dataset.index = String(i);
      block.append(el('span', 'stage-num', String(i + 1)), el('span', 'stage-label', stage));
      if (i === this.selected) block.classList.add('selected');
      const mark = this.marks[i];
      if (mark) block.classList.add(mark);

      // Tap-to-select & tap-to-swap (mouse click or finger tap)
      block.addEventListener('click', () => {
        if (this.suppressClick) {
          this.suppressClick = false;
          return;
        }
        if (this.solved) return;
        if (this.selected === -1) this.selected = i;
        else {
          this.swap(this.selected, i);
          this.selected = -1;
        }
        this.render();
      });

      // Drag & drop via unified Pointer Events (mouse, touch and pen alike)
      block.addEventListener('pointerdown', (e) => this.dragStart(e, block, i));
      block.addEventListener('pointermove', (e) => this.dragMove(e, block));
      block.addEventListener('pointerup', (e) => this.dragEnd(e, true));
      block.addEventListener('pointercancel', (e) => this.dragEnd(e, false));
      nodes.push(block);
    });
    this.list.replaceChildren(...nodes);
  }

  // ------------------------------------------------------------ pointer drag

  private dragStart(e: PointerEvent, block: HTMLElement, index: number): void {
    if (this.solved || this.drag || e.button > 0) return;
    this.suppressClick = false;
    block.setPointerCapture(e.pointerId);
    this.drag = { from: index, pointerId: e.pointerId, x0: e.clientX, y0: e.clientY, ghost: null, over: -1 };
  }

  private dragMove(e: PointerEvent, block: HTMLElement): void {
    const d = this.drag;
    if (!d || d.pointerId !== e.pointerId) return;
    if (!d.ghost) {
      if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < DRAG_THRESHOLD_PX) return; // still a tap
      const r = block.getBoundingClientRect();
      const ghost = block.cloneNode(true) as HTMLElement;
      ghost.classList.add('stage-ghost');
      ghost.classList.remove('selected', 'wrong', 'right');
      ghost.style.width = `${r.width}px`;
      ghost.style.height = `${r.height}px`;
      document.body.append(ghost);
      d.ghost = ghost;
      this.selected = -1;
      block.classList.add('dragging');
      block.classList.remove('selected');
    }
    e.preventDefault();
    const g = d.ghost;
    g.style.transform = `translate(${e.clientX - g.offsetWidth / 2}px, ${e.clientY - g.offsetHeight / 2}px) rotate(-3deg)`;

    const under = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('.stage');
    d.over = under && this.list.contains(under) ? Number(under.dataset.index) : -1;
    this.list.querySelectorAll<HTMLElement>('.stage').forEach((s) => {
      s.classList.toggle('drop-target', Number(s.dataset.index) === d.over && d.over !== d.from);
    });
  }

  private dragEnd(e: PointerEvent, commit: boolean): void {
    const d = this.drag;
    if (!d || d.pointerId !== e.pointerId) return;
    this.drag = null;
    if (!d.ghost) return; // it was a tap: the click handler takes over
    d.ghost.remove();
    this.suppressClick = true; // swallow the click that follows a drag
    if (commit && d.over >= 0 && d.over !== d.from) this.swap(d.from, d.over);
    this.render();
  }
}
