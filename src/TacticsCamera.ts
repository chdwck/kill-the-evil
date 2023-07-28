import * as THREE from "three";
import BattleController from "./BattleController";
import { WALL_HEIGHT } from "./RoomManager";

export default class TacticsCamera {
  currentPosition: THREE.Vector3;
  currentLookAt: THREE.Vector3;
  camera: THREE.PerspectiveCamera;
  target: BattleController;

  constructor(camera: THREE.PerspectiveCamera, target: BattleController) {
    this.camera = camera;
    this.target = target;

    this.currentPosition = this.camera.position;
    this.currentLookAt = new THREE.Vector3();
  }

  calculateIdealOffset(): THREE.Vector3 {
    const idealOffset = new THREE.Vector3(
      this.target.room.worldWidth / -2,
      WALL_HEIGHT,
      -3.0,
    );
    idealOffset.add(this.target.room.position);
    return idealOffset;
  }

  calculateIdealLookAt(): THREE.Vector3 {
    const idealLookAt = new THREE.Vector3(0, 0, 0);
    idealLookAt.add(this.target.room.position);
    return idealLookAt;
  }

  update(timeElapsedS: number) {
    const idealOffset = this.calculateIdealOffset();
    const idealLookAt = this.calculateIdealLookAt();

    const t = 1.0 - Math.pow(0.001, timeElapsedS);
    this.currentPosition.lerp(idealOffset, t);
    this.currentLookAt.lerp(idealLookAt, t);

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(idealLookAt);
  }
}
