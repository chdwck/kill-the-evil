import { Vector3 } from "three";
import { CELL_SIZE } from "../rooms";
import { CellType, HALF_CELL, W, n } from "./constants";
import { Vec2, addVec2, directions, equalsVec2, getDir, midpoint } from "./vec2";
import { midpoint3 } from "./3d";

export type Grid = CellType[][];

type Dimensions = {
    height: number;
    width: number;
    width3: number;
    height3: number;
};

export function getDimensions(grid: Grid): Dimensions {
    const height = grid.length;
    const width = grid[0].length;
    const width3 = width * CELL_SIZE;
    const height3 = height * CELL_SIZE;
    return { height, width, width3, height3 };
}

export function xyToScenePos(grid: Grid, pos: Vec2): Vector3 {
    const dimensions = getDimensions(grid);
    const halfWidth3 = dimensions.width3 / 2;
    const halfHeight3 = dimensions.height3 / 2;
    const [x, y] = pos;

    return new Vector3(
        -halfWidth3 + x * CELL_SIZE + HALF_CELL,
        1,
        halfHeight3 - y * CELL_SIZE - HALF_CELL,
    );
}

export function isPosInGrid(grid: Grid, pos: Vec2) {
    const { width, height } = getDimensions(grid);
    const [x, y] = pos;
    return -1 < x && x < width && -1 < y && y < height;
}

export function scenePosToXy(grid: Grid, pos: Vector3): Vec2 {
    const dimensions = getDimensions(grid);
    const halfWidth3 = dimensions.width3 / 2;
    const halfHeight3 = dimensions.height3 / 2;
    const x = Math.round((pos.x + halfWidth3 - HALF_CELL) / CELL_SIZE);
    const y = Math.round((halfHeight3 - HALF_CELL - pos.z) / CELL_SIZE);
    return [x, y];
}

export function getCellType(grid: Grid, pos: Vec2): CellType {
    if (!grid[pos[1]]) {
      return n;
    }
    return grid[pos[1]][pos[0]];
}

export function getAdjacentWallCenters(grid: Grid, pos: Vec2): Vector3[] {
    const map: Vec2[][] = [
        [
            [-1, -1],
            [0, -1],
            [1, -1],
        ],
        [
            [-1, 0],
            [0, 0],
            [1, 0],
        ],
        [
            [-1, 1],
            [0, 1],
            [1, 1],
        ],
    ];

    const points: Vector3[] = [];
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[0].length; x++) {
            const next = addVec2(pos, map[y][x]);
            if (isPosInGrid(grid, next)) {
                if (getCellType(grid, next) === W) {
                  points.push(xyToScenePos(grid, next)); 
                }
            }
        }
    }

    return points;
}
