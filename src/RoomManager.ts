import * as THREE from "three";
import AssetManager from "./AssetManager";

const W = "w"; // wall
const _ = "_"; // Nothing
const E = "E"; // Enemy slot
export const H = "H"; // Hero
export type LayoutCell = typeof H | typeof E | typeof W | typeof _;

export const WALL_HEIGHT = 5;

export abstract class Room {
  position: THREE.Vector3;

  layout: LayoutCell[] = [];
  height: number = 0;
  width: number = 0;
  cellMultiplier: number = 1;
  floor: THREE.Mesh | null = null;
  battleFieldObjectNames: string[] = [];

  abstract render(scene: THREE.Scene, assetManager: AssetManager): void;

  get worldHeight() {
    return this.height * this.cellMultiplier;
  }

  get worldWidth() {
    return this.width * this.cellMultiplier;
  }

  constructor(position: THREE.Vector3) {
    this.position = position;
  }

  positionToLayoutPosition(position: THREE.Vector3): [number, number, number] {
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

  layoutPositionToPosition(x: number, y: number): THREE.Vector3 {
    return new THREE.Vector3(
      (this.worldWidth - this.cellMultiplier) / -2 + x * this.cellMultiplier,
      0,
      (this.cellMultiplier - this.worldHeight) / 2 + y * this.cellMultiplier,
    );
  }

  forCells(callback: (x: number, y: number, i: number) => void) {
    for (let i = 0; i < this.layout.length; i++) {
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
      const pos = this.layoutPositionToPosition(x, y);
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
      if (this.layout[i] !== W) {
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
  layout: LayoutCell[] = [
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

  renderEnemies(scene: THREE.Scene, assetManager: AssetManager) {
    this.forCells((x, y, i) => {
      if (this.layout[i] === E) {
        assetManager.loadSkeleton((name, fbx) => {
          scene.add(fbx);
          fbx.position.copy(this.position);
          const next = this.layoutPositionToPosition(x, y);
          fbx.position.add(new THREE.Vector3(next.x, next.y, next.z));
          // fbx.position.add(
          //   new THREE.Vector3(
          //     (xOffset + 0.5 - this.width / 2) * this.cellMultiplier,
          //     0,
          //     (yOffset + 0.5 - this.height / 2) * this.cellMultiplier,
          //   ),
          // );
        });
      }
    });
  }

  render(scene: THREE.Scene, assetManager: AssetManager) {
    this.renderFloorAndWalls(scene);
    this.renderEnemies(scene, assetManager);
  }
}

export abstract class RoomEvent {
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}

export class RoomEnteredEvent extends RoomEvent {
  static eventName = "RoomEntered";
  room: Room;
  constructor(room: Room) {
    super(RoomEnteredEvent.eventName);
    this.room = room;
  }
}

type RoomEventHandler = <TEvent extends RoomEvent>(event: TEvent) => void;
export default class RoomManager {
  scene: THREE.Scene;
  currentRoom: Room;
  assetManager: AssetManager;
  eventHandler: RoomEventHandler;

  constructor(
    scene: THREE.Scene,
    assetManager: AssetManager,
    eventHandler: RoomEventHandler,
  ) {
    this.scene = scene;
    this.assetManager = assetManager;
    this.eventHandler = eventHandler;
    this.currentRoom = new EntryRoom(new THREE.Vector3(0, 0, 0));
  }

  init() {
    this.currentRoom.render(this.scene, this.assetManager);
    this.eventHandler(new RoomEnteredEvent(this.currentRoom));
  }

  update() {
    const hero = this.assetManager.getHero();
    // console.log(hero?.position)
  }
}
