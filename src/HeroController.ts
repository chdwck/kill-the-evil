import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";

import HeroInput from './HeroInput';

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
  fsm: FSM;
  input: HeroInput;
  mixer!: THREE.AnimationMixer;
  target!: THREE.Group;
  manager!: THREE.LoadingManager;
  animations: Record<string, Animation> = {};
  position: THREE.Vector3;
  scene: THREE.Scene;
  deceleration: THREE.Vector3;
  acceleration: THREE.Vector3;
  velocity: THREE.Vector3;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.deceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
    this.acceleration = new THREE.Vector3(1, 0.25, 50.0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.position = new THREE.Vector3();
    this.input = new HeroInput();
    this.fsm = new FSM(new HeroControllerProxy(this.animations));
    this.loadModels();
  }

  get rotation(): THREE.Quaternion {
    if (!this.target) {
      return new THREE.Quaternion();
    }

    return this.target.quaternion;
  }

  loadModels() {
    const loader = new FBXLoader();
    loader.setPath("./assets/content/Characters/");
    loader.load("DungeonCrawler_Character.fbx", (fbx) => {
      fbx.scale.setScalar(0.01);
      fbx.traverse((c) => {
        // c.castShadow = true;
      });

      this.target = fbx;
      this.scene.add(this.target);
      this.mixer = new THREE.AnimationMixer(this.target);

      this.manager = new THREE.LoadingManager();
      this.manager.onLoad = () => {
        this.fsm.setState("idle");
      };

      const onLoad = (animationName: string, animation: THREE.Group) => {
        const clip = animation.animations[0];
        const action = this.mixer.clipAction(clip);

        this.animations[animationName] = {
          clip,
          action,
        };
      };

      const animationLoader = new FBXLoader(this.manager);
      animationLoader.setPath("./assets/content/Characters/");
      animationLoader.load("idle.fbx", (anim) => onLoad("idle", anim));
      animationLoader.load("run.fbx", (anim) => onLoad("run", anim));
      animationLoader.load("walk.fbx", (anim) => onLoad("walk", anim));
      animationLoader.load("dance.fbx", (anim) => onLoad("dance", anim));
    });
  }

  update(timeInSeconds: number) {
    if (!this.target) {
      return;
    }

    this.fsm.update(timeInSeconds, this.input);

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

    const controlObject = this.target;
    const quat = new THREE.Quaternion();
    const a = new THREE.Vector3();
    const r = controlObject.quaternion.clone();

    const acc = this.acceleration.clone();
    if (this.input.keys.shift) {
      acc.multiplyScalar(2.0); // speed up to run
    }

    if (this.fsm.currentState?.name == "dance") {
      acc.multiplyScalar(0.0); // kill acceleration and dance!
    }

    if (this.input.keys.forward) {
      velocity.z += acc.z * timeInSeconds;
    }

    if (this.input.keys.backward) {
      velocity.z -= acc.z * timeInSeconds;
    }

    if (this.input.keys.left) {
      a.set(0, 1, 0);
      quat.setFromAxisAngle(
        a,
        4.0 * Math.PI * timeInSeconds * this.acceleration.y,
      );
      r.multiply(quat);
    }

    if (this.input.keys.right) {
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

    if (this.mixer) {
      this.mixer.update(timeInSeconds);
    }
  }
}


interface State {
  parent: FSM;
  name: string;
  update(timeElapsed: number, input: any): void;
  enter(state: State | null): void;
  exit(): void;
}

type StateFactory = (parent: FSM) => State;

class FSM {
  states: Record<string, StateFactory>;
  currentState: State | null;

  proxy: HeroControllerProxy;

  constructor(proxy: HeroControllerProxy) {
    this.states = {};
    this.currentState = null;

    this.proxy = proxy;
    this.addState("idle", (parent) => new IdleState(parent));
    this.addState("run", (parent) => new RunState(parent));
    this.addState("walk", (parent) => new WalkState(parent));
    this.addState("dance", (parent) => new DanceState(parent));
  }

  addState(name: string, stateFactory: StateFactory) {
    this.states[name] = stateFactory;
  }

  setState(name: string) {
    const prevState = this.currentState;

    if (prevState) {
      if (prevState.name === name) {
        return;
      }

      prevState.exit();
    }

    const state = this.states[name](this);
    this.currentState = state;
    state.enter(prevState);
  }

  update(timeElapsed: number, input: HeroInput) {
    if (this.currentState) {
      this.currentState.update(timeElapsed, input);
    }
  }
}

class DanceState implements State {
  parent: FSM;

  constructor(parent: FSM) {
    this.parent = parent;

    this.finished = this.finished.bind(this);
  }

  get name() {
    return "dance";
  }

  enter(prevState: State | null) {
    const currentAction = this.parent.proxy.animations["dance"].action;
    const mixer = currentAction.getMixer();
    mixer.addEventListener("finished", this.finished);

    if (!prevState) {
      currentAction.play();
      return;
    }

    const prevAction = this.parent.proxy.animations[prevState.name].action;

    currentAction.reset();
    currentAction.setLoop(THREE.LoopOnce, 1);
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

  update(_timeElapsed: number, _input: HeroInput) {}
}

class IdleState implements State {
  parent: FSM;
  constructor(parent: FSM) {
    this.parent = parent;
  }

  get name() {
    return "idle";
  }

  enter(prevState: State | null) {
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

  update(_timeElapsed: number, input: HeroInput) {
    if (input.keys.forward || input.keys.backward) {
      this.parent.setState("walk");
    } else if (input.keys.space) {
      this.parent.setState("dance");
    }
  }
}

class WalkState implements State {
  parent: FSM;
  constructor(parent: FSM) {
    this.parent = parent;
  }

  get name() {
    return "walk";
  }

  enter(prevState: State) {
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

  update(_timeElpased: number, input: HeroInput) {
    if (input.keys.forward || input.keys.backward) {
      if (input.keys.shift) {
        this.parent.setState("run");
      }
      return;
    }

    this.parent.setState("idle");
  }
}

class RunState implements State {
  parent: FSM;
  constructor(parent: FSM) {
    this.parent = parent;
  }

  get name() {
    return "run";
  }

  enter(prevState: State) {
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

  update(_timeElpased: number, input: HeroInput) {
    if (input.keys.forward || input.keys.backward) {
      if (!input.keys.shift) {
        this.parent.setState("walk");
      }
      return;
    }

    this.parent.setState("idle");
  }
}
