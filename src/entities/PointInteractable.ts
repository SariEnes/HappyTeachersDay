import type { Vec2 } from '../core/geometry';
import type { Interactable } from './Interactable';

/** A fixed spot in the room you can press E on (laptop, podium, spotlight, gift). */
export class PointInteractable implements Interactable {
  constructor(
    private readonly point: Vec2,
    private readonly promptAnchor: Vec2,
    private readonly action: () => void,
    readonly interactionRadius = 24, // 1.5 tiles
  ) {}

  getInteractionPoint(): Vec2 {
    return this.point;
  }

  getPromptAnchor(): Vec2 {
    return this.promptAnchor;
  }

  canInteract(): boolean {
    return true;
  }

  interact(): void {
    this.action();
  }
}
