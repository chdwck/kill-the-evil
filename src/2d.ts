import { GameEntity } from "./entities";
import { Room, getCellXY } from "./rooms";

export const E = "E"; // Enemy slot
export const W = "w"; // wall
export const _ = "_"; // Nothing

export type Vec2 = [number, number];

export function equalsVec2(base: Vec2, other: Vec2) {
  return base[0] === other[0] && base[1] === other[1];
}

export function addVec2(base: Vec2, other: Vec2): Vec2 {
  return [base[0] + other[0], base[1] + other[1]];
}

export function fromIndex(idx: number, width: number): Vec2 {
  return [Math.floor(idx / width), idx % width];
}

export function toIndex(pos: Vec2, width: number) {
  return pos[1] * width + (pos[0] % width);
}

function stepTowards(start: Vec2, end: Vec2): Vec2 {
  return [Math.sign(end[0] - start[0]), Math.sign(end[1] - start[1])];
}

const dirs: Vec2[] = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

function getPrefferedDirectionIndices(start: Vec2, end: Vec2): number[] {
  const delta = stepTowards(start, end);
  let i = 0;
  for (; i < dirs.length; i++) {
    if (equalsVec2(delta, dirs[i])) {
      break;
    }
  }

  const result = [i];
  for (let j = 0; j < dirs.length; j++) {
    let mod = j % 2 === 0 ? -1 : 1;
    let dirIdx = i + mod * j;
    if (dirIdx > dirs.length - 1) {
      dirIdx %= dirs.length;
    } else if (dirIdx < 0) {
      dirIdx = dirs.length + dirIdx;
    }
    result.push(dirIdx);
  }

  return result;
}

function walkPath(
  layout: string[][],
  start: Vec2,
  curr: Vec2,
  end: Vec2,
  seen: boolean[][],
  path: Vec2[],
  range: number,
): boolean {
  let [x, y] = curr;
  if (x < 0 || x >= layout[0].length || y < 0 || y >= layout.length) {
    return false;
  }

  if (layout[y][x] !== W && layout[y][x] !== _ && !equalsVec2(curr, start)) {
    return false;
  }

  if (equalsVec2(curr, end)) {
    path.push(curr);
    return true;
  }

  if (seen[y][x]) {
    return false;
  }

  seen[y][x] = true;
  path.push(curr);

  if (path.length === range) {
    return true;
  }

  const dirIndices = getPrefferedDirectionIndices(curr, end);

  for (let i = 0; i < dirIndices.length; i++) {
    const next = addVec2(curr, dirs[dirIndices[i]]);
    const walkRes = walkPath(layout, start, next, end, seen, path, range);
    if (walkRes) {
      return true;
    }
  }

  path.pop();

  return false;
}

export function pathfind(room: Room, entity: GameEntity, end: Vec2): Vec2[] {
  const seen: boolean[][] = [];
  for (let i = 0; i < room.layout.length; i++) {
    seen.push(
      Array.from({ length: room.layout[0].length }).fill(false) as boolean[],
    );
  }

  const path: Vec2[] = [];
  const start = getCellXY(room, entity.id);

  walkPath(room.layout, start, start, end, seen, path, entity.moveRange);
  return path;
}
