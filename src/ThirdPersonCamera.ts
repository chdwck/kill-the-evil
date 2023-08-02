import * as THREE from "three";
import GameObjectStore from "./GameObjectStore";

export default class ThirdPersonCamera {
  camera: THREE.PerspectiveCamera;
  currentPosition: THREE.Vector3;
  currentLookAt: THREE.Vector3;
  hero: THREE.Group;

  constructor(camera: THREE.PerspectiveCamera, objectStore: GameObjectStore) {
    this.camera = camera;
    this.hero = objectStore.getHeroThreeObj();

    this.currentPosition = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();
  }

  calculateIdealOffset(): THREE.Vector3 {
    const idealOffset = new THREE.Vector3(-1.5, 1.5, -3.0);
    idealOffset.applyQuaternion(this.hero.quaternion);
    idealOffset.add(this.hero.position);
    return idealOffset;
  }

  calculateIdealLookAt(): THREE.Vector3 {
    const idealLookAt = new THREE.Vector3(0, 10, 50);
    idealLookAt.applyQuaternion(this.hero.quaternion);
    idealLookAt.add(this.hero.position);
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
