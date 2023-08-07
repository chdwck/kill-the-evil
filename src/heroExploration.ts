import * as THREE from "three";

import {
  EntityState,
  getAnimationController,
  getThreeObj,
  heroId,
} from "./entities";
import { GameInputState } from "./GameInput";

const DECELERATION = new THREE.Vector3(-0.0005, -0.0001, -5.0);
const ACCELERATION = new THREE.Vector3(1, 0.25, 25.0);

export function updateHeroPosition(
  scene: THREE.Scene,
  velocity: THREE.Vector3,
  input: GameInputState,
  timeElapsedS: number,
) {
  const controlObject = getThreeObj(scene, heroId);
  if (!controlObject) {
    return;
  }
  const frameDeleceration = new THREE.Vector3(
    velocity.x * DECELERATION.x,
    velocity.y * DECELERATION.y,
    velocity.z * DECELERATION.z,
  );

  frameDeleceration.multiplyScalar(timeElapsedS);
  frameDeleceration.z =
    Math.sign(frameDeleceration.z) *
    Math.min(Math.abs(frameDeleceration.z), Math.abs(velocity.z));

  velocity.add(frameDeleceration);

  const quat = new THREE.Quaternion();
  const a = new THREE.Vector3();
  const r = controlObject.quaternion.clone();

  const acc = ACCELERATION.clone();
  if (input.backward) {
    acc.multiplyScalar(0.5); // slow down when walking backwards
  }

  if (input.shift) {
    acc.multiplyScalar(2.0); // speed up to run
  }

  if (input.forward) {
    velocity.z += acc.z * timeElapsedS;
  }

  if (input.backward) {
    velocity.z -= acc.z * timeElapsedS;
  }

  if (input.left) {
    a.set(0, 1, 0);
    quat.setFromAxisAngle(a, 4.0 * Math.PI * timeElapsedS * ACCELERATION.y);
    r.multiply(quat);
  }

  if (input.right) {
    a.set(0, 1, 0);
    quat.setFromAxisAngle(a, 4.0 * -Math.PI * timeElapsedS * ACCELERATION.y);
    r.multiply(quat);
  }

  controlObject.quaternion.copy(r);

  const forward = new THREE.Vector3(0, 0, 1);
  forward.applyQuaternion(controlObject.quaternion);
  forward.normalize();

  const sideways = new THREE.Vector3(1, 0, 0);
  sideways.applyQuaternion(controlObject.quaternion);
  sideways.normalize();

  forward.multiplyScalar(velocity.z * timeElapsedS);
  sideways.multiplyScalar(velocity.x * timeElapsedS);

  controlObject.position.add(forward);
  controlObject.position.add(sideways);
}

// correlates to loaded hero animations
export const heroAnimationStates = {
  idle: "idle",
  run: "run",
  walk: "walk",
  walkback: "walkback",
} as const;

export type HeroAnimationState = keyof typeof heroAnimationStates;

export function updateHeroExploreAnimations(
  prevState: HeroAnimationState,
  entityState: EntityState,
  inputState: GameInputState,
): HeroAnimationState {
  let nextState = heroAnimationStates.idle as HeroAnimationState;
  const animationController = getAnimationController(entityState, heroId);
  if (!animationController) {
    return nextState;
  }

  if (inputState.forward && inputState.shift) {
    nextState = heroAnimationStates.run;
  } else if (inputState.forward) {
    nextState = heroAnimationStates.walk;
  } else if (inputState.backward) {
    nextState = heroAnimationStates.walkback;
  }

  if (nextState === prevState) {
    return nextState;
  }

  const prevAction = animationController.animations[prevState].action;
  const nextAction = animationController.animations[nextState].action;

  nextAction.enabled = true;
  const isWalkToRunOrViceVersa = 
    prevState === heroAnimationStates.run && nextState === heroAnimationStates.walk ||
    nextState === heroAnimationStates.run && prevState === heroAnimationStates.walk;
  if (isWalkToRunOrViceVersa) {
    const ratio = nextAction.getClip().duration / prevAction.getClip().duration;
    nextAction.time = prevAction.time * ratio;
  } else {
    nextAction.time = 0.0;
    nextAction.setEffectiveTimeScale(1.0);
    nextAction.setEffectiveWeight(1.0);
  }

  nextAction.crossFadeFrom(prevAction, 0.5, true);
  nextAction.play();

  return nextState;
}
