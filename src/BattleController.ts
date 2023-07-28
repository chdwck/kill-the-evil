import AssetManager from "./AssetManager";
import { type LayoutCell, Room, H } from "./RoomManager";

export default class BattleController {
  room: Room;
  battleField: LayoutCell[] = [];
  assetManager: AssetManager;

  constructor(room: Room, assetManager: AssetManager) {
    this.room = room;
    this.assetManager = assetManager;
  }

  loadBattleField() {
    this.battleField = [...this.room.layout];
    const onLoad = (hero: THREE.Group) => {
      const relativeHeroPosition = hero.position.sub(this.room.position);
      const [x, y, heroBattleFieldIdx] = this.room.positionToLayoutPosition(relativeHeroPosition)
      this.battleField[heroBattleFieldIdx] = H;
      this.room.setupBattleField();
      const adjustedHeroPosition = this.room.layoutPositionToPosition(x, y);
      hero.position.set(adjustedHeroPosition.x, 0, adjustedHeroPosition.y);
    };
    const hero = this.assetManager.getHero();
    if (hero) {
      onLoad(hero)
    } else {
      this.assetManager.loadHero(onLoad);
    }
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
}
