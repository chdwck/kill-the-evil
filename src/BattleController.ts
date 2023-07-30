import * as THREE from "three";
import GameInput from "./GameInput";
import AssetManager from "./AssetManager";
import { type LayoutCell, Room, H } from "./RoomManager";
import TacticsCamera from "./TacticsCamera";

type DebouncerDatum = {
  ts: number;
  hits: number;
}
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
    if (diff >= this.releaseAfterMs / datum.hits * 15) {
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
  battleField: LayoutCell[] = [];
  assetManager: AssetManager;
  selectedCell: [number, number];
  inputDebouncer: Debouncer;
  deceleration: THREE.Vector2;
  acceleration: THREE.Vector2;
  velocity: THREE.Vector2;

  constructor(room: Room, assetManager: AssetManager) {
    this.room = room;
    this.assetManager = assetManager;
    this.selectedCell = [0, 0];
    this.inputDebouncer = new Debouncer(200);

    this.acceleration = new THREE.Vector2(2.0, 2.0);
    this.deceleration = new THREE.Vector2(-1.0, -1.0);
    this.velocity = new THREE.Vector2(0, 0);
  }

  loadBattleField() {
    this.battleField = [...this.room.layout];
    const onLoad = (hero: THREE.Group) => {
      const relativeHeroPosition = hero.position.sub(this.room.position);
      const [x, y, heroBattleFieldIdx] =
        this.room.positionToLayoutPosition(relativeHeroPosition);
      this.battleField[heroBattleFieldIdx] = H;
      this.room.setupBattleField();
      const adjustedHeroPosition = this.room.layoutPositionToPosition(x, y);
      hero.position.set(
        adjustedHeroPosition.x,
        adjustedHeroPosition.y,
        adjustedHeroPosition.z,
      );
      this.setSelectedCell(x, y);
    };
    const hero = this.assetManager.getHero();
    if (hero) {
      onLoad(hero);
    } else {
      this.assetManager.loadHero(onLoad);
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
