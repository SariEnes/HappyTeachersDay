import type { SoundPlayer } from '../../engine/AudioSynthesizer';
import type { CertificateChoice } from '../../systems/QuestManager';
import { downloadCertificatePng } from '../CertificateImage';
import { CERTIFICATE } from '../certificateContent';
import { button, el, pixelPortrait } from '../dom';
import type { ModalView } from '../ModalView';

/** Step 4 — the full-screen Teachers' Day card, downloadable as a PNG. */
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

    inner.append(el('div', 'cert-ribbon', CERTIFICATE.ribbon));
    inner.append(el('h1', 'cert-title', CERTIFICATE.title));

    if (this.portraits.length) {
      const row = el('div', 'cert-portraits');
      for (const p of this.portraits) row.append(pixelPortrait(p, 4));
      inner.append(row);
    }

    inner.append(el('p', 'cert-body', CERTIFICATE.body));

    const refs = el('div', 'cert-refs');
    refs.append(el('div', 'cert-refs-title', CERTIFICATE.referencesTitle));
    for (const runs of CERTIFICATE.references) {
      const ref = el('div', 'cert-ref');
      ref.append(...runs.map((r) => (r.italic ? el('em', undefined, r.text) : document.createTextNode(r.text))));
      refs.append(ref);
    }
    inner.append(refs);

    card.append(inner);
    host.append(card);

    const download = button('Download PNG', 'px-btn px-btn--ok', () => {
      download.disabled = true;
      download.textContent = 'Saving...';
      downloadCertificatePng(this.portraits)
        .then(() => {
          this.sound.play('success');
          download.textContent = 'Saved!';
        })
        .catch((err) => {
          console.error('[certificate]', err);
          download.textContent = 'Download failed';
        })
        .finally(() => {
          window.setTimeout(() => {
            download.disabled = false;
            download.textContent = 'Download PNG';
          }, 1500);
        });
    });
    download.classList.add('px-btn--download');

    const actions = el('div', 'cert-actions');
    actions.append(
      download,
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
