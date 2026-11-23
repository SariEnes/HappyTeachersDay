import type { Camera } from '../engine/Camera';
import { TILE, Tile, type ClassroomMap } from './ClassroomMap';
import { Prop } from './Prop';
import type { SpriteCache } from './SpriteCache';
import { createCanvas, makePen, type Pen } from './sprites/Pen';

/** Furniture props, with handles to the ones quest effects need to modify. */
export interface ClassroomProps {
  readonly all: readonly Prop[];
  readonly desks: ReadonlyMap<number, Prop>;
  readonly podium: Prop;
}

const WALL_FACE = '#f3f1ec';
const WALL_TOP = '#e3e0d8';
const WALL_EDGE = '#cfcbc1';

/**
 * Bakes everything that never moves (floor, walls, boards, windows, door)
 * into one offscreen canvas, plus a separate translucent daylight layer.
 * Per frame we just blit the visible slice — zero per-tile work.
 */
export class ClassroomRenderer {
  private readonly background: HTMLCanvasElement;
  private readonly daylight: HTMLCanvasElement;

  constructor(
    private readonly map: ClassroomMap,
    private readonly sprites: SpriteCache,
  ) {
    this.background = this.bakeBackground();
    this.daylight = this.bakeDaylight();
  }

  /** Depth-sorted furniture props built from the map layout. */
  createProps(): ClassroomProps {
    const desks = new Map<number, Prop>();
    const all: Prop[] = this.map.desks.map((d) => {
      const prop = new Prop(this.sprites.createDeskUnit(d.student, d.item), d.x, d.y - 8, d.y + 14);
      desks.set(d.id, prop);
      return prop;
    });
    const pp = this.map.podiumPos;
    const podiumImg = this.sprites.podium();
    const podium = new Prop(podiumImg, pp.x, pp.y, pp.y + podiumImg.height - 2);
    all.push(podium);
    for (const d of this.map.decor) {
      const img = d.kind === 'plant' ? this.sprites.plant() : this.sprites.bin();
      all.push(new Prop(img, d.x, d.y, d.collider.y + d.collider.h));
    }
    return { all, desks, podium };
  }

  drawBackground(ctx: CanvasRenderingContext2D, cam: Camera): void {
    ctx.drawImage(this.background, cam.x, cam.y, cam.viewWidth, cam.viewHeight, 0, 0, cam.viewWidth, cam.viewHeight);
  }

  drawDaylight(ctx: CanvasRenderingContext2D, cam: Camera): void {
    ctx.drawImage(this.daylight, cam.x, cam.y, cam.viewWidth, cam.viewHeight, 0, 0, cam.viewWidth, cam.viewHeight);
  }

  // ------------------------------------------------------------- baking

  private bakeBackground(): HTMLCanvasElement {
    const m = this.map;
    const [canvas, ctx] = createCanvas(m.width, m.height);
    const p = makePen(ctx);

    // floor tiles
    for (let row = 0; row < m.rows; row++) {
      for (let col = 0; col < m.cols; col++) {
        if (m.tileAt(col, row) !== Tile.Floor) continue;
        const variant = (col * 7 + row * 13 + ((col * row) % 5)) % 3;
        ctx.drawImage(this.sprites.floorTile(variant), col * TILE, row * TILE);
      }
    }

    // doormat inside the entrance
    p(m.door.x + 2, m.door.y - 14, m.door.w - 4, 12, '#5a5f6a');
    p(m.door.x + 3, m.door.y - 13, m.door.w - 6, 10, '#6a707c');
    for (let i = 0; i < 5; i++) p(m.door.x + 5 + i * 5, m.door.y - 12, 2, 8, '#5a5f6a');

    // ambient occlusion along walls
    const fa = m.floorArea;
    p(fa.x, fa.y, fa.w, 3, 'rgba(0,0,0,0.08)');
    p(fa.x, fa.y, 2, fa.h, 'rgba(0,0,0,0.06)');
    p(fa.x + fa.w - 2, fa.y, 2, fa.h, 'rgba(0,0,0,0.06)');

    this.paintFrontWall(ctx, p);
    this.paintSideAndBackWalls(ctx, p);
    return canvas;
  }

  private paintFrontWall(ctx: CanvasRenderingContext2D, p: Pen): void {
    const m = this.map;
    const fw = m.frontWall;
    p(TILE, 0, fw.w - 2 * TILE, fw.h, WALL_FACE);
    p(TILE, 0, fw.w - 2 * TILE, 3, '#d9d5cc');            // ceiling trim
    p(TILE, 3, fw.w - 2 * TILE, 1, '#e6e3dc');
    p(TILE, fw.h - 4, fw.w - 2 * TILE, 4, '#b7ae9c');      // baseboard
    p(TILE, fw.h - 4, fw.w - 2 * TILE, 1, '#c9c1b0');

    ctx.drawImage(this.sprites.clock(), m.clockPos.x, m.clockPos.y);
    ctx.drawImage(this.sprites.smartboard(), m.smartboardPos.x, m.smartboardPos.y);
    ctx.drawImage(this.sprites.whiteboard(), m.whiteboardPos.x, m.whiteboardPos.y);
  }

  private paintSideAndBackWalls(ctx: CanvasRenderingContext2D, p: Pen): void {
    const m = this.map;
    const W = m.width;
    const H = m.height;

    // left wall (top edge view)
    p(0, 0, TILE, H, WALL_TOP);
    p(TILE - 2, 0, 2, H, WALL_EDGE);
    // right wall with windows
    p(W - TILE, 0, TILE, H, WALL_TOP);
    p(W - TILE, 0, 2, H, WALL_EDGE);
    const win = this.sprites.window();
    for (const w of m.windows) ctx.drawImage(win, w.x, w.y);

    // back wall + door at the back-left corner
    p(0, H - TILE, W, TILE, WALL_TOP);
    p(TILE, H - TILE, W - 2 * TILE, 2, WALL_EDGE);
    const d = m.door;
    p(d.x, d.y, d.w, d.h, '#6b4423');
    p(d.x + 2, d.y + 1, d.w - 4, d.h - 1, '#9a6a3a');
    p(d.x + 2, d.y + 1, d.w - 4, 1, '#b4824d');
    p(d.x + d.w / 2, d.y + 1, 1, d.h - 1, '#6b4423');
    p(d.x + d.w / 2 - 3, d.y + 7, 2, 1, '#d4af37');
    p(d.x + d.w / 2 + 2, d.y + 7, 2, 1, '#d4af37');
    // EXIT sign
    p(d.x + d.w + 4, d.y + 3, 12, 7, '#1f9d55');
    p(d.x + d.w + 6, d.y + 6, 8, 1, '#e9fff1');
  }

  /** Sun shines in from the right-wall windows, casting sheared pixel patches leftwards. */
  private bakeDaylight(): HTMLCanvasElement {
    const m = this.map;
    const [canvas, ctx] = createCanvas(m.width, m.height);
    const p = makePen(ctx);
    const reach = 104;
    const startX = m.width - TILE - 1;
    const bands = [0.26, 0.18, 0.1];

    for (const w of m.windows) {
      const mullionTop = w.y + 23;
      for (let d = 0; d < reach; d++) {
        const x = startX - d;
        const band = bands[Math.min(bands.length - 1, Math.floor((d / reach) * bands.length))];
        const top = w.y + 4 + Math.floor(d * 0.35);
        const shift = top - w.y;
        const color = `rgba(255,240,196,${band})`;
        // two panes with the mullion's shadow gap between them
        p(x, top, 1, mullionTop - w.y - 4, color);
        p(x, mullionTop + shift - 2, 1, w.h - 26, color);
      }
    }
    // keep light off the walls
    ctx.clearRect(0, 0, m.width, m.frontWall.h);
    ctx.clearRect(0, m.height - TILE, m.width, TILE);
    return canvas;
  }
}
