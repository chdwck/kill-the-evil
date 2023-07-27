import * as THREE from 'three'
import HeroController from './HeroController';

export default class ThirdPersonCamera {
  camera: THREE.PerspectiveCamera;
  currentPosition: THREE.Vector3;
  currentLookAt: THREE.Vector3;
  target: HeroController;

  constructor(
    camera: THREE.PerspectiveCamera,
    target: HeroController,
  ) {
    this.camera = camera;
    this.target = target;

    this.currentPosition = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();
  }

  calculateIdealOffset(): THREE.Vector3 {
    const idealOffset = new THREE.Vector3(-1.5, 1.5, -3.0);
    idealOffset.applyQuaternion(this.target.rotation);
    idealOffset.add(this.target.position);
    return idealOffset;
  }

  calculateIdealLookAt(): THREE.Vector3 {
    const idealLookAt = new THREE.Vector3(0, 10, 50);
    idealLookAt.applyQuaternion(this.target.rotation);
    idealLookAt.add(this.target.position);
    return idealLookAt;
  }

  update(timeElapsedS: number) {
    const idealOffset = this.calculateIdealOffset();
    const idealLookAt = this.calculateIdealLookAt();

    const t = 1.25 - Math.pow(0.001, timeElapsedS);
    this.currentPosition.lerp(idealOffset, t);
    this.currentLookAt.lerp(idealLookAt, t);

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(idealLookAt);
  }
}
