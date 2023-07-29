import * as THREE from "three";
import BattleController from "./BattleController";
import { WALL_HEIGHT } from "./RoomManager";
import GameInput from "./GameInput";

class Degree {
  value: number;
  constructor(value: number) {
    this.value = value % 360;
  }

  increment() {
    this.setValue(this.value + 1);
  }

  decrement() {
    this.setValue(this.value - 1);
  }

  setValue(value: number) {
    this.value = value % 360;
  }

  get radians() {
    return (this.value * Math.PI) / 180;
  }
}

class Zoom {
  step: number;
  value: number;
  maxZoom: number;
  minZoom: number;

  constructor(step: number, minZoom: number, maxZoom: number) {
    this.step = step;
    this.maxZoom = maxZoom;
    this.minZoom = minZoom;
    this.value = (minZoom + maxZoom) / 2;
  }

  zoomIn() {
    this.value = Math.max(this.value - this.step, this.minZoom); 
  }

  zoomOut() {
    this.value = Math.min(this.value + this.step, this.maxZoom);
  }
}

export default class TacticsCamera {
  currentPosition: THREE.Vector3;
  currentLookAt: THREE.Vector3;
  camera: THREE.PerspectiveCamera;
  target: BattleController;
  zoom: Zoom;
  offset: THREE.Vector3;
  deg: Degree;

  constructor(camera: THREE.PerspectiveCamera, target: BattleController) {
    this.camera = camera;
    this.target = target;

    this.currentPosition = this.camera.position;
    this.currentLookAt = new THREE.Vector3();
    this.zoom = new Zoom(0.25, 5, Math.max(this.target.room.worldWidth, this.target.room.worldHeight) * 1.5);
    this.offset = new THREE.Vector3(
      this.target.room.worldWidth / -1.5,
      WALL_HEIGHT,
      0,
    );
    this.offset.add(this.target.room.position);
    this.deg = new Degree(270);
  }

  calculateIdealLookAt(): THREE.Vector3 {
    const idealLookAt = new THREE.Vector3(0, WALL_HEIGHT, 0);
    idealLookAt.add(this.target.room.position);
    return idealLookAt;
  }

  update(timeElapsedS: number, input: GameInput) {
    if (input.keys.zoomIn) {
      this.zoom.zoomIn();
    }

    if (input.keys.zoomOut) {
      this.zoom.zoomOut();
    }

    if (input.keys.panLeft) {
      this.deg.increment();
    }

    if (input.keys.panRight) {
      this.deg.decrement();
    }

    this.offset.x =
      Math.sin(this.deg.radians) * this.zoom.value + this.target.room.position.x;
    this.offset.z =
      Math.cos(this.deg.radians) * -this.zoom.value - this.target.room.position.z;

    const idealLookAt = this.calculateIdealLookAt();

    const t = 1.0 - Math.pow(0.001, timeElapsedS);
    this.currentPosition.lerp(this.offset, t);
    this.currentLookAt.lerp(idealLookAt, t);

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(idealLookAt);
  }
}
