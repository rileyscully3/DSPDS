import { useEffect, useRef } from "react";
import { mountDiagnosticEngine } from "../engine/createDiagnosticEngine";
export interface SceneHostProps {
  readonly onFrame?: (timestampMs: number) => void;
}
export function SceneHost({ onFrame }: SceneHostProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const engine = mountDiagnosticEngine(ref.current!, onFrame);
    return () => engine.dispose();
  }, [onFrame]);
  return (
    <div
      ref={ref}
      className="scene-host"
      data-testid="scene-host"
      aria-label="Abstract Three.js architecture diagnostic"
    />
  );
}
