import * as THREE from "three";
import { _, W, Vec2 } from "./2d";
import {
  EntityState,
  GameEntity,
  createSkeleton,
  loadThreeObj,
  registerEntity,
} from "./entities";

export const WALL_HEIGHT = 5;
export const CELL_SIZE = 2;
export type Room = {
  id: string;
  position: THREE.Vector3;
  layout: string[][];
  enemies: GameEntity[];
};

export function createEntryRoom(
  entityState: EntityState,
  position: THREE.Vector3,
): Room {
  const skele1 = registerEntity(entityState, createSkeleton("entry1"));
  const skele2 = registerEntity(entityState, createSkeleton("entry2"));

  const s1 = skele1.id;
  const s2 = skele2.id;

  // prettier-ignore
  const layout = [
    [W,W,W,W,W,W,W,W,W,W],
    [W,_,_,_,_,_,_,_,_,W],
    [W,_,_,_,_,_,_,_,_,W],
    [W,_,_,_,_,_,_,_,_,W],
    [W,_,_,_,_,_,_,_,_,W],
    [W,_,_,_,_,_,_,_,_,W],
    [W,_,_,_,_,_,_,_,_,W],
    [W,_,_,_,_,_,_,_,_,W],
    [W,_,s1,_,_,_,s2,_,_,W],
    [W,W,_,_,W,W,_,_,W,W],
  ]

  return {
    id: "entryRoom",
    position,
    enemies: [skele1, skele2],
    layout,
  };
}

export function updateCell(room: Room, pos: Vec2, cell: string = _) {
  const [x, y] = pos;
  room.layout[y][x] = cell;
}

export function getCellXY(room: Room, cell: string): Vec2 {
  for (let y = 0; y < room.layout.length; y++) {
    for (let x = 0; x < room.layout[0].length; x++) {
      if (room.layout[y][x] === cell) {
        return [x, y];
      }
    }
  }

  throw new Error("Couldnt find entity in room.");
}

export function renderRoom(
  scene: THREE.Scene,
  entityState: EntityState,
  room: Room,
) {
  const width = room.layout[0].length;
  const height = room.layout.length;
  const floorWidth = width * CELL_SIZE;
  const floorHeight = width * CELL_SIZE;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(floorWidth, floorHeight, 1, 1),
    new THREE.MeshPhongMaterial({ color: 0x0000ff }),
  );

  floor.name = room.id;
  floor.rotation.x = -Math.PI / 2;
  floor.position.copy(room.position);

  scene.add(floor);

  for (let i = 0; i < room.enemies.length; i++) {
    const enemy = room.enemies[i];
    const pos = getCellXY(room, enemy.id);
    loadThreeObj(scene, entityState, enemy).then((obj) => {
      obj.position.copy(xYToWorld(room, pos));
    });
  }

  // top wall
  renderWall(room, 0, 0, 1, 0, width, (wall, wallStart, wallLen) => {
    wall.rotation.x = Math.PI / 2;
    wall.position.z = WALL_HEIGHT / 2;
    wall.position.y = floorHeight / 2;
    wall.position.x = (floorWidth - wallLen) / -2 + wallStart;
    floor.add(wall);
  });

  // bottom wall
  renderWall(room, 0, height - 1, 1, 0, width, (wall, wallStart, wallLen) => {
    wall.rotation.x = Math.PI / -2;
    wall.position.z = WALL_HEIGHT / 2;
    wall.position.y = floorHeight / -2;
    console.log(wallStart, wallLen);
    wall.position.x = (floorWidth - wallLen) / -2 + wallStart;
    floor.add(wall);
  });

  //left wall
  renderWall(room, 0, 0, 0, 1, height, (wall, wallStart, wallLen) => {
    wall.rotation.x = Math.PI / -2;
    wall.rotation.y = Math.PI / 2;
    wall.position.z = WALL_HEIGHT / 2;
    wall.position.y = (floorHeight - wallLen) / -2 + wallStart;
    wall.position.x = floorWidth / -2;
    floor.add(wall);
  });

  // right wall
  renderWall(room, width - 1, 0, 0, 1, height, (wall, wallStart, wallLen) => {
    wall.rotation.x = Math.PI / -2;
    wall.rotation.y = Math.PI / -2;
    wall.position.z = WALL_HEIGHT / 2;
    wall.position.x = floorWidth / 2;
    wall.position.y = (floorHeight - wallLen) / -2 + wallStart;
    floor.add(wall);
  });
}

function renderWall(
  room: Room,
  xStart: number,
  yStart: number,
  xInc: number,
  yInc: number,
  max: number,
  renderFn: (wall: THREE.Mesh, wallStart: number, wallLen: number) => void,
) {
  let walls = [];
  let wallStart = 0;
  let wallLen = 0;

  let j = 0;
  for (let i = 0; i < max; i++) {
    const x = xStart + i * xInc;
    const y = yStart + i * yInc;
    if (room.layout[y][x] !== W) {
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
    _wallLen *= CELL_SIZE;
    _wallStart *= CELL_SIZE;
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(_wallLen, WALL_HEIGHT),
      new THREE.MeshPhongMaterial({ color: 0x666666 }),
    );
    renderFn(wall, _wallStart, _wallLen);
  }
}

export function worldToXY(room: Room, position: THREE.Vector3): Vec2 {
  const width = room.layout[0].length;
  const height = room.layout.length;
  const layoutX = Math.floor(position.x + width / 2);
  const layoutY = Math.floor(position.z + height / 2);
  return [layoutX, layoutY];
}

export function xYToWorld(room: Room, position: Vec2): THREE.Vector3 {
  let [x, y] = position;
  const width = room.layout[0].length * CELL_SIZE - CELL_SIZE;
  const height = room.layout.length * CELL_SIZE - CELL_SIZE;
  x *= CELL_SIZE;
  y *= CELL_SIZE;
  return new THREE.Vector3(width / -2 + x, 0, height / -2 + y);
}

export function getWorldDimensions(room: Room): Vec2 {
  return [room.layout[0].length * CELL_SIZE, room.layout.length * CELL_SIZE];
}

function battleCellName(pos: Vec2): string {
  const [x, y] = pos;
  return `bCell_${x}${y}`;
}

const cellColors = {
  pCursor: new THREE.Color(0xff00ff),
  nCursor: new THREE.Color(0xff0000),
  selectedGreen: new THREE.Color(0x1fff0f),
};

export type CellColorKey = keyof typeof cellColors;

export function renderBattlefield(scene: THREE.Scene, room: Room) {
  const floor = scene.getObjectByName(room.id);
  if (!floor) {
    console.error("Missing floor");
    return;
  }
  const lineMaterial = new THREE.LineBasicMaterial({
    color: cellColors.selectedGreen,
  });
  const width = room.layout[0].length;
  const height = room.layout.length;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const box = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, 0.1);

      const boxMaterial = new THREE.MeshBasicMaterial({
        color: cellColors.selectedGreen,
        transparent: true,
        opacity: 0,
      });

      const edge = new THREE.EdgesGeometry(box);
      const boxMesh = new THREE.Mesh(box, boxMaterial);
      const cell = new THREE.LineSegments(edge, lineMaterial);
      const pos = xYToWorld(room, [x, y]);
      cell.position.set(pos.x, -pos.z, 0.1); // invert y and z because is relative to rotated floor
      cell.name = battleCellName([x, y]);
      cell.add(boxMesh);
      floor.add(cell);
    }
  }
}

export function updateCellFill(
  scene: THREE.Scene,
  pos: Vec2,
  enable: boolean,
  color: CellColorKey = "selectedGreen",
) {
  const cell = scene.getObjectByName(battleCellName(pos));
  if (!cell) {
    return;
  }

  const material = (cell.children[0] as THREE.Mesh)
    .material as THREE.MeshBasicMaterial;

  material.opacity = enable ? 1 : 0;
  material.color = cellColors[color];
}

export function clearAllCellFills(scene: THREE.Scene, room: Room) {
  const width = room.layout[0].length;
  const height = room.layout.length;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      updateCellFill(scene, [x, y], false);
    }
  }
}

export function teardownBattlefield(scene: THREE.Scene, room: Room) {
  const floor = scene.getObjectByName(room.id);
  if (!floor) {
    console.error("Missing floor")
    return;
  }
  const width = room.layout[0].length;
  const height = room.layout.length;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const obj = floor.getObjectByName(battleCellName([x, y]));
      if (obj) {
        floor.remove(obj);
      }
    }
  }
}
