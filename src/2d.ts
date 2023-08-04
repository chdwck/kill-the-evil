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

function stepTowards(start: Vec2, end: Vec2) : Vec2 {
  return [
    Math.sign(end[0] - start[0]),
    Math.sign(end[1] - start[1])
  ];
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

function getPrefferedDirectionIndices(start: Vec2, end: Vec2) : number[] {
  const delta = stepTowards(start, end);
  let i = 0;
  for (; i < dirs.length; i++) {
    if (equalsVec2(delta, dirs[i])) {
      break  
    }
  }

  const result = [i];
  for (let j = 0; j < dirs.length; j++) {
    let mod = j % 2 === 0 ? -1 : 1;
    let dirIdx = i + (mod * j);
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
  layout: string[],
  width: number,
  start: Vec2,
  curr: Vec2,
  end: Vec2,
  seen: Record<number, boolean>,
  path: Vec2[],
  range: number,
): boolean {
  let [x, y] = curr;
  if (x < 0 || x >= width || y < 0 || y >= layout.length / width) {
    return false;
  }

  const idx = toIndex(curr, width);
  if (layout[idx] !== W && layout[idx] !== _ && !equalsVec2(curr, start)) {
    return false;
  }

  if (x === end[0] && y === end[1]) {
    path.push(curr);
    return true;
  }

  if (seen[idx]) {
    return false;
  }

  seen[idx] = true;
  path.push(curr);

  if (path.length === range) {
    return true;
  }

  const dirIndices = getPrefferedDirectionIndices(
    curr,
    end 
  );

  for (let i = 0; i < dirIndices.length; i++) {
    const next = addVec2(curr, dirs[dirIndices[i]]);
    const walkRes = walkPath(
      layout,
      width,
      start,
      next,
      end,
      seen,
      path,
      range,
    );
    if (walkRes) {
      return true;
    }
  }

  path.pop();

  return false;
}

export function pathfind(
  layout: string[],
  width: number,
  start: Vec2,
  end: Vec2,
  range: number,
): Vec2[] {
  const seen: Record<number, boolean> = {};
  const path: Vec2[] = [];
  walkPath(layout, width, start, start, end, seen, path, range);
  return path;
}
