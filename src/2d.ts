import { type Room } from "./rooms";

export const W = "w"; // wall
export const _ = "_"; // Nothing

export type Vec2 = [number, number];

export function equalsVec2(base: Vec2, other: Vec2) {
  return base[0] === other[0] && base[1] === other[1];
}

export function addVec2(base: Vec2, other: Vec2): Vec2 {
  return [base[0] + other[0], base[1] + other[1]];
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

export function inRange(from: Vec2, to: Vec2, dist: number): boolean {
  const aSq = (from[0] - to[0]) ** 2;
  const bSq = (from[1] - to[1]) ** 2;
  return Math.sqrt(aSq + bSq) <= dist;
}

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
  pathMax: number = -1,
  minDistToTarget: number = 0,
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

  if (path.length === pathMax || inRange(curr, end, minDistToTarget)) {
    return true;
  }

  const dirIndices = getPrefferedDirectionIndices(curr, end);

  for (let i = 0; i < dirIndices.length; i++) {
    const next = addVec2(curr, dirs[dirIndices[i]]);
    const walkRes = walkPath(
      layout,
      start,
      next,
      end,
      seen,
      path,
      pathMax,
      minDistToTarget,
    );
    if (walkRes) {
      return true;
    }
  }

  path.pop();

  return false;
}

export function pathfind(
  room: Room,
  start: Vec2,
  end: Vec2,
  pathMax: number = -1,
  minDistToTarget: number = 0,
): Vec2[] {
  const seen: boolean[][] = [];
  for (let i = 0; i < room.layout.length; i++) {
    seen.push(
      Array.from({ length: room.layout[0].length }).fill(false) as boolean[],
    );
  }

  const path: Vec2[] = [];
  walkPath(
    room.layout,
    start,
    start,
    end,
    seen,
    path,
    pathMax,
    minDistToTarget,
  );
  return path;
}
