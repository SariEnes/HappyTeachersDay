import type { Vec2 } from '../core/geometry';

export type Action = 'up' | 'down' | 'left' | 'right' | 'interact';

/** Read-only view of input that gameplay code depends on (DIP). */
export interface InputSource {
  isDown(action: Action): boolean;
  /** True once per physical press, until the end of the current update step. */
  wasPressed(action: Action): boolean;
  /** Raw (un-normalised) movement axis in {-1, 0, 1}. */
  getMoveAxis(): Vec2;
}

const DEFAULT_BINDINGS: Readonly<Record<string, Action>> = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  KeyE: 'interact',
  Space: 'interact',
};

/** Keys typed into a focused button/field belong to that control, not to the game. */
function isFormControl(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLButtonElement ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

export class InputManager implements InputSource {
  private readonly heldKeys = new Set<string>();
  private readonly pressed = new Set<Action>();

  constructor(
    private readonly target: Window = window,
    private readonly bindings: Readonly<Record<string, Action>> = DEFAULT_BINDINGS,
  ) {
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.reset);
  }

  isDown(action: Action): boolean {
    for (const code of this.heldKeys) {
      if (this.bindings[code] === action) return true;
    }
    return false;
  }

  wasPressed(action: Action): boolean {
    return this.pressed.has(action);
  }

  getMoveAxis(): Vec2 {
    return {
      x: (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0),
      y: (this.isDown('down') ? 1 : 0) - (this.isDown('up') ? 1 : 0),
    };
  }

  /** Call after every fixed update step to clear one-shot presses. */
  endStep(): void {
    this.pressed.clear();
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.reset);
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    const action = this.bindings[e.code];
    if (!action || isFormControl(e.target)) return;
    e.preventDefault();
    if (!e.repeat && !this.heldKeys.has(e.code)) this.pressed.add(action);
    this.heldKeys.add(e.code);
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    if (!this.bindings[e.code]) return;
    e.preventDefault();
    this.heldKeys.delete(e.code);
  };

  private readonly reset = (): void => {
    this.heldKeys.clear();
    this.pressed.clear();
  };
}
