import {
    BoxGeometry,
    DoubleSide,
    EdgesGeometry,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshBasicMaterial,
    PlaneGeometry,
    Scene,
    TextureLoader,
    Vector3,
} from "three";
import {
    Grid,
    getCellType,
    getDimensions,
    isPosInGrid,
    xyToScenePos,
} from "./grid";
import { W, S, CELL_SIZE, WALL_HEIGHT, _ } from "./constants";
import { Vec2, addVec2 } from "./vec2";
import { midpoint3 } from "./3d";
import { getThreeObj, heroId } from "../entities";

function cellName(type: string, x: number, y: number) {
    return `${type}-${x}-${y}`;
}

const loader = new TextureLoader();

const texture = loader.load("mossy.jpg");
const mat = new MeshBasicMaterial({ map: texture, side: DoubleSide });

type CollideBox = {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type Wall = {
    name: string;
    collideBox: CollideBox;
}
type WallRecord = Record<string, Wall>;

export type MapState = {
    walls: WallRecord;
    cellToWall: Record<string, (keyof WallRecord)[]>;
    grid: Grid;
};

export function createMapState(grid: Grid): MapState {
    return {
        walls: {},
        cellToWall: {},
        grid
    };
}

function trackWallCollideBox(
    mapState: MapState,
    wallCellNames: string[],
    wallCollideBox: CollideBox
) {
    const wallName = `wall-${Object.keys(mapState.walls).length}`;
    for (let i = 0; i < wallCellNames.length; i++) {
        mapState.cellToWall[wallCellNames[i]] ??= [];
        mapState.cellToWall[wallCellNames[i]].push(wallName);
    }

    mapState.walls[wallName] = {
        name: wallName,
        collideBox: wallCollideBox
    };
}

const colliderSizeBuffer = .2;
export function isCollidingWithWall(
    mapState: MapState,
    cellPos: Vec2,
    next: Vector3
): boolean {
    const [x, y] = cellPos;
    const wallNames = mapState.cellToWall[cellName(W, x, y)];
    if (!wallNames?.length) {
        return false;
    }
    for (let i = 0; i < wallNames.length; i++) {
        const wall = mapState.walls[wallNames[i]];
        if (
            wall.collideBox.x < next.x + colliderSizeBuffer &&
            wall.collideBox.x + wall.collideBox.width > next.x - colliderSizeBuffer &&
            wall.collideBox.y > next.z - colliderSizeBuffer &&
            wall.collideBox.y - wall.collideBox.height < next.z - colliderSizeBuffer
        ) {
            return true;
        }
    }

    return false;
}

export function renderMap(scene: Scene, mapState: MapState) {
    const { height, width, width3, height3 } = getDimensions(mapState.grid);
    const floor = new Mesh(
        new PlaneGeometry(width3, height3, 1, 1),
        new MeshBasicMaterial({ color: 0xff0000 }),
    );

    floor.name = "floor";

    let wallCells = [];
    // Horizontal walls
    for (let y = 0; y < height; y++) {
        let begin = null;
        let end = null;
        wallCells = [];
        for (let x = 0; x < width; x++) {
            const cellType = getCellType(mapState.grid, [x, y]);
            if (cellType !== W || x === width - 1) {
                if (begin === null || end === null) {
                    begin = null;
                    end = null;
                    continue;
                }

                if (x === width - 1 && cellType === W) {
                    end = x;
                }
                const dist = (end - begin) * CELL_SIZE;
                const geo = new PlaneGeometry(dist, WALL_HEIGHT, 1, 1);
                const wall = new Mesh(geo, mat);
                const point = xyToScenePos(mapState.grid, [begin, y]);

                wall.position.setY(1);
                wall.position.setZ(point.z);
                wall.position.setX(point.x + dist / 2);
                const collideBox = {
                    x: point.x,
                    y: point.z + colliderSizeBuffer,
                    width: dist,
                    height: colliderSizeBuffer * 2,
                };
                trackWallCollideBox(mapState, wallCells, collideBox);

                scene.add(wall);

                begin = null;
                end = null;
                wallCells = [];
                continue;
            }

            if (begin === null) {
                begin = x;
            } else {
                end = x;
            }

            wallCells.push(cellName(W, x, y));
        }
    }

    // Vertical walls
    for (let x = 0; x < width; x++) {
        let begin = null;
        let end = null;
        wallCells = [];
        for (let y = 0; y < height; y++) {
            const cellType = getCellType(mapState.grid, [x, y]);
            if (cellType !== W || y === height - 1) {
                if (begin === null || end === null) {
                    begin = null;
                    end = null;
                    continue;
                }
                if (y === height - 1 && cellType === W) {
                    end = y;
                }
                const dist = (end - begin) * CELL_SIZE;
                const geo = new PlaneGeometry(dist, WALL_HEIGHT, 1, 1);
                const wall = new Mesh(geo, mat);
                const point = xyToScenePos(mapState.grid, [x, begin]);

                wall.position.setY(1);
                wall.position.setZ(point.z - dist / 2);
                wall.position.setX(point.x);
                wall.rotation.y = Math.PI / 2;
                const collideBox = {
                    x: point.x - colliderSizeBuffer,
                    y: point.z,
                    width: colliderSizeBuffer * 2,
                    height: dist,
                };
                trackWallCollideBox(mapState, wallCells, collideBox);

                scene.add(wall);

                begin = null;
                end = null;
                wallCells = [];
                continue;
            }

            if (begin === null) {
                begin = y;
            } else {
                end = y;
            }
            wallCells.push(cellName(W, x, y));
        }
    }

    // diagonal (tl to br) walls
    for (let y = 1; y < height; y++) {
        let curr: Vec2 = [0, y];
        let begin: Vec2 | null = null;
        let end: Vec2 | null = null;
        wallCells = [];
        while (isPosInGrid(mapState.grid, curr)) {
            const cellType = getCellType(mapState.grid, curr);
            const next = addVec2(curr, [1, -1]);
            const nextIsInRange = isPosInGrid(mapState.grid, next);
            if (cellType !== W || !nextIsInRange) {
                if (begin === null || end === null) {
                    begin = null;
                    end = null;
                    curr = next;
                    continue;
                }
                if (!nextIsInRange && cellType === W) {
                    end = curr;
                }
                const begin3Pos = xyToScenePos(mapState.grid, begin);
                const end3Pos = xyToScenePos(mapState.grid, end);

                const dist = begin3Pos.distanceTo(end3Pos);
                const geo = new PlaneGeometry(dist, WALL_HEIGHT, 1, 1);
                const wall = new Mesh(geo, mat);
                wall.rotation.y = -Math.PI / 4;
                wall.position.copy(midpoint3(begin3Pos, end3Pos));
               // const collideBox: CollideBox = {
               //    isDiagonal: true,
               // };
                //trackWallCollideBox(mapState, wallCells, collideBox);

                scene.add(wall);

                begin = null;
                end = null;
                curr = next;
                continue;
            }

            if (begin === null) {
                begin = curr;
            } else {
                end = curr;
            }
            wallCells.push(cellName(W, ...curr));
            curr = next;
        }
    }
    // diagonal (tr to bl) walls
    for (let y = 1; y < height; y++) {
        let curr: Vec2 = [width - 1, y];
        let begin: Vec2 | null = null;
        let end: Vec2 | null = null;
        while (isPosInGrid(mapState.grid, curr)) {
            const cellType = getCellType(mapState.grid, curr);
            const next = addVec2(curr, [-1, -1]);
            const nextIsInRange = isPosInGrid(mapState.grid, next);
            if (cellType !== W || !nextIsInRange) {
                if (begin === null || end === null) {
                    begin = null;
                    end = null;
                    curr = next;
                    continue;
                }
                if (!nextIsInRange && cellType === W) {
                    end = curr;
                }
                const begin3Pos = xyToScenePos(mapState.grid, begin);
                const end3Pos = xyToScenePos(mapState.grid, end);

                const dist = begin3Pos.distanceTo(end3Pos);
                const geo = new PlaneGeometry(dist, WALL_HEIGHT, 1, 1);
                const wall = new Mesh(geo, mat);
                wall.rotation.y = Math.PI / 4;
                wall.position.copy(midpoint3(begin3Pos, end3Pos));

                scene.add(wall);

                begin = null;
                end = null;
                curr = next;
                continue;
            }

            if (begin === null) {
                begin = curr;
            } else {
                end = curr;
            }

            curr = next;
        }
    }

    // diagonal (br to tl) walls
    for (let y = height - 2; y > 0; y--) {
        let curr: Vec2 = [width - 1, y];
        let begin: Vec2 | null = null;
        let end: Vec2 | null = null;
        while (isPosInGrid(mapState.grid, curr)) {
            const cellType = getCellType(mapState.grid, curr);
            const next = addVec2(curr, [-1, 1]);
            const nextIsInRange = isPosInGrid(mapState.grid, next);
            if (cellType !== W || !nextIsInRange) {
                if (begin === null || end === null) {
                    begin = null;
                    end = null;
                    curr = next;
                    continue;
                }
                if (!nextIsInRange && cellType === W) {
                    end = curr;
                }
                const begin3Pos = xyToScenePos(mapState.grid, begin);
                const end3Pos = xyToScenePos(mapState.grid, end);

                const dist = begin3Pos.distanceTo(end3Pos);
                const geo = new PlaneGeometry(dist, WALL_HEIGHT, 1, 1);
                const wall = new Mesh(geo, mat);
                wall.rotation.y = -Math.PI / 4;
                wall.position.copy(midpoint3(begin3Pos, end3Pos));

                scene.add(wall);

                begin = null;
                end = null;
                curr = next;
                continue;
            }

            if (begin === null) {
                begin = curr;
            } else {
                end = curr;
            }

            curr = next;
        }
    }

    // diagonal (bl to tr) walls
    for (let y = height - 2; y > 0; y--) {
        let curr: Vec2 = [0, y];
        let begin: Vec2 | null = null;
        let end: Vec2 | null = null;
        while (isPosInGrid(mapState.grid, curr)) {
            const cellType = getCellType(mapState.grid, curr);
            const next = addVec2(curr, [1, 1]);
            const nextIsInRange = isPosInGrid(mapState.grid, next);
            if (cellType !== W || !nextIsInRange) {
                if (begin === null || end === null) {
                    begin = null;
                    end = null;
                    curr = next;
                    continue;
                }
                if (!nextIsInRange && cellType === W) {
                    end = curr;
                }
                const begin3Pos = xyToScenePos(mapState.grid, begin);
                const end3Pos = xyToScenePos(mapState.grid, end);

                const dist = begin3Pos.distanceTo(end3Pos);
                const geo = new PlaneGeometry(dist, WALL_HEIGHT, 1, 1);
                const wall = new Mesh(geo, mat);
                wall.rotation.y = Math.PI / 4;
                wall.position.copy(midpoint3(begin3Pos, end3Pos));

                scene.add(wall);

                begin = null;
                end = null;
                curr = next;
                continue;
            }

            if (begin === null) {
                begin = curr;
            } else {
                end = curr;
            }

            curr = next;
        }
    }

    const lineMaterial = new LineBasicMaterial({
        color: 0x00ff00,
    });
    const edge = new EdgesGeometry(
        new BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE),
    );
    let start: Vec2 = [0, 0];
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const cellType = getCellType(mapState.grid, [x, y]);
            if (cellType === S) {
                start = [x, y];
            }

            if (cellType !== _) {
                const name = cellName(cellType, x, y);
                const cell = new LineSegments(edge, lineMaterial);
                cell.name = name;
                const pos = xyToScenePos(mapState.grid, [x, y]);
                cell.position.copy(pos);
                scene.add(cell);
            }

        }
    }

    const hero3Obj = getThreeObj(scene, heroId);
    if (!hero3Obj) {
        return;
    }
    hero3Obj.position.copy(xyToScenePos(mapState.grid, start));
    hero3Obj.position.setY(0);

    floor.rotation.x = -Math.PI / 2;
    // floor.position.set(0, 0, 0);
    scene.add(floor);
}
