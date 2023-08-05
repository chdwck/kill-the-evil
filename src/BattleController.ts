import * as THREE from "three";
import { readKey } from "./GameInput";
import { Room } from "./RoomManager";
import TacticsCamera from "./TacticsCamera";
import { Vec2, toIndex, addVec2, fromIndex, pathfind, _, equalsVec2 } from "./2d";
import { GameEntity, getAnimationController, getEntity, getThreeObj, heroId, updateAllAnimations } from "./entities";
import { checkDebouncerCache, createDebouncerCache } from "./debouncer";

class Move {
  threeObj: THREE.Group;
  onComplete: Function;

  private curvePoint: number = 0;
  private curve: THREE.CatmullRomCurve3;

  constructor(
    threeObj: THREE.Group,
    path: THREE.Vector3[],
    onComplete: Function,
  ) {
    this.threeObj = threeObj;
    this.onComplete = onComplete;
    this.curve = new THREE.CatmullRomCurve3(path);
  }

  update(increment: number) {
    increment = increment / this.curve.points.length;
    this.curvePoint = Math.min(increment + this.curvePoint, 1);
    const vector = this.curve.getPoint(this.curvePoint);
    this.threeObj.lookAt(vector);
    this.threeObj.position.copy(vector);
    if (this.curvePoint === 1) {
      this.onComplete();
    }
  }
}

const inputDebouncerCache = createDebouncerCache(200);

export default class BattleController {
  room: Room;
  selectedCell: Vec2;

  battleField: string[] = [];
  turnOrder: string[] = [];
  turnIdx: number = 0;
  acceptPlayerInput: boolean = false;
  // TODO: optimize with queue
  actions: Move[] = [];
  path: Vec2[] = [];
  scene: THREE.Scene;

  constructor(room: Room, scene: THREE.Scene) {
    this.room = room;
    this.scene = scene;
    this.selectedCell = [0, 0];
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
    const heroThreeObj = getThreeObj(this.scene, heroId)!;
    const relativePos = heroThreeObj.position.sub(this.room.position);
    const [x, y, idx] = this.room.posToLayoutXY(relativePos);
    this.battleField[idx] = heroId;
    const adjustedHeroPos = this.room.layoutXYToPosition(x, y);
    heroThreeObj.position.set(
      adjustedHeroPos.x,
      adjustedHeroPos.y,
      adjustedHeroPos.z,
    );

    const turnOrder = [heroId];
    for (let i = 0; i < this.battleField.length; i++) {
      if (getEntity(this.battleField[i])?.isEnemy) {
        turnOrder.push(this.battleField[i]);
      }
    }

    this.turnOrder = turnOrder;
    this.room.setupBattleField();
    this.battle();
  }

  addMoveBattleAction(id: string, dest: Vec2) {
    const entity = getEntity(id)!;
    const entityThreeObj = getThreeObj(this.scene, id)!;
    const entityXY = this.getCombatantPos(id);
    const path = this.getMovePath(entity, entityXY, dest);
    if (path.length <= 1) {
      this.turnIdx = (this.turnIdx + 1) % this.turnOrder.length;
      this.battle();
      return;
    }
    const animationController = getAnimationController(id)!;
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
      () => {
        const endPos = path[path.length - 1];
        const startIdx = toIndex(entityXY, this.room.width);
        const endIdx = toIndex(endPos, this.room.width);
        this.battleField[startIdx] = _;
        this.battleField[endIdx] = id;
        this.printBattleField();
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

  battle() {
    const combatantId = this.turnOrder[this.turnIdx];
    const entity = getEntity(combatantId)!;
    const heroXY = this.getCombatantPos(heroId);

    if (!entity.isEnemy) {
      this.acceptPlayerInput = true;
      this.setSelectedCell(heroXY);
      return;
    }

    this.addMoveBattleAction(combatantId, heroXY);
  }

  getMovePath(
    entity: GameEntity,
    from: Vec2,
    to: Vec2
  ): Vec2[] {
    return pathfind(
      this.battleField,
      this.room.width,
      from,
      to,
      entity.moveRange,
    );
  }

  clearAllCellHighlights() {
    for (let i = 0; i < this.battleField.length; i++) {
      this.room.toggleCellHighlight(...fromIndex(i, this.room.width), false);
    }
  }

  setSelectedCell(pos?: Vec2) {
    if (!pos) {
      this.selectedCell = [0, 0];
      this.clearAllCellHighlights();
      return;
    }

    let [x, y] = pos;

    if (x === this.selectedCell[0] && y === this.selectedCell[1]) {
      return;
    }
    this.clearAllCellHighlights();
    x = x >= 0 ? (x < this.room.width ? x : this.room.width - 1) : 0;
    y = y >= 0 ? (y < this.room.height ? y : this.room.height - 1) : 0;
    const heroXY = this.getCombatantPos(heroId);
    const hero = getEntity(heroId)!;
    const path = this.getMovePath(hero, heroXY, [x, y]);
    path.forEach((point) => {
      this.room.toggleCellHighlight(...point, true);
    });
    this.path = path;
    this.selectedCell = [x, y];
    const cellInPath = equalsVec2(this.path[this.path.length - 1], this.selectedCell);
    this.room.toggleCellHighlight(x, y, true, true, cellInPath);
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

  update(timeElapsedS: number, camera: TacticsCamera) {
    updateAllAnimations(timeElapsedS);

    if (!this.acceptPlayerInput) {
      this.setSelectedCell(undefined);
    }

    if (this.acceptPlayerInput && readKey("space")) {
      this.acceptPlayerInput = false;
      this.addMoveBattleAction(heroId, this.selectedCell);
      return;
    }

    if (this.actions.length) {
      this.actions[0].update(timeElapsedS);
      return;
    }

    let delta: Vec2 = [0, 0];

    if (camera.deg.value >= 315 || camera.deg.value <= 45) {
      if (readKey("forward")) {
        delta[1] = 1;
      }
      if (readKey("backward")) {
        delta[1] = -1;
      }
      if (readKey("left")) {
        delta[0] = 1;
      }
      if (readKey("right")) {
        delta[0] = -1;
      }
    } else if (camera.deg.value > 45 && camera.deg.value <= 135) {
      if (readKey("forward")) {
        delta[0] = -1;
      }
      if (readKey("backward")) {
        delta[0] = 1;
      }
      if (readKey("left")) {
        delta[1] = 1;
      }
      if (readKey("right")) {
        delta[1] = -1;
      }
    } else if (camera.deg.value > 135 && camera.deg.value <= 225) {
      if (readKey("forward")) {
        delta[1] = -1;
      }
      if (readKey("backward")) {
        delta[1] = 1;
      }
      if (readKey("left")) {
        delta[0] = -1;
      }
      if (readKey("right")) {
        delta[0] = 1;
      }
    } else if (camera.deg.value > 225 && camera.deg.value <= 315) {
      if (readKey("forward")) {
        delta[0] = 1;
      }
      if (readKey("backward")) {
        delta[0] = -1;
      }
      if (readKey("left")) {
        delta[1] = -1;
      }
      if (readKey("right")) {
        delta[1] = 1;
      }
    }

    if (delta[0] < 0 && !checkDebouncerCache(inputDebouncerCache, "-x")) {
      delta[0] = 0;
    }

    if (delta[0] > 0 && !checkDebouncerCache(inputDebouncerCache, "+x")) {
      delta[0] = 0;
    }

    if (delta[1] < 0 && !checkDebouncerCache(inputDebouncerCache, "-y")) {
      delta[1] = 0;
    }

    if (delta[1] > 0 && !checkDebouncerCache(inputDebouncerCache, "+y")) {
      delta[1] = 0;
    }
    this.setSelectedCell(addVec2(this.selectedCell, delta));
  }
}
