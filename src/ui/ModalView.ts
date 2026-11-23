export type ModalLayout = 'center' | 'bottom' | 'fullscreen' | 'title';

/**
 * One self-contained modal screen. ModalManager handles showing, pausing and
 * closing; a view only builds its DOM and calls `done(result)` when finished.
 * New modals never require changes to ModalManager (Open/Closed).
 */
export interface ModalView<T> {
  readonly layout: ModalLayout;
  mount(host: HTMLElement, done: (result: T) => void): void;
  onKeyDown?(e: KeyboardEvent): void;
  dispose?(): void;
}
