import * as THREE from "three";
import { targetOnCameraPlane } from "./geometry";
import type { ScenarioId, Assistance } from "../telemetry/schemas";
import { designTokens } from "../design/tokens";
import type { EngineHost } from "./contracts";
export interface TrainingSceneOptions {
  scenario: ScenarioId | "baseline" | "formBlend";
  formal: boolean;
  target: { xDeg: number; yDeg: number };
  viewMode: "firstPerson" | "thirdPerson";
  assistance?: Assistance | undefined;
  verticalFovDeg?: number | undefined;
  degreesPerRawCount?: number | null | undefined;
}
export function mountTrainingEngine(
  element: HTMLElement,
  options: TrainingSceneOptions,
): EngineHost {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  element.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(designTokens.color.sceneSky);
  scene.fog = new THREE.Fog(0x161826, 8, 32);
  const camera = new THREE.PerspectiveCamera(
    options.verticalFovDeg ?? 90,
    1,
    0.1,
    60,
  );
  camera.position.set(0, 2, 6);
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(30, 12, 24),
    new THREE.MeshStandardMaterial({
      color: 0x1a1c2b,
      side: THREE.BackSide,
      roughness: 1,
    }),
  );
  room.position.z = -5;
  scene.add(room);
  const grid = new THREE.GridHelper(30, 30, 0x2e3140, 0x262940);
  grid.position.y = -2;
  scene.add(grid);
  scene.add(new THREE.HemisphereLight(0xd2cefd, 0x0e0f18, 1.5));
  const targetMaterial = new THREE.MeshStandardMaterial({
    color: 0xb5abfc,
    emissive: 0x423a6a,
    emissiveIntensity: 1,
  });
  const target = new THREE.Mesh(
    new THREE.SphereGeometry(
      options.scenario === "formBlend" ? 0.35 : 0.28,
      24,
      16,
    ),
    targetMaterial,
  );
  scene.add(target);
  let capsule: THREE.Mesh | undefined;
  if (options.viewMode === "thirdPerson") {
    capsule = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.4, 1.1, 6, 12),
      new THREE.MeshStandardMaterial({
        color: 0x595d6c,
        transparent: true,
        opacity: 0.75,
      }),
    );
    capsule.position.set(0, -1, -1);
    scene.add(capsule);
    camera.position.set(0, 1.1, 3.2);
    camera.rotation.x = (-4 * Math.PI) / 180;
  }
  target.position.copy(
    targetOnCameraPlane(camera, options.target.xDeg, options.target.yDeg),
  );
  if (options.scenario === "line") {
    target.visible = false;
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        targetOnCameraPlane(camera, 0, 0),
        target.position.clone(),
      ]),
      new THREE.LineBasicMaterial({ color: 0x9397ab }),
    );
    scene.add(line);
  }
  if (options.scenario === "formBlend") {
    const gate = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.05, 12, 48),
      new THREE.MeshBasicMaterial({
        color: 0x796cbf,
        transparent: true,
        opacity: 0.55,
      }),
    );
    gate.position.copy(target.position).add(new THREE.Vector3(-1.5, 0.4, 0.1));
    scene.add(gate);
  }
  const observer = new ResizeObserver(() => {
    const w = Math.max(1, element.clientWidth),
      h = Math.max(1, element.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
  observer.observe(element);
  let frame = 0,
    disposed = false;
  const render = () => {
    if (disposed) return;
    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
  };
  frame = requestAnimationFrame(render);
  return {
    resize() {
      observer.disconnect();
      observer.observe(element);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
          o.geometry.dispose();
          const m = o.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
