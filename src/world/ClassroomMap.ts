import { rectsOverlap, type Rect, type Vec2 } from '../core/geometry';
import { chance, shuffle, type Rng } from '../core/rng';
import type { Appearance } from './Appearance';
import type { DeskItem } from './sprites/PropPainter';

export const TILE = 16;
export const MAP_COLS = 24;
export const MAP_ROWS = 30;

export enum Tile {
  Floor,
  Wall,
  Window,
  Door,
}

export interface DeskSlot {
  readonly id: number;
  readonly col: number;
  readonly row: number;
  readonly side: 'left' | 'right';
  /** Pixel position of the desk's floor tile (top-left). */
  readonly x: number;
  readonly y: number;
  readonly student: Appearance | null;
  readonly item: DeskItem;
}

export interface DecorPlacement {
  readonly kind: 'plant' | 'bin';
  /** Sprite top-left. */
  readonly x: number;
  readonly y: number;
  readonly collider: Rect;
}

/*
 * Layout (24 × 30 tiles of 16px; front of the room is the TOP):
 *
 *   row 0-2   front wall: [clock]  [ SMARTBOARD ]  [ WHITEBOARD + projector screen ]
 *   row 3-6   front area: podium (front-left), Şevki, plant (front-right)
 *   row 7-23  9 desk rows (every 2 tiles) — 4 desks | wide aisle | 4 desks
 *   row 24-28 back area: professor spawn, bin
 *   row 29    back wall, door at the back-left corner
 *   col 0     left wall · col 23 right wall with 5 windows
 */
const LEFT_DESK_COLS = [2, 4, 6, 8] as const;
const RIGHT_DESK_COLS = [15, 17, 19, 21] as const;
const FIRST_DESK_ROW = 7;
const DESK_ROW_STEP = 2;
const DESK_ROW_COUNT = 9;
const WINDOW_ROWS = [4, 9, 14, 19, 24] as const;
const WINDOW_TILES = 3;
const OCCUPANCY = 0.64; // 46 / 72 seats
/** Front-left desk next to the aisle — its laptop is the "Formatting Police" target. */
const LAPTOP_DESK = { col: 8, row: FIRST_DESK_ROW } as const;
/** Front-right desk next to the aisle — this student stands up for the Presentation Trap. */
const PRESENTER_DESK = { col: 15, row: FIRST_DESK_ROW } as const;

export type StudentFactory = (rng: Rng) => Appearance;

/** Pure classroom layout data + static AABB collision. No rendering here (SRP). */
export class ClassroomMap {
  readonly cols = MAP_COLS;
  readonly rows = MAP_ROWS;
  readonly width = MAP_COLS * TILE;
  readonly height = MAP_ROWS * TILE;
  readonly tiles: Tile[];

  readonly floorArea: Rect = { x: TILE, y: 3 * TILE, w: (MAP_COLS - 2) * TILE, h: (MAP_ROWS - 4) * TILE };
  readonly frontWall: Rect = { x: 0, y: 0, w: MAP_COLS * TILE, h: 3 * TILE };
  readonly door: Rect = { x: TILE, y: (MAP_ROWS - 1) * TILE, w: 2 * TILE, h: TILE };
  readonly windows: Rect[];

  /** Wall-mounted fixtures (sprite top-left). */
  readonly smartboardPos: Vec2 = { x: 80, y: 8 };
  readonly whiteboardPos: Vec2 = { x: 192, y: 4 };
  readonly clockPos: Vec2 = { x: 42, y: 14 };

  readonly podiumPos: Vec2 = { x: 36, y: 48 };
  readonly podiumCollider: Rect = { x: 37, y: 66, w: 22, h: 12 };

  readonly decor: DecorPlacement[] = [
    { kind: 'plant', x: 352, y: 50, collider: { x: 353, y: 64, w: 12, h: 8 } },
    { kind: 'bin', x: 354, y: 448, collider: { x: 354, y: 452, w: 10, h: 8 } },
  ];

  readonly playerSpawn: Vec2 = { x: 32, y: 446 };
  readonly sevkiSpawn: Vec2 = { x: 76, y: 84 };

  // ---- quest anchors (Phase 2)
  /** Where you stand to use the podium (just in front of it). */
  readonly podiumInteractPoint: Vec2 = { x: 48, y: 80 };
  /** Gift box sprite top-left, sitting on the podium's reading surface. */
  readonly giftPos: Vec2 = { x: 49, y: 44 };
  /** White fabric area of the pull-down projector screen. */
  readonly projectorScreenRect: Rect = { x: 235, y: 11, w: 110, h: 21 };
  /** Floor spotlight in front of the whiteboard (centre; above the first desk row). */
  readonly spotlightCenter: Vec2 = { x: 290, y: 84 };
  /** Where the front-row presenter student stands (aisle, beside their desk). */
  readonly presenterStandPos: Vec2 = { x: 232, y: 120 };

  readonly desks: DeskSlot[];
  /** Front-row desks the quest needs: always occupied. */
  readonly questDesks: { readonly laptop: DeskSlot; readonly presenter: DeskSlot };
  readonly staticColliders: Rect[];

  constructor(rng: Rng, createStudent: StudentFactory) {
    this.tiles = this.buildTiles();
    this.windows = WINDOW_ROWS.map((r) => ({ x: (MAP_COLS - 1) * TILE, y: r * TILE, w: TILE, h: WINDOW_TILES * TILE }));
    this.desks = this.buildDesks(rng, createStudent);
    this.questDesks = {
      laptop: this.deskAt(LAPTOP_DESK.col, LAPTOP_DESK.row),
      presenter: this.deskAt(PRESENTER_DESK.col, PRESENTER_DESK.row),
    };
    this.staticColliders = this.buildColliders();
  }

  private deskAt(col: number, row: number): DeskSlot {
    const d = this.desks.find((s) => s.col === col && s.row === row);
    if (!d) throw new Error(`No desk at ${col},${row}`);
    return d;
  }

  tileAt(col: number, row: number): Tile {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return Tile.Wall;
    return this.tiles[row * this.cols + col];
  }

  static deskCollider(d: DeskSlot): Rect {
    return { x: d.x + 1, y: d.y - 4, w: 14, h: 18 };
  }

  /** True if the rectangle hits a wall, furniture or leaves the map. */
  isBlocked(r: Rect): boolean {
    if (r.x < 0 || r.y < 0 || r.x + r.w > this.width || r.y + r.h > this.height) return true;
    for (const c of this.staticColliders) if (rectsOverlap(r, c)) return true;
    return false;
  }

  /** All static colliders overlapping `r`. */
  collidersIn(r: Rect, out: Rect[]): void {
    for (const c of this.staticColliders) if (rectsOverlap(r, c)) out.push(c);
  }

  // ------------------------------------------------------------- builders

  private buildTiles(): Tile[] {
    const tiles: Tile[] = [];
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        let t = Tile.Floor;
        if (row < 3 || row === MAP_ROWS - 1 || col === 0 || col === MAP_COLS - 1) t = Tile.Wall;
        if (col === MAP_COLS - 1 && WINDOW_ROWS.some((w) => row >= w && row < w + WINDOW_TILES)) t = Tile.Window;
        if (row === MAP_ROWS - 1 && (col === 1 || col === 2)) t = Tile.Door;
        tiles.push(t);
      }
    }
    return tiles;
  }

  private buildDesks(rng: Rng, createStudent: StudentFactory): DeskSlot[] {
    const positions: Array<{ col: number; row: number; side: 'left' | 'right' }> = [];
    for (let i = 0; i < DESK_ROW_COUNT; i++) {
      const row = FIRST_DESK_ROW + i * DESK_ROW_STEP;
      for (const col of LEFT_DESK_COLS) positions.push({ col, row, side: 'left' });
      for (const col of RIGHT_DESK_COLS) positions.push({ col, row, side: 'right' });
    }

    const isAt = (p: { col: number; row: number }, d: { col: number; row: number }) => p.col === d.col && p.row === d.row;
    const forced = positions
      .map((p, i) => (isAt(p, LAPTOP_DESK) || isAt(p, PRESENTER_DESK) ? i : -1))
      .filter((i) => i >= 0);
    const occupiedCount = Math.round(positions.length * OCCUPANCY);
    const others = shuffle(rng, positions.map((_, i) => i).filter((i) => !forced.includes(i)));
    const occupied = new Set([...forced, ...others.slice(0, occupiedCount - forced.length)]);

    return positions.map((pos, id) => {
      const student = occupied.has(id) ? createStudent(rng) : null;
      let item: DeskItem = 'none';
      const r = rng();
      if (isAt(pos, LAPTOP_DESK)) item = 'laptop';
      else if (isAt(pos, PRESENTER_DESK)) item = 'notebook';
      else if (student) item = r < 0.3 ? 'laptop' : r < 0.7 ? 'notebook' : r < 0.8 ? 'books' : 'none';
      else if (chance(rng, 0.2)) item = 'notebook';
      return { id, ...pos, x: pos.col * TILE, y: pos.row * TILE, student, item };
    });
  }

  private buildColliders(): Rect[] {
    const W = this.width;
    const H = this.height;
    return [
      { x: 0, y: 0, w: W, h: 3 * TILE },          // front wall
      { x: 0, y: 0, w: TILE, h: H },              // left wall
      { x: W - TILE, y: 0, w: TILE, h: H },       // right wall (windows)
      { x: 0, y: H - TILE, w: W, h: TILE },       // back wall + door
      this.podiumCollider,
      ...this.decor.map((d) => d.collider),
      ...this.desks.map((d) => ClassroomMap.deskCollider(d)),
    ];
  }
}
