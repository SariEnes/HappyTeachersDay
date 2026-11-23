import { Game } from './game/Game';

const canvas = document.getElementById('game') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Missing <canvas id="game">');

const game = new Game(canvas, {
  fpsElement: document.getElementById('fps'),
  hintElement: document.getElementById('hint'),
  hudElement: document.getElementById('hud'),
  soundToggleHost: document.getElementById('hud-right'),
});
game.start();

// Dev-only handle for debugging in the console (stripped from production builds).
if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game;

if (import.meta.hot) {
  import.meta.hot.dispose(() => game.destroy());
}
