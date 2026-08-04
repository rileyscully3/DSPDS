import { afterEach, expect, test, vi } from "vitest";

const disposeGeometry = vi.fn(),
  disposeMaterial = vi.fn(),
  rendererDispose = vi.fn(),
  disconnect = vi.fn();
vi.mock("three", () => {
  class Node {
    position = { set: vi.fn() };
    rotation = { x: 0, y: 0 };
    add = vi.fn();
  }
  return {
    WebGLRenderer: class {
      domElement = document.createElement("canvas");
      setPixelRatio = vi.fn();
      setSize = vi.fn();
      render = vi.fn();
      dispose = rendererDispose;
      outputColorSpace = "";
    },
    Scene: class extends Node {},
    PerspectiveCamera: class extends Node {
      aspect = 1;
      updateProjectionMatrix = vi.fn();
      lookAt = vi.fn();
    },
    TorusKnotGeometry: class {
      dispose = disposeGeometry;
    },
    PlaneGeometry: class {
      dispose = disposeGeometry;
    },
    MeshStandardMaterial: class {
      dispose = disposeMaterial;
    },
    Mesh: class extends Node {},
    HemisphereLight: class extends Node {},
    DirectionalLight: class extends Node {},
    Color: class {},
    Fog: class {},
    SRGBColorSpace: "srgb",
  };
});
import { mountDiagnosticEngine } from "./createDiagnosticEngine";

afterEach(() => vi.restoreAllMocks());
test("cancels animation, disconnects observation, disposes resources, and removes its canvas", () => {
  const cancel = vi.spyOn(window, "cancelAnimationFrame");
  vi.spyOn(window, "requestAnimationFrame").mockReturnValue(42);
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      disconnect = disconnect;
    },
  );
  const element = document.createElement("div");
  const engine = mountDiagnosticEngine(element);
  expect(element.querySelectorAll("canvas")).toHaveLength(1);
  engine.dispose();
  expect(cancel).toHaveBeenCalledWith(42);
  expect(disconnect).toHaveBeenCalledOnce();
  expect(rendererDispose).toHaveBeenCalledOnce();
  expect(disposeGeometry).toHaveBeenCalledTimes(2);
  expect(disposeMaterial).toHaveBeenCalledTimes(2);
  expect(element.querySelectorAll("canvas")).toHaveLength(0);
});
