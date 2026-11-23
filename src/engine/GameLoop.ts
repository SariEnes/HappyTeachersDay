/**
 * Fixed-timestep loop (60 updates / second) with render interpolation.
 * Simulation is deterministic regardless of monitor refresh rate;
 * rendering receives `alpha` (0..1) to interpolate between the last two states.
 */
export class GameLoop {
  static readonly STEP_MS = 1000 / 60;
  private static readonly MAX_FRAME_MS = 250;
  private static readonly MAX_STEPS = 8;

  private accumulator = 0;
  private lastTime = 0;
  private rafId = 0;
  private running = false;

  constructor(
    private readonly update: (dtSeconds: number) => void,
    private readonly render: (alpha: number) => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private readonly tick = (now: number): void => {
    if (!this.running) return;

    let frame = now - this.lastTime;
    this.lastTime = now;
    if (frame > GameLoop.MAX_FRAME_MS) frame = GameLoop.MAX_FRAME_MS; // tab was hidden, etc.
    this.accumulator += frame;

    const step = GameLoop.STEP_MS;
    let steps = 0;
    while (this.accumulator >= step && steps < GameLoop.MAX_STEPS) {
      this.update(step / 1000);
      this.accumulator -= step;
      steps++;
    }
    if (steps === GameLoop.MAX_STEPS) this.accumulator = 0; // avoid spiral of death

    this.render(this.accumulator / step);
    this.rafId = requestAnimationFrame(this.tick);
  };
}
