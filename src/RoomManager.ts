import * as THREE from "three";

const W = "w"; // wall
const E = "E"; // Enemy slot
export const _ = "_"; // Nothing
export const WALL_HEIGHT = 5;

export abstract class Room {
  position: THREE.Vector3;

  _layout: string[] = [];
  height: number = 0;
  width: number = 0;
  cellMultiplier: number = 1;
  floor: THREE.Mesh | null = null;
  battleFieldObjectNames: string[] = [];

  private isLayoutHydrated: boolean = false;

  constructor(position: THREE.Vector3) {
    this.position = position;
  }

  abstract render(scene: THREE.Scene): void;
  async hydrateLayout(
    enemyReplacer: (x: number, y: number, room: Room) => Promise<string>,
  ) {
    const promises = [];
    for (let i = 0; i < this._layout.length; i++) {
      if (this._layout[i] === E) {
        promises.push(
          new Promise((resolve) => {
            enemyReplacer(
              i % this.width,
              Math.floor(i / this.width),
              this,
            ).then((id) => {
              this._layout[i] = id;
              resolve(null);
            });
          }),
        );
      }
    }
    await Promise.all(promises)
    this.isLayoutHydrated = true;
  }

  get layout(): string[] {
    if (!this.isLayoutHydrated) {
      throw new Error("Layout must be hyrdated before use.");
    }

    return this._layout;
  }

  get worldHeight() {
    return this.height * this.cellMultiplier;
  }

  get worldWidth() {
    return this.width * this.cellMultiplier;
  }

  posToLayoutXY(position: THREE.Vector3): [number, number, number] {
    const layoutX = Math.floor(
      (position.x + this.worldWidth / 2) / this.cellMultiplier,
    );
    const layoutY = Math.floor(
      (position.z + this.worldHeight / 2) / this.cellMultiplier,
    );

    const layoutIdx = layoutY * this.width + layoutX;
    if (
      layoutY < 0 ||
      layoutX < 0 ||
      layoutY >= this.height ||
      layoutX >= this.width
    ) {
      return [0, 0, 0];
    }
    return [layoutX, layoutY, layoutIdx];
  }

  layoutXYToPosition(x: number, y: number): THREE.Vector3 {
    return new THREE.Vector3(
      (this.worldWidth - this.cellMultiplier) / -2 + x * this.cellMultiplier,
      0,
      (this.cellMultiplier - this.worldHeight) / 2 + y * this.cellMultiplier,
    );
  }

  forCells(callback: (x: number, y: number, i: number) => void) {
    for (let i = 0; i < this._layout.length; i++) {
      const x = i % this.width;
      const y = Math.floor(i / this.width);
      callback(x, y, i);
    }
  }

  battleFieldCellName(x: number, y: number) {
    return `bCell_${x}${y}`;
  }

  setupBattleField() {
    if (this.floor === null) {
      throw new Error(
        "setupBattleField must be called after renderFloorAndWalls",
      );
    }
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x1fff0f,
    });
    this.forCells((x, y) => {
      const box = new THREE.BoxGeometry(
        this.cellMultiplier,
        this.cellMultiplier,
        0.1,
      );

      const boxMaterial = new THREE.MeshBasicMaterial({
        color: 0x1fff0f,
        transparent: true,
        opacity: 0,
      });

      const edge = new THREE.EdgesGeometry(box);
      const boxMesh = new THREE.Mesh(box, boxMaterial);
      const cell = new THREE.LineSegments(edge, lineMaterial);
      const pos = this.layoutXYToPosition(x, y);
      cell.position.set(pos.x, -pos.z, 0.1); // invert y and z because is relative to rotated floor
      const name = this.battleFieldCellName(x, y);
      this.battleFieldObjectNames.push(name);
      cell.name = name;
      cell.add(boxMesh);
      this.floor!.add(cell);
    });
  }

  toggleCellHighlight(x: number, y: number, enable: boolean) {
    let cell = this.floor?.getObjectByName(this.battleFieldCellName(x, y));
    if (cell) {
      (
        (cell.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial
      ).opacity = enable ? 1 : 0;
    }
  }

  teardownBattleField() {
    this.forCells((x, y) => {
      const obj = this.floor?.getObjectByName(this.battleFieldCellName(x, y));
      if (obj) {
        this.floor?.remove(obj);
      }
    });
  }

  private renderWall(
    start: number,
    max: number,
    increment: number,
    fn: (wall: THREE.Mesh, wallStart: number, wallLen: number) => void,
  ) {
    if (this.floor === null) {
      throw new Error("renderWall must be called after renderFloorAndWalls");
    }
    let walls: [number, number][] = [];
    let wallStart = 0;
    let wallLen = 0;

    let j = 0;
    for (let i = start; i < max; i += increment) {
      if (this._layout[i] !== W) {
        if (wallLen > 0) {
          walls.push([wallStart, wallLen]);
        }
        wallLen = 0;
        wallStart = j + 1;
      } else {
        wallLen += 1;
      }
      j++;
    }

    if (wallLen > 0) {
      walls.push([wallStart, wallLen]);
    }

    for (let i = 0; i < walls.length; i++) {
      let [_wallStart, _wallLen] = walls[i];
      _wallLen *= this.cellMultiplier;
      _wallStart *= this.cellMultiplier;
      const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(_wallLen, WALL_HEIGHT),
        new THREE.MeshPhongMaterial({ color: 0x666666 }),
      );
      fn(wall, _wallStart, _wallLen);
      this.floor.add(wall);
    }
  }

  renderFloorAndWalls(scene: THREE.Scene) {
    const floorWidth = this.width * this.cellMultiplier;
    const floorHeight = this.height * this.cellMultiplier;
    // walls
    this.floor = new THREE.Mesh(
      new THREE.PlaneGeometry(floorWidth, floorHeight, 1, 1),
      new THREE.MeshPhongMaterial({ color: 0x000055 }),
    );

    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.copy(this.position);

    scene.add(this.floor);

    // top wall
    this.renderWall(0, this.width, 1, (wall, wallStart, wallLen) => {
      wall.rotation.x = Math.PI / 2;
      wall.position.z = WALL_HEIGHT / 2;
      wall.position.y = floorHeight / 2;
      wall.position.x = (floorWidth - wallLen) / -2 + wallStart;
    });

    // bottom wall
    let start = this.width * (this.height - 1);
    this.renderWall(
      start,
      start + this.width,
      1,
      (wall, wallStart, wallLen) => {
        wall.rotation.x = Math.PI / -2;
        wall.position.z = WALL_HEIGHT / 2;
        wall.position.y = floorHeight / -2;
        wall.position.x = (floorWidth - wallLen) / -2 + wallStart;
      },
    );

    //left wall
    this.renderWall(
      0,
      this.width * (this.height - 1) + 1,
      this.width,
      (wall, wallStart, wallLen) => {
        wall.rotation.x = Math.PI / -2;
        wall.rotation.y = Math.PI / 2;
        wall.position.z = WALL_HEIGHT / 2;
        wall.position.y = (floorHeight - wallLen) / -2 + wallStart;
        wall.position.x = floorWidth / -2;
      },
    );

    // right wall
    start = this.width - 1;
    this.renderWall(
      start,
      this.height * this.width,
      this.width,
      (wall, wallStart, wallLen) => {
        wall.rotation.x = Math.PI / -2;
        wall.rotation.y = Math.PI / -2;
        wall.position.z = WALL_HEIGHT / 2;
        wall.position.x = floorWidth / 2;
        wall.position.y = (floorHeight - wallLen) / -2 + wallStart;
      },
    );
  }
}

class EntryRoom extends Room {
  height: number = 10;
  width: number = 10;
  cellMultiplier: number = 2;

  // prettier-ignore
  _layout: string[] = [
    W,W,W,W,W,W,W,W,W,W,
    W,_,_,_,_,_,_,_,_,W,
    W,_,E,_,_,_,_,E,_,W,
    W,_,_,_,_,_,_,_,_,W,
    W,_,_,_,_,E,_,_,_,W,
    W,_,_,_,_,_,_,_,_,W,
    W,_,_,_,_,_,_,_,_,W,
    W,_,_,_,_,_,_,_,_,W,
    W,_,_,E,_,E,E,_,_,W,
    W,W,W,W,_,_,W,W,W,W,
  ];

  constructor(position: THREE.Vector3) {
    super(position);
  }

  render(scene: THREE.Scene) {
    this.renderFloorAndWalls(scene);
  }
}

export abstract class RoomEvent {
  name: string;
  room: Room;

  constructor(name: string, room: Room) {
    this.name = name;
    this.room = room;
  }
}

export class RoomRenderedEvent extends RoomEvent {
  static eventName = "RoomRenderedEvent";
  constructor(room: Room) {
    super(RoomRenderedEvent.eventName, room);
  }
}

type RoomEventHandler = <TEvent extends RoomEvent>(event: TEvent) => void;
export default class RoomManager {
  scene: THREE.Scene;
  currentRoom: Room;
  eventHandler: RoomEventHandler;

  constructor(scene: THREE.Scene, eventHandler: RoomEventHandler) {
    this.scene = scene;
    this.eventHandler = eventHandler;
    this.currentRoom = new EntryRoom(new THREE.Vector3(0, 0, 0));
  }

  init() {
    this.currentRoom.render(this.scene);
    this.eventHandler(new RoomRenderedEvent(this.currentRoom));
  }
}
