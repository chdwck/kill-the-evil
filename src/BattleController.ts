import * as THREE from "three";
import GameInput from "./GameInput";
import { Room, _ } from "./RoomManager";
import TacticsCamera from "./TacticsCamera";
import GameObjectStore from "./GameObjectStore";

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

export default class BattleController {
  room: Room;
  objectStore: GameObjectStore;
  selectedCell: [number, number];
  inputDebouncer: Debouncer;

  battleField: string[] = [];
  turnOrder: string[] = [];
  turnIdx: number = 0;
  acceptPlayerInput: boolean = false;

  constructor(room: Room, objectStore: GameObjectStore) {
    this.room = room;
    this.objectStore = objectStore;
    this.selectedCell = [0, 0];
    this.inputDebouncer = new Debouncer(200);
  }

  getCombatantPos(id: string): THREE.Vector2 {
    const idx = this.battleField.findIndex((cell) => cell === id);
    if (idx < 0) {
      throw new Error(`${id} doesn't exist on the battlefield.`);
    }

    return new THREE.Vector2(
      idx % this.room.width,
      Math.floor(idx / this.room.width),
    );
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
    console.log(turnOrder);
    this.room.setupBattleField();
    this.battle();
  }

  battle() {
    const combatantId = this.turnOrder[this.turnIdx];
    const entity = this.objectStore.getGameObject(combatantId);

    if (entity.constructor.name === "Hero") {
      this.acceptPlayerInput = true;
    } else if (entity.constructor.name === "Skeleton") {
      const hero = this.objectStore.getHero();
      const entity = this.objectStore.getGameObject(combatantId);
      const entityXY = this.getCombatantPos(combatantId);
      const heroXY = this.getCombatantPos(hero.id);
      const distToHero = Math.floor(entityXY.distanceTo(heroXY));
      if (distToHero <= entity.phys.range) {
        console.log("ATTACK");
      } else {
        let delta = new THREE.Vector2(
          -1 * Math.sign(entityXY.x - heroXY.x),
          -1 * Math.sign(entityXY.y - heroXY.y),
        );
        entityXY.add(delta);
        this.moveCombatant(combatantId, entityXY);
      }

      this.turnIdx = (this.turnIdx + 1) % this.turnOrder.length;
      setTimeout(() => this.battle(), 1000);
    }
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
    if (this.acceptPlayerInput && input.keys.space) {
      this.acceptPlayerInput = false;
      console.log("called")
      this.moveCombatant(
        this.objectStore.getHero().id,
        new THREE.Vector2(...this.selectedCell),
      );
      this.turnIdx = (this.turnIdx + 1) % this.turnOrder.length;
      setTimeout(() => this.battle(), 2000);
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
