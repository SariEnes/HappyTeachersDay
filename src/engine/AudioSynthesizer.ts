/**
 * Zero-dependency 8-bit sound synthesizer on the Web Audio API.
 * Every sound is generated on the fly from oscillators and a noise buffer —
 * no audio files. The AudioContext is created lazily on the first user
 * gesture (`unlock()`), as browsers require.
 */

export type SoundEffect = 'step' | 'blip' | 'error' | 'success' | 'fanfare' | 'applause';

/** What gameplay / UI code depends on (DIP) — they never touch Web Audio directly. */
export interface SoundPlayer {
  play(effect: SoundEffect): void;
}

interface ToneOptions {
  type?: OscillatorType;
  vol?: number;
  slideTo?: number;
  attack?: number;
}

interface NoiseOptions {
  vol?: number;
  filter?: BiquadFilterType;
  freq?: number;
  q?: number;
  attack?: number;
}

const STORAGE_KEY = 'dtl:muted';
const MASTER_VOLUME = 0.5;
const SILENT = 0.0001; // exponential ramps can't reach 0
const BLIP_MIN_GAP = 0.035;

function readStoredMute(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function storeMute(muted: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
  } catch {
    /* private mode / storage blocked — mute still works for this session */
  }
}

type AudioCtor = typeof AudioContext;

export class AudioSynthesizer implements SoundPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = readStoredMute();
  private stepFlip = false;
  private lastBlip = 0;
  private readonly listeners = new Set<(muted: boolean) => void>();

  get isMuted(): boolean {
    return this.muted;
  }

  /** Must be called from a user gesture (click / keydown) to start audio. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor: AudioCtor | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
      if (!Ctor) return; // no Web Audio: the game simply stays silent
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : MASTER_VOLUME;
      master.connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
      this.noiseBuffer = this.createNoiseBuffer(ctx);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    storeMute(muted);
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, this.ctx.currentTime, 0.02);
    }
    this.listeners.forEach((fn) => fn(muted));
  }

  toggleMuted(): void {
    this.setMuted(!this.muted);
  }

  onMuteChange(fn: (muted: boolean) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  dispose(): void {
    this.listeners.clear();
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
  }

  play(effect: SoundEffect): void {
    const ctx = this.ctx;
    if (!ctx || this.muted || ctx.state === 'closed') return;
    const t = ctx.currentTime + 0.005;

    switch (effect) {
      case 'step': {
        // soft alternating heel ticks
        this.stepFlip = !this.stepFlip;
        this.tone(this.stepFlip ? 150 : 128, t, 0.045, { type: 'triangle', vol: 0.05 });
        this.noise(t, 0.025, { vol: 0.018, filter: 'highpass', freq: 2600 });
        break;
      }
      case 'blip': {
        if (t - this.lastBlip < BLIP_MIN_GAP) return;
        this.lastBlip = t;
        this.tone(520 + Math.random() * 90, t, 0.04, { type: 'square', vol: 0.02 });
        break;
      }
      case 'error': {
        this.tone(165, t, 0.14, { type: 'square', vol: 0.06, slideTo: 115 });
        this.tone(125, t + 0.17, 0.22, { type: 'square', vol: 0.06, slideTo: 70 });
        break;
      }
      case 'success': {
        const notes = [784, 988, 1319]; // G5 B5 E6
        notes.forEach((f, i) => {
          const last = i === notes.length - 1;
          this.tone(f, t + i * 0.07, last ? 0.24 : 0.08, { type: 'square', vol: 0.04 });
          this.tone(f / 2, t + i * 0.07, last ? 0.24 : 0.08, { type: 'triangle', vol: 0.03 });
        });
        break;
      }
      case 'fanfare': {
        const melody: Array<[number, number, number]> = [
          [523, 0, 0.11], [659, 0.12, 0.11], [784, 0.24, 0.11], [1047, 0.36, 0.3],
          [784, 0.7, 0.11], [1047, 0.82, 0.6],
        ];
        for (const [f, at, d] of melody) {
          this.tone(f, t + at, d, { type: 'square', vol: 0.045 });
          this.tone(f * 1.5, t + at, d, { type: 'square', vol: 0.012 }); // bright fifth
        }
        const bass: Array<[number, number, number]> = [[131, 0, 0.34], [196, 0.36, 0.32], [262, 0.7, 0.75]];
        for (const [f, at, d] of bass) this.tone(f, t + at, d, { type: 'triangle', vol: 0.07 });
        break;
      }
      case 'applause': {
        // a crowd = a soft noise bed + many tiny band-passed claps
        this.noise(t, 2.0, { vol: 0.016, filter: 'bandpass', freq: 1800, q: 0.6, attack: 0.25 });
        for (let i = 0; i < 48; i++) {
          const at = 0.05 + Math.random() * 1.7;
          const vol = 0.012 + 0.04 * (1 - at / 1.9);
          this.noise(t + at, 0.035 + Math.random() * 0.03, {
            vol,
            filter: 'bandpass',
            freq: 1100 + Math.random() * 1900,
            q: 1.4,
          });
        }
        break;
      }
    }
  }

  // ------------------------------------------------------------ primitives

  private tone(freq: number, start: number, dur: number, o: ToneOptions = {}): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const vol = o.vol ?? 0.05;
    const attack = Math.min(o.attack ?? 0.005, dur / 2);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = o.type ?? 'square';
    osc.frequency.setValueAtTime(freq, start);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, start + dur);
    gain.gain.setValueAtTime(SILENT, start);
    gain.gain.exponentialRampToValueAtTime(vol, start + attack);
    gain.gain.exponentialRampToValueAtTime(SILENT, start + dur);
    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  private noise(start: number, dur: number, o: NoiseOptions = {}): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = o.filter ?? 'bandpass';
    filter.frequency.value = o.freq ?? 2000;
    filter.Q.value = o.q ?? 1;
    const gain = ctx.createGain();
    const vol = o.vol ?? 0.03;
    const attack = Math.min(o.attack ?? 0.003, dur / 2);
    gain.gain.setValueAtTime(SILENT, start);
    gain.gain.exponentialRampToValueAtTime(vol, start + attack);
    gain.gain.exponentialRampToValueAtTime(SILENT, start + dur);
    src.connect(filter).connect(gain).connect(master);
    src.start(start, Math.random() * 0.8);
    src.stop(start + dur + 0.02);
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
}
