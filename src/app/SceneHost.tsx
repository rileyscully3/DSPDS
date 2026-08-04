import { useEffect, useRef } from "react";
import { mountDiagnosticEngine } from "../engine/createDiagnosticEngine";
export function SceneHost() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const engine = mountDiagnosticEngine(ref.current!);
    return () => engine.dispose();
  }, []);
  return (
    <div
      ref={ref}
      className="scene-host"
      data-testid="scene-host"
      aria-label="Abstract Three.js architecture diagnostic"
    />
  );
}
