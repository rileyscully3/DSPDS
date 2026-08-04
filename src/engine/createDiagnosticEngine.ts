import * as THREE from "three";
import type { EngineHost } from "./contracts";
import { designTokens } from "../design/tokens";

export function mountDiagnosticEngine(element: HTMLElement): EngineHost {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  element.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(designTokens.color.sceneSky);
  scene.fog = new THREE.Fog(designTokens.color.sceneSky, 7, 18);
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 30);
  camera.position.set(0, 2.7, 7);
  camera.lookAt(0, 0.8, 0);
  const geometry = new THREE.TorusKnotGeometry(0.9, 0.22, 96, 12);
  const material = new THREE.MeshStandardMaterial({
    color: designTokens.color.accent,
    roughness: 0.72,
    metalness: 0.05,
  });
  const object = new THREE.Mesh(geometry, material);
  object.position.y = 1.25;
  scene.add(object);
  const floorGeometry = new THREE.PlaneGeometry(24, 24);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: designTokens.color.sceneFloor,
    roughness: 1,
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  scene.add(new THREE.HemisphereLight(0xd2cefd, 0x141624, 1.2));
  const light = new THREE.DirectionalLight(0xb5abfc, 2);
  light.position.set(4, 7, 5);
  scene.add(light);
  let frame = 0;
  let disposed = false;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const resize = () => {
    const width = Math.max(element.clientWidth, 1),
      height = Math.max(element.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const render = (time: number) => {
    if (disposed) return;
    if (!reduced) {
      object.rotation.y = time * 0.00018;
      object.rotation.x = time * 0.00008;
    }
    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(element);
  resize();
  frame = requestAnimationFrame(render);
  return {
    resize,
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      floorGeometry.dispose();
      floorMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
