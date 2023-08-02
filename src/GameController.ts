import * as THREE from "three";
import FSM, { type State } from "./FSM";
import GameInput from "./GameInput";
import HeroController from "./HeroController";
import ThirdPersonCamera from "./ThirdPersonCamera";
import GameObjectStore from "./GameObjectStore";
import RoomManager, {
  type RoomEvent,
  RoomRenderedEvent,
  Room,
} from "./RoomManager";
import TacticsCamera from "./TacticsCamera";
import BattleController from "./BattleController";

export class GameControllerProxy {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  objectStore: GameObjectStore;
  roomManager: RoomManager;
  input: GameInput;

  constructor(gc: GameController) {
    this.scene = gc.scene;
    this.camera = gc.camera;
    this.objectStore = gc.objectStore;
    this.roomManager = gc.roomManager;
    this.input = gc.input;
  }
}

export default class GameController {
  fsm: GameFSM | undefined;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  objectStore: GameObjectStore;
  roomManager: RoomManager;
  input: GameInput;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.roomManager = new RoomManager(
      this.scene,
      this.roomEventHandler.bind(this),
    );
    this.input = new GameInput();
    this.objectStore = new GameObjectStore(this.scene);
  }

  async init() {
    await this.objectStore.createHero();
    this.fsm = new GameFSM(new GameControllerProxy(this));
    this.fsm.setState(ExploreState.staticName);
    this.roomManager.init();
  }

  async createAndOrientEnemies(
    x: number,
    y: number,
    room: Room,
  ): Promise<string> {
    const skele = await this.objectStore.createSkeleton();
    const obj = this.objectStore.getThreeObj(skele.id);
    if (obj) {
      obj.position.copy(room.layoutXYToPosition(x, y));
      obj.lookAt(this.objectStore.getHeroThreeObj().position);
    }
    return skele.id;
  }

  roomEventHandler<TEvent extends RoomEvent>(event: TEvent) {
    if (event.name === RoomRenderedEvent.eventName) {
      event.room.hydrateLayout(this.createAndOrientEnemies.bind(this));
    }
  }

  update(timeElapsedS: number) {
    if (!this.fsm) {
      return;
    }
    if (this.fsm.currentState) {
      this.fsm.currentState.update(timeElapsedS, this.input);
    }
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
    this.heroController = new HeroController(
      this.parent.proxy,
      this.parent.proxy.objectStore,
    );
    this.thirdPersonCamera = new ThirdPersonCamera(
      this.parent.proxy.camera,
      this.parent.proxy.objectStore,
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
      this.parent.proxy.objectStore,
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
