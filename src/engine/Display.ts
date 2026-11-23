/**
 * Owns the canvas: fixed low internal resolution, scaled up by an integer
 * factor in *device* pixels so every game pixel stays perfectly square & crisp.
 */
export class Display {
  readonly ctx: CanvasRenderingContext2D;

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly width: number,
    readonly height: number,
  ) {
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;

    window.addEventListener('resize', this.fit);
    this.fit();
  }

  dispose(): void {
    window.removeEventListener('resize', this.fit);
  }

  private readonly fit = (): void => {
    const dpr = window.devicePixelRatio || 1;
    const margin = 24;
    const availW = (window.innerWidth - margin) * dpr;
    const availH = (window.innerHeight - margin) * dpr;
    const raw = Math.min(availW / this.width, availH / this.height);
    const scale = raw >= 1 ? Math.floor(raw) : raw;
    this.canvas.style.width = `${(this.width * scale) / dpr}px`;
    this.canvas.style.height = `${(this.height * scale) / dpr}px`;
  };
}
