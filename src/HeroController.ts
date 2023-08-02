import * as THREE from "three";

import FSM, { type State } from "./FSM";
import { GameControllerProxy } from "./GameController";
import GameInput from "./GameInput";
import GameObjectStore from "./GameObjectStore";

type Animation = {
  clip: THREE.AnimationClip;
  action: THREE.AnimationAction;
};

class HeroControllerProxy {
  animations: Record<string, Animation> = {};

  constructor(animations: Record<string, Animation>) {
    this.animations = animations;
  }
}

export default class HeroController {
  proxy: GameControllerProxy;
  fsm: HeroFSM;
  objectStore: GameObjectStore;
  position: THREE.Vector3;
  deceleration: THREE.Vector3;
  acceleration: THREE.Vector3;
  velocity: THREE.Vector3;

  constructor(proxy: GameControllerProxy, objectStore: GameObjectStore) {
    this.proxy = proxy;
    this.deceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
    this.acceleration = new THREE.Vector3(1, 0.25, 25.0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.position = new THREE.Vector3();
    this.objectStore = objectStore;
    this.fsm = new HeroFSM(
      new HeroControllerProxy(
        this.objectStore.getHeroAnimationController().animations,
      ),
    );
    this.fsm.setState(IdleState.staticName)
 }

  update(timeInSeconds: number) {
    this.fsm.update(timeInSeconds, this.proxy.input);

    const velocity = this.velocity;
    const frameDeleceration = new THREE.Vector3(
      velocity.x * this.deceleration.x,
      velocity.y * this.deceleration.y,
      velocity.z * this.deceleration.z,
    );

    frameDeleceration.multiplyScalar(timeInSeconds);
    frameDeleceration.z =
      Math.sign(frameDeleceration.z) *
      Math.min(Math.abs(frameDeleceration.z), Math.abs(velocity.z));

    velocity.add(frameDeleceration);

    const controlObject = this.objectStore.getHeroThreeObj();
    const quat = new THREE.Quaternion();
    const a = new THREE.Vector3();
    const r = controlObject.quaternion.clone();

    const acc = this.acceleration.clone();
    if (this.proxy.input.keys.shift) {
      acc.multiplyScalar(2.0); // speed up to run
    }

    if (this.fsm.currentState?.name == "dance") {
      acc.multiplyScalar(0.0); // kill acceleration and dance!
    }

    if (this.proxy.input.keys.forward) {
      velocity.z += acc.z * timeInSeconds;
    }

    if (this.proxy.input.keys.backward) {
      velocity.z -= acc.z * timeInSeconds;
    }

    if (this.proxy.input.keys.left) {
      a.set(0, 1, 0);
      quat.setFromAxisAngle(
        a,
        4.0 * Math.PI * timeInSeconds * this.acceleration.y,
      );
      r.multiply(quat);
    }

    if (this.proxy.input.keys.right) {
      a.set(0, 1, 0);
      quat.setFromAxisAngle(
        a,
        4.0 * -Math.PI * timeInSeconds * this.acceleration.y,
      );
      r.multiply(quat);
    }

    controlObject.quaternion.copy(r);

    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(controlObject.quaternion);
    forward.normalize();

    const sideways = new THREE.Vector3(1, 0, 0);
    sideways.applyQuaternion(controlObject.quaternion);
    sideways.normalize();

    forward.multiplyScalar(velocity.z * timeInSeconds);
    sideways.multiplyScalar(velocity.x * timeInSeconds);

    controlObject.position.add(forward);
    controlObject.position.add(sideways);

    this.position.copy(controlObject.position);

    this.objectStore.getHeroAnimationController().mixer.update(timeInSeconds);
  }
}

type HeroState = State<HeroControllerProxy, GameInput>;
class HeroFSM extends FSM<HeroControllerProxy, GameInput> {
  constructor(proxy: HeroControllerProxy) {
    super(proxy);
    this.states = {
      idle: new IdleState(this),
      run: new RunState(this),
      walk: new WalkState(this),
      dance: new DanceState(this),
    };
  }
}

class DanceState implements HeroState {
  parent: HeroFSM;

  constructor(parent: HeroFSM) {
    this.parent = parent;

    this.finished = this.finished.bind(this);
  }

  get name() {
    return "dance";
  }

  enter(prevState: HeroState | null) {
    const currentAction = this.parent.proxy.animations["dance"].action;
    const mixer = currentAction.getMixer();
    mixer.addEventListener("finished", this.finished);

    if (!prevState) {
      currentAction.play();
      return;
    }

    const prevAction = this.parent.proxy.animations[prevState.name].action;

    currentAction.reset();
    currentAction.setLoop(THREE.LoopRepeat, 3);
    currentAction.clampWhenFinished = true;
    currentAction.crossFadeFrom(prevAction, 0.2, true);
    currentAction.play();
  }

  finished() {
    this.cleanUp();
    this.parent.setState("idle");
  }

  cleanUp() {
    const action = this.parent.proxy.animations["dance"].action;
    action.getMixer().removeEventListener("finished", this.finished);
  }

  exit() {}

  update(_timeElapsed: number, _input: GameInput) {}
}

class IdleState implements HeroState {
  static staticName: string = 'idle'
  parent: HeroFSM;
  constructor(parent: HeroFSM) {
    this.parent = parent;
  }

  get name() {
    return IdleState.staticName;
  }

  enter(prevState: HeroState | null) {
    const idleAction = this.parent.proxy.animations["idle"].action;
    if (!prevState) {
      idleAction.play();
      return;
    }

    const prevAction = this.parent.proxy.animations[prevState.name].action;
    idleAction.time = 0.0;
    idleAction.enabled = true;
    idleAction.setEffectiveTimeScale(1.0);
    idleAction.setEffectiveWeight(1.0);
    idleAction.crossFadeFrom(prevAction, 0.5, true);
    idleAction.play();
  }

  exit() {}

  update(_timeElapsed: number, input: GameInput) {
    if (input.keys.forward || input.keys.backward) {
      this.parent.setState("walk");
    } else if (input.keys.space) {
      this.parent.setState("dance");
    }
  }
}

class WalkState implements HeroState {
  parent: HeroFSM;
  constructor(parent: HeroFSM) {
    this.parent = parent;
  }

  get name() {
    return "walk";
  }

  enter(prevState: HeroState) {
    const curAction = this.parent.proxy.animations["walk"].action;
    if (prevState) {
      const prevAction = this.parent.proxy.animations[prevState.name].action;

      curAction.enabled = true;

      if (prevState.name == "run") {
        const ratio =
          curAction.getClip().duration / prevAction.getClip().duration;
        curAction.time = prevAction.time * ratio;
      } else {
        curAction.time = 0.0;
        curAction.setEffectiveTimeScale(1.0);
        curAction.setEffectiveWeight(1.0);
      }

      curAction.crossFadeFrom(prevAction, 0.5, true);
      curAction.play();
    } else {
      curAction.play();
    }
  }

  exit() {}

  update(_timeElpased: number, input: GameInput) {
    if (input.keys.forward || input.keys.backward) {
      if (input.keys.shift) {
        this.parent.setState("run");
      }
      return;
    }

    this.parent.setState("idle");
  }
}

class RunState implements HeroState {
  parent: HeroFSM;
  constructor(parent: HeroFSM) {
    this.parent = parent;
  }

  get name() {
    return "run";
  }

  enter(prevState: HeroState) {
    const currentAction = this.parent.proxy.animations["run"].action;
    if (!prevState) {
      currentAction.play();
      return;
    }

    const prevAction = this.parent.proxy.animations[prevState.name].action;

    currentAction.enabled = true;
    if (prevState.name === "walk") {
      const ratio =
        currentAction.getClip().duration / prevAction.getClip().duration;
      currentAction.time = prevAction.time * ratio;
    } else {
      currentAction.time = 0.0;
      currentAction.setEffectiveTimeScale(1.0);
      currentAction.setEffectiveWeight(1.0);
    }

    currentAction.crossFadeFrom(prevAction, 0.5, true);
    currentAction.play();
  }

  exit() {}

  update(_timeElpased: number, input: GameInput) {
    if (input.keys.forward || input.keys.backward) {
      if (!input.keys.shift) {
        this.parent.setState("walk");
      }
      return;
    }

    this.parent.setState("idle");
  }
}
