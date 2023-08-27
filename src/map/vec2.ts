export type Vec2 = [number, number];

export function equalsVec2(base: Vec2, other: Vec2) {
    return base[0] === other[0] && base[1] === other[1];
}

export function addVec2(base: Vec2, other: Vec2): Vec2 {
    return [base[0] + other[0], base[1] + other[1]];
}

export function scaleVec2(base: Vec2, scale: number): Vec2 {
    return [base[0] * scale, base[1] * scale];
}

export function inverseVec2(base: Vec2): Vec2 {
    return [base[1], base[0]];
}

export function distance(start: Vec2, end: Vec2) {
    const aSq = (start[0] - end[0]) ** 2;
    const bSq = (start[1] - end[1]) ** 2;
    return Math.sqrt(aSq + bSq);
}

export function midpoint(start: Vec2, end: Vec2): Vec2 {
    const x = Math.floor((start[0] + end[0]) / 2);
    const y = Math.floor((start[1] + end[1]) / 2);
    return [x, y];
}

export function getDir(start: Vec2, end: Vec2): Vec2 {
    return [Math.sign(end[0] - start[0]), Math.sign(end[1] - start[1])];
}

export const directions: Vec2[] = [
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

export function getPrefferedDirections(start: Vec2, end: Vec2): Vec2[] {
    const delta = getDir(start, end);
    let i = 0;
    for (; i < directions.length; i++) {
        if (equalsVec2(delta, directions[i])) {
            break;
        }
    }

    const result = [];
    for (let j = 0; j < directions.length; j++) {
        const mod = j % 2 === 0 ? -1 : 1;
        let dirIdx = i + mod * Math.ceil(j / 2);
        if (dirIdx > directions.length - 1) {
            dirIdx %= directions.length;
        } else if (dirIdx < 0) {
            dirIdx = directions.length + dirIdx;
        }
        result.push(directions[dirIdx]);
    }

    return result;
}

export function interpolate(from: Vec2, to: Vec2, fraction: number): Vec2 {
    const [fromX, fromY] = from;
    const [toX, toY] = to;
    const nx = fromX + (toX - fromX) * fraction;
    const ny = fromY + (toY - fromY) * fraction;
    return [nx, ny];
}
