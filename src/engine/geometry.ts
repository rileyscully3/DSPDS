import * as THREE from "three";
/** Angular vector in the camera tangent plane: +x right, +y up; magnitude is great-circle angle. */
export function angularRay(xDeg: number, yDeg: number) {
  const angle = (Math.hypot(xDeg, yDeg) * Math.PI) / 180;
  if (!angle) return new THREE.Vector3(0, 0, -1);
  const length = Math.hypot(xDeg, yDeg);
  return new THREE.Vector3(
    (Math.sin(angle) * xDeg) / length,
    (Math.sin(angle) * yDeg) / length,
    -Math.cos(angle),
  );
}
export function targetOnCameraPlane(
  camera: THREE.PerspectiveCamera,
  xDeg: number,
  yDeg: number,
  depth = 16,
) {
  const ray = angularRay(xDeg, yDeg);
  ray.multiplyScalar(depth / -ray.z).applyQuaternion(camera.quaternion);
  return ray.add(camera.position);
}
export function inputAngles(
  dx: number,
  dy: number,
  degreesPerRawCount: number,
) {
  return {
    yawDeg: dx * degreesPerRawCount,
    pitchDeg: -dy * degreesPerRawCount,
  };
}
