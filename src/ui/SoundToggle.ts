import type { AudioSynthesizer } from '../engine/AudioSynthesizer';
import { button } from './dom';

/** Compact pixel "[Sound: ON/OFF]" HUD button. Mute state is persisted by the synthesizer. */
export class SoundToggle {
  private readonly btn: HTMLButtonElement;
  private readonly unsubscribe: () => void;

  constructor(host: HTMLElement, private readonly audio: AudioSynthesizer) {
    this.btn = button('', 'sound-toggle', () => {
      audio.unlock(); // a click is a valid gesture to start audio
      audio.toggleMuted();
      this.btn.blur(); // keep keyboard focus on the game
    });
    host.append(this.btn);
    this.unsubscribe = audio.onMuteChange(() => this.render());
    this.render();
  }

  dispose(): void {
    this.unsubscribe();
    this.btn.remove();
  }

  private render(): void {
    const muted = this.audio.isMuted;
    this.btn.textContent = `[Sound: ${muted ? 'OFF' : 'ON'}]`;
    this.btn.setAttribute('aria-pressed', String(!muted));
    this.btn.classList.toggle('is-off', muted);
  }
}
