import * as THREE from "three";
import FSM, { type State } from "./FSM";
import GameInput from "./GameInput";
import HeroController from "./HeroController";
import ThirdPersonCamera from "./ThirdPersonCamera";
import AssetManager from "./AssetManager";
import RoomManager, { type RoomEvent, RoomEnteredEvent } from "./RoomManager";
import TacticsCamera from "./TacticsCamera";
import BattleController from "./BattleController";

export class GameControllerProxy {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  assetManager: AssetManager;
  roomManager: RoomManager;
  input: GameInput;

  constructor(gc: GameController) {
    this.scene = gc.scene;
    this.camera = gc.camera;
    this.assetManager = gc.assetManager;
    this.roomManager = gc.roomManager;
    this.input = gc.input;
  }
}

export default class GameController {
  fsm: GameFSM;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  assetManager: AssetManager;
  roomManager: RoomManager;
  input: GameInput;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.assetManager = new AssetManager(scene);
    this.roomManager = new RoomManager(
      this.scene,
      this.assetManager,
      this.roomEventHandler.bind(this),
    );
    this.input = new GameInput();
    this.fsm = new GameFSM(new GameControllerProxy(this));

    this.fsm.setState(ExploreState.staticName);

    this.roomManager.init();
  }

  roomEventHandler<TEvent extends RoomEvent>(event: TEvent) {
    if (event.name === RoomEnteredEvent.eventName) {
      // this.fsm.setState(BattleState.staticName);
    }
  }

  update(timeElapsedS: number) {
    if (this.fsm.currentState) {
      this.fsm.currentState.update(timeElapsedS, this.input);
    }

    this.roomManager.update();
  }
}

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
    this.heroController = new HeroController(this.parent.proxy);
    this.thirdPersonCamera = new ThirdPersonCamera(
      this.parent.proxy.camera,
      this.heroController,
    );
  }

  get name() {
    return ExploreState.staticName;
  }

  update(timeElapsedS: number, input: GameInput) {
    if (input.keys.battleView) {
      this.parent.setState(BattleState.staticName);
      return;
    }
    if (this.heroController) {
      this.heroController.update(timeElapsedS);
    }

    this.thirdPersonCamera.update(timeElapsedS);
  }

  enter(state: GameState | null) {
    this.thirdPersonCamera.update(0);
  }

  exit() {}
}

class BattleState implements GameState {
  static staticName: string = "battle";
  parent: GameFSM;
  battleController: BattleController;
  tacticsCamera: TacticsCamera;

  constructor(fsm: GameFSM) {
    this.parent = fsm;
    this.battleController = new BattleController(
      this.parent.proxy.roomManager.currentRoom,
      this.parent.proxy.roomManager.assetManager
    );
    this.tacticsCamera = new TacticsCamera(
      this.parent.proxy.camera,
      this.parent.proxy.roomManager.currentRoom,
    );
  }

  get name() {
    return BattleState.staticName;
  }

  update(timeElapsedS: number, input: GameInput) {
    if (!input.keys.battleView) {
      this.parent.setState(ExploreState.staticName);
      return;
    }

    this.tacticsCamera.update(timeElapsedS, input);
    this.battleController.update(timeElapsedS, input, this.tacticsCamera);
  }

  enter(prevState: GameState | null) {
    this.battleController.loadBattleField();
  }

  exit() {
    this.battleController.unloadBattleField();
  }
}
