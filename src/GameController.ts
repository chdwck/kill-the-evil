import * as THREE from "three";
import FSM, { type State } from "./FSM";
import HeroController from "./HeroController";
import ThirdPersonCamera from "./ThirdPersonCamera";

export interface CameraControls {
  camera: THREE.PerspectiveCamera;
  update(timeElapsedS: number): void;
}

export interface Controller {
  update(timeElapsedS: number): void;
}

class GameControllerProxy {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;

  constructor(gc: GameController) {
    this.scene = gc.scene;
    this.camera = gc.camera;
  }
}

export default class GameController {
  fsm: GameFSM;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  input: GameInput;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.fsm = new GameFSM(new GameControllerProxy(this));
    this.input = new GameInput();

    this.fsm.setState(ExploreState.staticName)
  }

  update(timeElapsedS: number) {
    if (this.fsm.currentState) {
      this.fsm.currentState.update(timeElapsedS, this.input);
    }
  }
}

class GameInput {}

type GameState = State<GameControllerProxy, GameInput>;
class GameFSM extends FSM<GameControllerProxy, GameInput> {
  constructor(proxy: GameControllerProxy) {
    super(proxy);

    this.states = {
      explore: new ExploreState(this),
      battle: new BattleState(this),
    };
  }
}

class ExploreState implements GameState {
  static staticName: string = "explore";
  parent: GameFSM;
  heroController: HeroController;
  thirdPersonCamera: ThirdPersonCamera;

  constructor(fsm: GameFSM) {
    this.parent = fsm;
    this.heroController = new HeroController(this.parent.proxy.scene);
    this.thirdPersonCamera = new ThirdPersonCamera(
      this.parent.proxy.camera,
      this.heroController,
    );
  }

  get name()  {
    return ExploreState.staticName;
  }

  update(timeElapsedS: number, input: GameInput) {
    if (this.heroController) {
      this.heroController.update(timeElapsedS);
    }

    this.thirdPersonCamera.update(timeElapsedS);
  }

  enter(state: GameState | null) {}

  exit() {}
}

class BattleState implements GameState {
  parent: GameFSM;

  constructor(fsm: GameFSM) {
    this.parent = fsm;
  }

  get name() {
    return "battle";
  }

  update(timeElapsedS: number, input: GameInput) {}

  enter(state: GameState | null) {}

  exit() {}
}
