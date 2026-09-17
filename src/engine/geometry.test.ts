import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { targetOnCameraPlane, inputAngles } from "./geometry";
describe("presented angular geometry", () => {
  it.each([
    [18, 0],
    [0, 18],
    [18 / Math.sqrt(2), 18 / Math.sqrt(2)],
    [-18, 0],
  ])("matches analytic camera-relative ray (%s, %s)", (x, y) => {
    const camera = new THREE.PerspectiveCamera(90, 16 / 9, 0.1, 60);
    camera.position.set(0, 2, 6);
    camera.rotation.set(-0.07, 0.2, 0);
    const p = targetOnCameraPlane(camera, x, y);
    const direction = p
      .sub(camera.position)
      .normalize()
      .applyQuaternion(camera.quaternion.clone().invert());
    expect((Math.acos(-direction.z) * 180) / Math.PI).toBeCloseTo(
      Math.hypot(x, y),
      10,
    );
    if (y) expect(direction.x / direction.y).toBeCloseTo(x / y, 10);
  });
  it("changes projection with FOV while retaining physical rotation", () => {
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 60);
    const p = targetOnCameraPlane(camera, 18, 0);
    const narrow = p.clone().project(camera).x;
    camera.fov = 110;
    camera.updateProjectionMatrix();
    expect(p.clone().project(camera).x).toBeLessThan(narrow);
    expect(inputAngles(100, 100, 0.01)).toEqual({ yawDeg: 1, pitchDeg: -1 });
  });
});
