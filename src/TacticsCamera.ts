import * as THREE from "three";
import { Room, WALL_HEIGHT, getWorldDimensions } from "./rooms";
import { GameInputState } from "./GameInput";

function degreeValue(value: number): number {
  if (value < 0) {
    return 359;
  } else {
    return value % 360;
  }
}

function getRadians(degree: number): number {
  return (degree * Math.PI) / 180;
}

const ZOOM_STEP = 0.25;
type ZoomState = {
  value: number;
  max: number;
  min: number;
};

function createZoomState(min: number, max: number): ZoomState {
  const value = Math.floor(max - min) / 2;
  return {
    value,
    min,
    max,
  };
}

function zoomOut(zoom: ZoomState) {
  zoom.value = Math.min(zoom.value + ZOOM_STEP, zoom.max);
}

function zoomIn(zoom: ZoomState) {
  zoom.value = Math.max(zoom.value - ZOOM_STEP, zoom.min);
}

export type TacticsCameraState = {
  currentPosition: THREE.Vector3;
  currentLookAt: THREE.Vector3;
  zoom: ZoomState;
  offset: THREE.Vector3;
  deg: number;
};

export function createTacticsCameraState(
  camera: THREE.PerspectiveCamera,
  room: Room,
) {
  const [roomWidth, roomHeight] = getWorldDimensions(room);
  const offset = new THREE.Vector3(roomWidth / -1.5, WALL_HEIGHT, 0);
  offset.add(room.position);
  return {
    currentPosition: camera.position,
    currentLookAt: new THREE.Vector3(),
    zoom: createZoomState(5, Math.max(roomWidth, roomHeight) * 1.5),
    offset,
    deg: 0,
  };
}

export function tickTacticsCamera(
  state: TacticsCameraState,
  input: GameInputState,
  camera: THREE.PerspectiveCamera,
  room: Room,
  lookAt: THREE.Vector3,
  timeElapsedS: number,
) {
  if (input.zoomIn) {
    zoomIn(state.zoom);
  }

  if (input.zoomOut) {
    zoomOut(state.zoom);
  }
  if (input.panLeft) {
    state.deg = degreeValue(state.deg + 1);
  }

  if (input.panRight) {
    state.deg = degreeValue(state.deg - 1);
  }

  const radians = getRadians(state.deg);
  state.offset.x = Math.sin(radians) * state.zoom.value + room.position.x;

  state.offset.z = Math.cos(radians) * -state.zoom.value - room.position.z;

  const idealLookAt = new THREE.Vector3(0, WALL_HEIGHT, 0);
  idealLookAt.add(lookAt);

  const t = 1.0 - Math.pow(0.001, timeElapsedS);
  state.currentPosition.lerp(state.offset, t);
  state.currentLookAt.lerp(idealLookAt, t);

  camera.position.copy(state.currentPosition);
  camera.lookAt(idealLookAt);
}
