import * as THREE from "three";

type ThirdPersonCameraState = {
  currentPosition: THREE.Vector3;
  currentLookAt: THREE.Vector3;
};

export function createThirdPersonCameraState() {
  return {
    currentPosition: new THREE.Vector3(),
    currentLookAt: new THREE.Vector3(),
  };
}

export function tickThirdPersonCameraFollow(
  state: ThirdPersonCameraState,
  camera: THREE.PerspectiveCamera,
  target: THREE.Group,
  timeElapsedS: number,
) {
  const idealOffset = new THREE.Vector3(-1.5, 1.5, -3.0);
  idealOffset.applyQuaternion(target.quaternion);
  idealOffset.add(target.position);

  const idealLookAt = new THREE.Vector3(0, 10, 50);
  idealLookAt.applyQuaternion(target.quaternion);
  idealLookAt.add(target.position);

  const t = 1.25 - Math.pow(0.001, timeElapsedS);
  state.currentPosition.lerp(idealOffset, t);
  state.currentLookAt.lerp(idealLookAt, t);

  camera.position.copy(state.currentPosition);
  camera.lookAt(idealLookAt);
}
