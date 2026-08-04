export interface EngineHost {
  resize(): void;
  dispose(): void;
}
export interface EngineFactory {
  mount(element: HTMLElement): EngineHost;
}
