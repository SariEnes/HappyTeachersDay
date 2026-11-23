import type { SoundPlayer } from '../../engine/AudioSynthesizer';
import { button, el } from '../dom';
import type { ModalView } from '../ModalView';

/** Step 1 — "Formatting Police": spot the bracketed page number & missing references. */
export class FormattingModal implements ModalView<void> {
  readonly layout = 'center' as const;
  private closeTimer = 0;

  constructor(private readonly sound: SoundPlayer) {}

  mount(host: HTMLElement, done: () => void): void {
    host.append(el('div', 'modal-kicker', 'Front-row laptop'));
    host.append(el('h2', 'modal-title', 'Formatting Police'));

    // --- the document
    const win = el('div', 'doc-window');
    const bar = el('div', 'doc-titlebar');
    bar.append(el('span', 'doc-dots'), el('span', 'doc-filename', 'Assignment_Final_v2.docx'));
    const page = el('div', 'doc-page');
    page.append(
      el('div', 'doc-heading', 'Learning by Doing in Educational Technology'),
      el('p', 'doc-line', 'Active learning helps students build knowledge by creating, testing and presenting their own work.'),
      el('p', 'doc-line', 'This assignment argues that practice is the shortest path to real understanding.'),
    );
    const refs = el('div', 'doc-refs');
    refs.append(el('div', 'doc-refs-title', 'References'));
    const refsBody = el('div', 'doc-refs-empty', '(empty)');
    refs.append(refsBody);
    page.append(refs);
    const pageNum = el('div', 'doc-pagenum', '[1]');
    page.append(pageNum);
    win.append(bar, page);
    host.append(win);

    host.append(el('p', 'modal-prompt', 'Something looks off in this assignment. What do you do, Hocam?'));

    // --- choices
    const feedback = el('div', 'modal-feedback');
    const choices = el('div', 'choices');
    const fix = button('1. Fix it: Change [1] to (1) in parentheses and add APA References.', 'px-btn');
    const leave = button('2. Leave it as [1], content is what matters.', 'px-btn px-btn--ghost');
    choices.append(fix, leave);
    host.append(choices, feedback);

    leave.addEventListener('click', () => {
      this.sound.play('error');
      feedback.className = 'modal-feedback warn';
      feedback.textContent = 'Nice try, Hocam! Everyone knows you check the parenthetical page numbers first!';
      void feedback.offsetWidth; // restart the shake animation
      feedback.classList.add('shake');
    });

    fix.addEventListener('click', () => {
      this.sound.play('success');
      fix.disabled = true;
      leave.disabled = true;
      pageNum.textContent = '(1)';
      pageNum.classList.add('fixed');
      refsBody.className = 'doc-refs-entry';
      refsBody.replaceChildren(
        document.createTextNode('Dewey, J. (1938). '),
        el('em', undefined, 'Experience and education'),
        document.createTextNode('. Kappa Delta Pi.'),
      );
      feedback.className = 'modal-feedback ok';
      feedback.textContent = 'Correct! Page number in parentheses, APA references added. Formatting approved.';
      this.closeTimer = window.setTimeout(done, 1600);
    });
  }

  dispose(): void {
    window.clearTimeout(this.closeTimer);
  }
}
