import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

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

const LAYOUT_SIZE = 50;

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

const CELL_RATIO = 10; 
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
          .map((c, i) => `x${i}`.padEnd(2))
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
    this.camera.position.set(0, 100, 0);
    // this.camera.position.set(15, 8, 0);

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

    hero.position.set(0, 0.5, 0);
    hero.castShadow = true;
    hero.receiveShadow = true;
    this.scene.add(hero);
    this.hero = hero;

    this.game = new Game();

    this.renderMap();

    this.raf();
    this.initControls();
  }

  renderMap() {
    const floorSize = LAYOUT_SIZE * CELL_RATIO;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(floorSize, floorSize, 1, 1),
      new THREE.MeshPhongMaterial({ color: 0xff00ff }),
    );
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    const wallHeight = 10;

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
        width *= CELL_RATIO
        const wall = new THREE.Mesh(
          new THREE.PlaneGeometry(width, wallHeight, 1, 1),
          new THREE.MeshStandardMaterial({
            color: 0xcc5500,
            side: THREE.DoubleSide,
          }),
        );
        wall.position.y = wallHeight / 2
        wall.position.z = floorSize / -2 + (ROOM_SIZE * CELL_RATIO * i);
        wall.position.x = (floorSize - width) / -2 + offsetLeft * CELL_RATIO
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
        width *= CELL_RATIO
        const wall = new THREE.Mesh(
          new THREE.PlaneGeometry(width, wallHeight, 1, 1),
          new THREE.MeshStandardMaterial({
            color: 0xcc5500,
            side: THREE.DoubleSide,
          }),
        );
        wall.position.y = wallHeight / 2;
        wall.rotation.y = -Math.PI / 2;
        wall.position.x = floorSize / -2 + ROOM_SIZE * i * CELL_RATIO;
        wall.position.z = (floorSize - width) / -2 + offsetLeft * CELL_RATIO;
        this.scene.add(wall);
      }
    }
  }

  initControls() {
    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp") {
        this.hero.position.setX(this.hero.position.x - 1);
      }
      if (e.key === "ArrowDown") {
        this.hero.position.setX(this.hero.position.x + 1);
      }
      if (e.key === "ArrowLeft") {
        this.hero.position.setZ(this.hero.position.z + 1);
      }
      if (e.key === "ArrowRight") {
        this.hero.position.setZ(this.hero.position.z - 1);
      }
      // this.camera.lookAt(this.hero.position)
    });
  }

  raf() {
    requestAnimationFrame(() => {
      this.renderer.render(this.scene, this.camera);
      this.raf();
    });
  }
}

new KillTheEvil();
