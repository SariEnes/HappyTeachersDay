/**
 * Owns the canvas: fixed low internal resolution, scaled up so every game pixel
 * stays square & crisp. Integer scaling in *device* pixels where it fits well;
 * on small phone screens a fractional scale is used instead so the game isn't tiny.
 * On tall (portrait) screens the internal height grows up to `maxHeight`, so phones
 * show more of the classroom instead of a thin letterboxed strip.
 */
export class Display {
  readonly ctx: CanvasRenderingContext2D;
  private currentHeight: number;

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly width: number,
    private readonly baseHeight: number,
    private readonly maxHeight: number = baseHeight,
    private readonly onResize?: (width: number, height: number) => void,
  ) {
    canvas.width = width;
    canvas.height = baseHeight;
    this.currentHeight = baseHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;

    window.addEventListener('resize', this.fit);
    window.visualViewport?.addEventListener('resize', this.fit);
    this.fit();
  }

  get height(): number {
    return this.currentHeight;
  }

  dispose(): void {
    window.removeEventListener('resize', this.fit);
    window.visualViewport?.removeEventListener('resize', this.fit);
  }

  private readonly fit = (): void => {
    const dpr = window.devicePixelRatio || 1;
    const margin = window.innerWidth < 700 ? 8 : 24;
    const availW = Math.max(1, (window.innerWidth - margin) * dpr);
    const availH = Math.max(1, (window.innerHeight - margin) * dpr);

    // Portrait-ish screens: extend the view vertically (never on normal desktop windows).
    const aspect = availH / availW;
    let h = this.baseHeight;
    if (aspect > 0.9) h = Math.min(this.maxHeight, Math.max(this.baseHeight, Math.round(this.width * aspect)));
    h -= h % 2; // even height keeps the camera centre on whole pixels
    if (h !== this.currentHeight) {
      this.currentHeight = h;
      this.canvas.height = h; // resets context state…
      this.ctx.imageSmoothingEnabled = false; // …so restore crisp pixels
      this.onResize?.(this.width, h);
    }

    const raw = Math.min(availW / this.width, availH / h);
    const whole = Math.floor(raw);
    const scale = whole >= 1 && (whole >= 3 || whole / raw >= 0.85) ? whole : raw;
    this.canvas.style.width = `${(this.width * scale) / dpr}px`;
    this.canvas.style.height = `${(h * scale) / dpr}px`;
  };
}
