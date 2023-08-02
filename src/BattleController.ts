import * as THREE from "three";
import GameInput from "./GameInput";
import { Room, _ } from "./RoomManager";
import TacticsCamera from "./TacticsCamera";
import GameObjectStore, { Physicalilty } from "./GameObjectStore";

type DebouncerDatum = {
  ts: number;
  hits: number;
};
class Debouncer {
  data: Record<string, DebouncerDatum>;
  releaseAfterMs: number;

  constructor(releaseAfterMs: number) {
    this.releaseAfterMs = releaseAfterMs;
    this.data = {};
  }

  canExecute(key: string): boolean {
    const datum = this.data[key];
    const now = Date.now();
    if (datum === undefined) {
      this.data[key] = { ts: now, hits: 1 };
      return true;
    }
    const diff = now - datum.ts;
    if (diff >= (this.releaseAfterMs / datum.hits) * 15) {
      this.data[key].ts = now;
      this.data[key].hits = 1;
      return true;
    }

    this.data[key].hits += 1;

    return false;
  }
}

type Vec2 = [number, number];

function addVec2(base: Vec2, other: Vec2): Vec2 {
  return [base[0] + other[0], base[1] + other[1]];
}

function toIndex(pos: Vec2, width: number) {
  return (pos[1] * width) + (pos[0] % width)
}

class Move {
  threeObj: THREE.Group;
  onComplete: Function;
  onUpdate: (direction: THREE.Vector3) => void;

  private curvePoint: number = 0;
  private curve: THREE.CatmullRomCurve3;

  constructor(
    threeObj: THREE.Group,
    path: THREE.Vector3[],
    onUpdate: (direction: THREE.Vector3) => void,
    onComplete: Function,
  ) {
    this.threeObj = threeObj;
    this.onUpdate = onUpdate;
    this.onComplete = onComplete;
    this.curve = new THREE.CatmullRomCurve3(path);
  }

  update(increment: number) {
    increment = increment / this.curve.points.length;
    this.curvePoint = Math.min(increment + this.curvePoint, 1);
    const vector = this.curve.getPoint(this.curvePoint);
    this.onUpdate(vector);
    this.threeObj.position.copy(vector);
    if (this.curvePoint === 1) {
      this.onComplete();
    }
  }
}

export default class BattleController {
  room: Room;
  objectStore: GameObjectStore;
  selectedCell: [number, number];
  inputDebouncer: Debouncer;

  battleField: string[] = [];
  turnOrder: string[] = [];
  turnIdx: number = 0;
  acceptPlayerInput: boolean = false;
  // TODO: optimize with queue
  actions: Move[] = [];

  constructor(room: Room, objectStore: GameObjectStore) {
    this.room = room;
    this.objectStore = objectStore;
    this.selectedCell = [0, 0];
    this.inputDebouncer = new Debouncer(200);
  }

  getCombatantPos(id: string): Vec2 {
    const idx = this.battleField.findIndex((cell) => cell === id);
    if (idx < 0) {
      throw new Error(`${id} doesn't exist on the battlefield.`);
    }

    return [idx % this.room.width, Math.floor(idx / this.room.width)];
  }

  getIdAtPos(pos: Vec2): string {
    return this.battleField[toIndex(pos, this.room.width)];
  }

  loadBattleField() {
    this.battleField = [...this.room.layout];
    const hero = this.objectStore.getHero();
    const heroThreeObj = this.objectStore.getHeroThreeObj();
    const relativePos = heroThreeObj.position.sub(this.room.position);
    const [x, y, idx] = this.room.posToLayoutXY(relativePos);
    this.battleField[idx] = hero.id;
    const adjustedHeroPos = this.room.layoutXYToPosition(x, y);
    heroThreeObj.position.set(
      adjustedHeroPos.x,
      adjustedHeroPos.y,
      adjustedHeroPos.z,
    );

    const turnOrder = [hero.id];
    for (let i = 0; i < this.battleField.length; i++) {
      if (this.objectStore.isEnemy(this.battleField[i])) {
        turnOrder.push(this.battleField[i]);
      }
    }

    this.turnOrder = turnOrder;
    this.room.setupBattleField();
    this.battle();
  }

  moveCombatant(id: string, dest: THREE.Vector2) {
    const idx = this.battleField.findIndex((cell) => cell === id);
    const nextIdx = dest.y * this.room.width + dest.x;
    if (idx < 0 || nextIdx > this.battleField.length || nextIdx < 0) {
      return;
    }

    const obj = this.objectStore.getThreeObj(id);

    this.battleField[idx] = _;
    this.battleField[nextIdx] = id;

    const worldPosition = this.room.layoutXYToPosition(dest.x, dest.y);
    obj.position.copy(worldPosition);
  }

  battle() {
    const combatantId = this.turnOrder[this.turnIdx];
    const entity = this.objectStore.getGameObject(combatantId);

    if (entity.constructor.name === "Hero") {
      this.acceptPlayerInput = true;
      return;
    }

    const hero = this.objectStore.getHero();
    const heroThreeObj = this.objectStore.getHeroThreeObj();
    const entityXY = this.getCombatantPos(combatantId);
    const heroXY = this.getCombatantPos(hero.id);
    const entityThreeObj = this.objectStore.getThreeObj(combatantId);
    const path = this.getMovePath(entity.phys, entityXY, heroXY);
    const animationController =
      this.objectStore.getAnimationController(combatantId);
    const walkAction = animationController.animations["walk"].action;
    const idleAction = animationController.animations["idle"].action;
    walkAction.time = 0.0;
    walkAction.enabled = true;
    walkAction.setEffectiveTimeScale(1.0);
    walkAction.setEffectiveWeight(1.0);
    walkAction.crossFadeFrom(idleAction, 0.5, true);
    walkAction.play();
    const move = new Move(
      entityThreeObj,
      path.map((pos) => this.room.layoutXYToPosition(...pos)),
      (direction) => {
        entityThreeObj.lookAt(direction);
      },
      () => {
        const endPos = path[path.length - 1]
        const startIdx = toIndex(entityXY, this.room.width);
        const endIdx = toIndex(endPos, this.room.width); 
        this.battleField[startIdx] = _;
        this.battleField[endIdx] = combatantId;
        this.printBattleField();
        entityThreeObj.lookAt(heroThreeObj.position);
        idleAction.time = 0.0;
        idleAction.enabled = true;
        idleAction.setEffectiveTimeScale(1.0);
        idleAction.setEffectiveWeight(1.0);
        idleAction.crossFadeFrom(walkAction, 0.5, true);
        idleAction.play();
        this.actions.shift(); // TODO: use a queue
        this.turnIdx = (this.turnIdx + 1) % this.turnOrder.length;
        this.battle();
      },
    );
    this.actions.push(move);
  }

  getMovePath(phys: Physicalilty, from: Vec2, to: Vec2): Vec2[] {
    let path = [from];
    let stuck = false;
    let xDelta = 0;
    let yDelta = 0;
    let prev = path[path.length - 1];
    while (path.length <= phys.range && !stuck) {
      xDelta = Math.sign(to[0] - prev[0]);
      yDelta = Math.sign(to[1] - prev[1]);
      prev = path[path.length - 1];

      let tempDest = addVec2(prev, [xDelta, yDelta]);
      let id = this.getIdAtPos(tempDest);
      if (id === "_") {
        path.push(tempDest);
        continue;
      }

      tempDest = addVec2(prev, [0, yDelta]);
      id = this.getIdAtPos(tempDest);
      if (id === "_") {
        path.push(tempDest);
        continue;
      }

      tempDest = addVec2(prev, [xDelta, 0]);
      id = this.getIdAtPos(tempDest);
      if (id === "_") {
        path.push(tempDest);
        continue;
      }

      stuck = true;
    }

    return path;
  }

  setSelectedCell(x: number, y: number) {
    this.room.toggleCellHighlight(...this.selectedCell, false);
    x = x >= 0 ? (x < this.room.width ? x : this.room.width - 1) : 0;
    y = y >= 0 ? (y < this.room.height ? y : this.room.height - 1) : 0;
    this.selectedCell = [x, y];
    this.room.toggleCellHighlight(x, y, true);
  }

  printBattleField() {
    console.log(
      "      " +
        Array.from({ length: this.room.width })
          .map((_, i) => `x${i}`.padEnd(2))
          .join(" "),
    );
    for (let i = 0; i < this.battleField.length; i += this.room.width) {
      console.log(
        `y${i / 10}`.padEnd(5),
        this.battleField
          .slice(i, i + this.room.width)
          .map((v) => `${v}`.padEnd(2))
          .join(" "),
      );
    }
  }

  unloadBattleField() {
    this.battleField = [];
    this.room.teardownBattleField();
  }

  update(timeElapsedS: number, input: GameInput, camera: TacticsCamera) {
    this.objectStore.updateAll(timeElapsedS);
    if (this.acceptPlayerInput && input.keys.space) {
      this.acceptPlayerInput = false;
      this.moveCombatant(
        this.objectStore.getHero().id,
        new THREE.Vector2(...this.selectedCell),
      );
      this.turnIdx = (this.turnIdx + 1) % this.turnOrder.length;
      this.battle();
      return;
    }

    if (this.actions.length) {
      this.actions[0].update(timeElapsedS);
      return;
    }

    let delta = [0, 0];

    if (camera.deg.value >= 315 || camera.deg.value <= 45) {
      if (input.keys.forward) {
        delta[1] = 1;
      }
      if (input.keys.backward) {
        delta[1] = -1;
      }
      if (input.keys.left) {
        delta[0] = 1;
      }
      if (input.keys.right) {
        delta[0] = -1;
      }
    } else if (camera.deg.value > 45 && camera.deg.value <= 135) {
      if (input.keys.forward) {
        delta[0] = -1;
      }
      if (input.keys.backward) {
        delta[0] = 1;
      }
      if (input.keys.left) {
        delta[1] = 1;
      }
      if (input.keys.right) {
        delta[1] = -1;
      }
    } else if (camera.deg.value > 135 && camera.deg.value <= 225) {
      if (input.keys.forward) {
        delta[1] = -1;
      }
      if (input.keys.backward) {
        delta[1] = 1;
      }
      if (input.keys.left) {
        delta[0] = -1;
      }
      if (input.keys.right) {
        delta[0] = 1;
      }
    } else if (camera.deg.value > 225 && camera.deg.value <= 315) {
      if (input.keys.forward) {
        delta[0] = 1;
      }
      if (input.keys.backward) {
        delta[0] = -1;
      }
      if (input.keys.left) {
        delta[1] = -1;
      }
      if (input.keys.right) {
        delta[1] = 1;
      }
    }

    if (delta[0] < 0 && !this.inputDebouncer.canExecute("-x")) {
      delta[0] = 0;
    }

    if (delta[0] > 0 && !this.inputDebouncer.canExecute("+x")) {
      delta[0] = 0;
    }

    if (delta[1] < 0 && !this.inputDebouncer.canExecute("-y")) {
      delta[1] = 0;
    }

    if (delta[1] > 0 && !this.inputDebouncer.canExecute("+y")) {
      delta[1] = 0;
    }

    this.setSelectedCell(
      this.selectedCell[0] + delta[0],
      this.selectedCell[1] + delta[1],
    );
  }
}
