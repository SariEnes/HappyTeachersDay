import type { Direction, Vec2 } from '../core/geometry';
import type { SoundPlayer } from '../engine/AudioSynthesizer';
import type { InputSource } from '../engine/InputManager';
import type { CharacterSheet } from '../world/CharacterSheet';
import type { CollisionWorld } from '../world/CollisionWorld';
import { Entity } from './Entity';

const WALK_SPEED = 72; // px / second

/** The Professor — driven by keyboard input, collides with the classroom. */
export class Player extends Entity {
  constructor(
    spawn: Vec2,
    sheet: CharacterSheet,
    shadow: CanvasImageSource,
    private readonly input: InputSource,
    private readonly world: CollisionWorld,
    private readonly sound?: SoundPlayer,
  ) {
    super(spawn, sheet, shadow);
    this.facing = 'up';
  }

  /** While frozen (a modal is open) the professor stands still. */
  frozen = false;

  update(dt: number): void {
    if (this.frozen) {
      this.animate(dt, false);
      return;
    }
    const axis = this.input.getMoveAxis();
    const len = Math.hypot(axis.x, axis.y);
    if (len === 0) {
      this.animate(dt, false);
      return;
    }

    this.updateFacing(axis.x, axis.y);
    const step = (WALK_SPEED * dt) / len;
    const next = this.world.move(this, this.x, this.y, axis.x * step, axis.y * step);
    this.x = next.x;
    this.y = next.y;
    this.animate(dt, true);
  }

  protected override onFootstep(): void {
    this.sound?.play('step');
  }

  /** On diagonals, keep the current facing if it is one of the pressed directions. */
  private updateFacing(ax: number, ay: number): void {
    const horiz: Direction | null = ax < 0 ? 'left' : ax > 0 ? 'right' : null;
    const vert: Direction | null = ay < 0 ? 'up' : ay > 0 ? 'down' : null;
    if (horiz && vert) {
      // analog (touch) input: face the clearly dominant direction
      if (Math.abs(ax) > Math.abs(ay) * 1.6) this.facing = horiz;
      else if (Math.abs(ay) > Math.abs(ax) * 1.6) this.facing = vert;
      else if (this.facing !== horiz && this.facing !== vert) this.facing = horiz;
    } else {
      this.facing = (horiz ?? vert) as Direction;
    }
  }
}
