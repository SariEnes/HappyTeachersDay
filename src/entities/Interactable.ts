import type { Vec2 } from '../core/geometry';

/**
 * Something the player can press E on. Phase 2 quests plug in here
 * without touching Player or the interaction system (Open/Closed).
 */
export interface Interactable {
  readonly interactionRadius: number;
  getInteractionPoint(): Vec2;
  /** World position (interpolated) where the "E" prompt should float. */
  getPromptAnchor(alpha: number): Vec2;
  canInteract(): boolean;
  interact(): void;
}
