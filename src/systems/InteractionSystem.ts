import type { InputSource } from '../engine/InputManager';
import type { Entity } from '../entities/Entity';
import type { Interactable } from '../entities/Interactable';

/** Supplies whatever is currently interactable (e.g. only the active quest target). */
export interface InteractableProvider {
  getInteractables(): readonly Interactable[];
}

/** Finds the nearest interactable within reach, shows an "E" prompt, fires on E. */
export class InteractionSystem {
  private focused: Interactable | null = null;

  constructor(
    private readonly player: Entity,
    private readonly input: InputSource,
    private readonly promptSprite: CanvasImageSource,
    private readonly provider: InteractableProvider,
  ) {}

  get focusedTarget(): Interactable | null {
    return this.focused;
  }

  clearFocus(): void {
    this.focused = null;
  }

  update(): void {
    this.focused = null;
    let best = Infinity;
    for (const t of this.provider.getInteractables()) {
      if (!t.canInteract()) continue;
      const p = t.getInteractionPoint();
      const d = Math.hypot(p.x - this.player.x, p.y - this.player.y);
      if (d <= t.interactionRadius && d < best) {
        best = d;
        this.focused = t;
      }
    }
    if (this.focused && this.input.wasPressed('interact')) {
      const target = this.focused;
      this.focused = null;
      target.interact();
    }
  }

  drawOverlay(ctx: CanvasRenderingContext2D, alpha: number, time: number): void {
    if (!this.focused || !this.focused.canInteract()) return;
    const a = this.focused.getPromptAnchor(alpha);
    const bob = Math.round(Math.sin(time * 5) * 1);
    ctx.drawImage(this.promptSprite, Math.round(a.x) - 5, Math.round(a.y) - 12 + bob);
  }
}
