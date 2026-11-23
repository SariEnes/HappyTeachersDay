/** Tiny DOM helper — always uses textContent, never innerHTML, for text. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function button(label: string, className = 'px-btn', onClick?: () => void): HTMLButtonElement {
  const b = el('button', className, label);
  b.type = 'button';
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

/** Copy a sprite canvas into a fresh, CSS-upscaled pixelated canvas for UI use. */
export function pixelPortrait(src: HTMLCanvasElement, scale: number, className = 'px-portrait'): HTMLCanvasElement {
  const c = el('canvas', className);
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0);
  }
  c.style.width = `${src.width * scale}px`;
  c.style.height = `${src.height * scale}px`;
  return c;
}
