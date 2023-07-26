import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

type Keys = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  space: boolean;
  shift: boolean;
};

class BasicCharacterControllerProxy {
  animations: Record<string, Animation> = {};

  constructor(animations: Record<string, Animation>) {
    this.animations = animations;
  }
}

type Animation = {
  clip: THREE.AnimationClip;
  action: THREE.AnimationAction;
};

class BasicCharacterController {
  fsm: FSM;
  input: BasicCharacterControllerInput;
  mixer!: THREE.AnimationMixer;
  target!: THREE.Group;
  manager!: THREE.LoadingManager;
  animations: Record<string, Animation> = {};

  scene: THREE.Scene;
  deceleration: THREE.Vector3;
  acceleration: THREE.Vector3;
  velocity: THREE.Vector3;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.deceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
    this.acceleration = new THREE.Vector3(1, 0.25, 50.0);
    this.velocity = new THREE.Vector3(0, 0, 0);

    this.input = new BasicCharacterControllerInput();
    this.fsm = new FSM(new BasicCharacterControllerProxy(this.animations));
    this.loadModels();
  }

  loadModels() {
    const loader = new FBXLoader();
    loader.setPath("./assets/zombie/");
    loader.load("zombie_character.fbx", (fbx) => {
      fbx.scale.setScalar(0.1);
      fbx.traverse((c) => {
        c.castShadow = true;
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
      animationLoader.setPath("./assets/zombie/");
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

    const oldPosition = new THREE.Vector3();
    oldPosition.copy(controlObject.position);

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

    oldPosition.copy(controlObject.position);

    if (this.mixer) {
      this.mixer.update(timeInSeconds);
    }
  }
}

class BasicCharacterControllerInput {
  keys: Keys;
  constructor() {
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      space: false,
      shift: false,
    };
    window.addEventListener("keydown", (e) => this.onKeyDown(e), false);
    window.addEventListener("keyup", (e) => this.onKeyUp(e), false);
  }

  onKeyDown(e: KeyboardEvent) {
    switch (e.key.toLowerCase()) {
      case "w":
        this.keys.forward = true;
        break;
      case "a":
        this.keys.left = true;
        break;
      case "s": // s
        this.keys.backward = true;
        break;
      case "d": // d
        this.keys.right = true;
        break;
      case "shift":
        this.keys.shift = true;
        break;
      case " ":
        this.keys.space = true;
        break;
      case "ArrowUp":
      case "ArrowLeft":
      case "ArrowDown":
      case "ArrowRight":
        break;
    }
  }

  onKeyUp(e: KeyboardEvent) {
    switch (e.key.toLowerCase()) {
      case "w":
        this.keys.forward = false;
        break;
      case "a":
        this.keys.left = false;
        break;
      case "s": // s
        this.keys.backward = false;
        break;
      case "d": // d
        this.keys.right = false;
        break;
      case "shift":
        this.keys.shift = false;
        break;
      case " ":
        this.keys.space = false;
        break;
      case "ArrowUp":
      case "ArrowLeft":
      case "ArrowDown":
      case "ArrowRight":
        break;
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

  proxy: BasicCharacterControllerProxy;

  constructor(proxy: BasicCharacterControllerProxy) {
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

  update(timeElapsed: number, input: BasicCharacterControllerInput) {
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

  update(_timeElapsed: number, _input: BasicCharacterControllerInput) {}
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

  update(_timeElapsed: number, input: BasicCharacterControllerInput) {
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

  update(_timeElpased: number, input: BasicCharacterControllerInput) {
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

  update(_timeElpased: number, input: BasicCharacterControllerInput) {
    if (input.keys.forward || input.keys.backward) {
      if (!input.keys.shift) {
        this.parent.setState("walk");
      }
      return;
    }

    this.parent.setState("idle");
  }
}

type Position = {
  x: number;
  y: number;
};

class Hero {
  position: Position;
  constructor(x: number, y: number) {
    this.position = { x, y };
  }
}

const WALL_HEIGHT = 10;
const LAYOUT_SIZE = 100;
const CELL_RATIO = 10;
const FLOOR_SIZE = LAYOUT_SIZE * CELL_RATIO;

export const W = "W";
export const D = "D";
const P = "P";
export const _ = "_";
export const E = "E";
export const T = "T";
export type LayoutCell =
  | typeof P
  | typeof T
  | typeof E
  | typeof W
  | typeof D
  | typeof _;

class SquareRoom {
  // prettier-ignore
  layout: LayoutCell[] = [
    W, W, W, W, P, P, W, W, W, W,
    W, _, _, _, _, _, _, _, _, W,
    W, _, _, _, _, _, _, _, _, W,
    W, _, _, _, _, _, _, _, _, W,
    P, _, _, _, _, _, _, _, _, P,
    P, _, _, _, _, _, _, _, _, P,
    W, _, _, _, _, _, _, _, _, W,
    W, _, _, _, _, _, _, _, _, W,
    W, _, _, _, _, _, _, _, _, W,
    W, W, W, W, P, P, W, W, W, W,
  ];
}

class TreasureRoom1 {
  // prettier-ignore
  layout: LayoutCell[] = [
    W, W, W, W, P, P, W, W, W, W,
    W, D, D, D, _, _, D, _, _, W,
    W, D, D, D, _, _, D, _, _, W,
    W, D, D, D, _, _, D, _, _, W,
    P, _, _, _, _, _, _, _, T, W,
    P, _, _, _, _, _, _, _, T, W,
    W, D, D, D, _, _, D, _, _, W,
    W, _, _, _, _, _, D, _, _, W,
    W, _, _, _, _, _, D, _, _, W,
    W, W, W, W, P, P, W, W, W, W,
  ];
}

const ROOM_SIZE = 10;
const roomsRegistry = {
  square: new SquareRoom(),
  treasure1: new TreasureRoom1(),
};

class Layout {
  cells: LayoutCell[];

  constructor() {
    this.cells = Array.from({ length: LAYOUT_SIZE ** 2 }).fill(
      _,
    ) as LayoutCell[];

    this.placeRooms();
    this.printCells();
  }

  updateCell(x: number, y: number, value: LayoutCell) {
    this.cells[y * LAYOUT_SIZE + x] = value;
  }

  getCell(x: number, y: number): LayoutCell {
    return this.cells[y * LAYOUT_SIZE + x];
  }

  roomSpaceCells(
    roomX: number,
    roomY: number,
    callback: (cellX: number, cellY: number, roomIdx: number) => void,
  ) {
    for (let i = 0; i < ROOM_SIZE * ROOM_SIZE; i++) {
      const x = (i % ROOM_SIZE) + roomX;
      const y = Math.floor(i / ROOM_SIZE) + roomY;
      callback(x, y, i);
    }
  }

  placeRooms() {
    const roomsPerRow = LAYOUT_SIZE / ROOM_SIZE;
    for (let i = 0; i < roomsPerRow ** 2; i++) {
      const room = i % 3 === 0 ? roomsRegistry.treasure1 : roomsRegistry.square;
      const x = i % roomsPerRow;
      const y = Math.floor(i / roomsPerRow);
      this.roomSpaceCells(
        x * ROOM_SIZE,
        y * ROOM_SIZE,
        (cellX, cellY, roomIdx) => {
          this.updateCell(cellX, cellY, room.layout[roomIdx]);
        },
      );
    }
  }

  printCells() {
    console.log(
      "      " +
        Array.from({ length: LAYOUT_SIZE })
          .map((_, i) => `x${i}`.padEnd(2))
          .join(" "),
    );
    for (let i = 0; i < this.cells.length; i += LAYOUT_SIZE) {
      console.log(
        `y${i / 10}`.padEnd(5),
        this.cells
          .slice(i, i + LAYOUT_SIZE)
          .map((v) => `${v}`.padEnd(2))
          .join(" "),
      );
    }
  }
}

class Game {
  layout: Layout;
  hero: Hero;

  constructor() {
    this.layout = new Layout();
    this.hero = new Hero(0, 0);
  }
}

const ASPECT_RATIO = 1920 / 1080;
export class KillTheEvil {
  game: Game;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  hero: THREE.Mesh;
  enemies: THREE.Mesh[] = [];
  controls!: BasicCharacterController;
  previousRaf: number | null = null;

  constructor() {
    const width = window.innerWidth;
    const height = width / ASPECT_RATIO;
    const canvas = document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;
    document.body.appendChild(canvas);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 1000.0;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    // this.camera.position.set(0, 100, 0);
    this.camera.position.set(-50, 100, 0);

    this.scene = new THREE.Scene();

    const controls = new OrbitControls(this.camera, canvas);
    controls.target.set(0, 0, 0);
    controls.update();

    const hero = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshPhongMaterial({
        color: 0x808080,
      }),
    );

    const light = new THREE.HemisphereLight(0xffffff, 0x123456, 1.0);
    this.scene.add(light);

    hero.position.set(FLOOR_SIZE / -2, 0.5, FLOOR_SIZE / -2);
    hero.castShadow = true;
    hero.receiveShadow = true;
    this.scene.add(hero);
    this.hero = hero;

    this.game = new Game();

    this.renderMap();

    this.initControls();
    this.raf();
  }

  renderMap() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE, 1, 1),
      new THREE.MeshPhongMaterial({ color: 0xff00ff }),
    );
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    // render horizontal planes
    let walls: [number, number][][] = [];
    const wallCount = LAYOUT_SIZE / ROOM_SIZE + 1;
    for (let i = 0; i < wallCount; i++) {
      walls.push([]);
      let wallStart = 0;
      let wallLen = 0;
      for (let j = 0; j < LAYOUT_SIZE; j++) {
        const cellIdx =
          i === wallCount - 1
            ? this.game.layout.cells.length - LAYOUT_SIZE + j
            : i * LAYOUT_SIZE * ROOM_SIZE + j + 1;
        if (this.game.layout.cells[cellIdx] !== W) {
          if (wallLen > 0) {
            walls[i].push([wallStart, wallLen]);
            wallLen = 0;
          }
          wallStart = j + 1;
          continue;
        }
        wallLen += 1;
      }

      if (wallLen > 0) {
        walls[i].push([wallStart, wallLen]);
      }
    }

    for (let i = 0; i < walls.length; i++) {
      for (let j = 0; j < walls[i].length; j++) {
        let [offsetLeft, width] = walls[i][j];
        width *= CELL_RATIO;
        const wall = new THREE.Mesh(
          new THREE.PlaneGeometry(width, WALL_HEIGHT, 1, 1),
          new THREE.MeshStandardMaterial({
            color: 0xcc5500,
            side: THREE.DoubleSide,
          }),
        );
        wall.position.y = WALL_HEIGHT / 2;
        wall.position.z = FLOOR_SIZE / -2 + ROOM_SIZE * CELL_RATIO * i;
        wall.position.x = (FLOOR_SIZE - width) / -2 + offsetLeft * CELL_RATIO;
        this.scene.add(wall);
      }
    }

    walls = [];
    for (let i = 0; i < wallCount; i++) {
      walls.push([]);
      let wallStart = 0;
      let wallLen = 0;
      for (let j = 0; j < LAYOUT_SIZE; j++) {
        const cellIdx = i * ROOM_SIZE + j * LAYOUT_SIZE;
        if (this.game.layout.cells[cellIdx] !== W) {
          if (wallLen > 0) {
            walls[i].push([wallStart, wallLen]);
            wallLen = 0;
          }
          wallStart = j + 1;
          continue;
        }
        wallLen += 1;
      }

      if (wallLen > 0) {
        walls[i].push([wallStart, wallLen]);
      }
    }

    for (let i = 0; i < walls.length; i++) {
      for (let j = 0; j < walls[i].length; j++) {
        let [offsetLeft, width] = walls[i][j];
        width *= CELL_RATIO;
        const wall = new THREE.Mesh(
          new THREE.PlaneGeometry(width, WALL_HEIGHT, 1, 1),
          new THREE.MeshStandardMaterial({
            color: 0xcc5500,
            side: THREE.DoubleSide,
          }),
        );
        wall.position.y = WALL_HEIGHT / 2;
        wall.rotation.y = -Math.PI / 2;
        wall.position.x = FLOOR_SIZE / -2 + ROOM_SIZE * i * CELL_RATIO;
        wall.position.z = (FLOOR_SIZE - width) / -2 + offsetLeft * CELL_RATIO;
        this.scene.add(wall);
      }
    }
  }

  initControls() {
    this.controls = new BasicCharacterController(this.scene);
  }

  step(timeElapsedMS: number) {
    const timeElapsedS = timeElapsedMS / 1000;
    if (this.controls) {
      this.controls.update(timeElapsedS);
    }
  }

  raf() {
    requestAnimationFrame((t: number) => {
      if (this.previousRaf === null) {
        this.previousRaf = t;
      }
      this.raf();
      this.renderer.render(this.scene, this.camera);
      this.step(t - this.previousRaf);
      this.previousRaf = t;
    });
  }
}

new KillTheEvil();
