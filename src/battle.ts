import * as THREE from "three";
import {
  CellColorKey,
  Room,
  clearAllCellFills,
  getCellXY,
  updateCell,
  updateCellFill,
  worldToXY,
  xYToWorld,
} from "./rooms";
import { Vec2, addVec2, pathfind, _, equalsVec2, inRange } from "./2d";
import {
  EntityState,
  GameEntity,
  getAnimationController,
  getEntity,
  getThreeObj,
  heroId,
} from "./entities";
import { checkDebouncerCache, createDebouncerCache } from "./debouncer";
import { TacticsCameraState } from "./TacticsCamera";
import { GameInputState } from "./GameInput";

function minmax(min: number, max: number, value: number): number {
  if (value < min) {
    return min;
  } else if (value > max) {
    return max;
  }

  return value;
}

export type BattleState = {
  waitingOnPlayerInput: boolean;
  turnOrder: GameEntity[];
  turnIdx: number;
  cursor: Vec2;
  room: Room;
  actions: Move[];
  entityAP: Record<string, number>;
  currentActionAPCost: number;
  entityHealth: Record<string, number>;
};

type Move = {
  entityId: string;
  threeObj: THREE.Group;
  curvePoint: number;
  curve: THREE.CatmullRomCurve3;
};

export function createBattleState(
  scene: THREE.Scene,
  entityState: EntityState,
  room: Room,
): BattleState {
  const hero = getEntity(entityState, heroId);
  const heroThreeObj = getThreeObj(scene, heroId);
  if (!hero || !heroThreeObj) {
    throw new Error("Hero is not registered.");
  }
  const turnOrder = [hero].concat(room.enemies);
  const entityAP: Record<string, number> = {};
  const entityHealth: Record<string, number> = {};
  for (let i = 0; i < turnOrder.length; i++) {
    const entity = turnOrder[i];
    entityAP[entity.id] = entity.baseAP;
    entityHealth[entity.id] = entity.baseHealth;
  }
  return {
    waitingOnPlayerInput: false,
    turnOrder,
    turnIdx: 0,
    cursor: [0, 0],
    room,
    actions: [],
    entityAP,
    currentActionAPCost: 0,
    entityHealth,
  };
}

export function addHeroToBattlefield(
  scene: THREE.Scene,
  state: BattleState,
  entityState: EntityState,
) {
  const hero = getEntity(entityState, heroId);
  const heroThreeObj = getThreeObj(scene, heroId);
  if (!hero || !heroThreeObj) {
    throw new Error("Hero is not registered.");
  }
  const relativePos = heroThreeObj.position.sub(state.room.position);
  const heroXY = worldToXY(state.room, relativePos);
  updateCell(state.room, heroXY, hero.id);
  const adjustedHeroPos = xYToWorld(state.room, heroXY);
  heroThreeObj.position.set(
    adjustedHeroPos.x,
    adjustedHeroPos.y,
    adjustedHeroPos.z,
  );
}

export function battle(
  scene: THREE.Scene,
  state: BattleState,
  entityState: EntityState,
) {
  const combatant = state.turnOrder[state.turnIdx];
  const heroXY = getCellXY(state.room, heroId);

  if (!combatant.isEnemy) {
    state.waitingOnPlayerInput = true;
    state.cursor = heroXY;
    return;
  }

  const combatantXY = getCellXY(state.room, combatant.id);
  const combatantAP = state.entityAP[combatant.id];
  if (combatantAP > 0 && !inRange(combatantXY, heroXY, combatant.weapon.attackRange)) {
    moveCombatant(scene, state, entityState, combatant.id, combatantXY, heroXY);
  }
}

function updateEntityAp(
  state: BattleState,
  entityState: EntityState,
  entityId: string,
  delta: number,
) {
  const entity = getEntity(entityState, entityId);
  if (!entity) {
    return;
  }
  let ap = state.entityAP[entityId] + delta;
  if (ap < 0) {
    ap = 0;
  }
  if (ap > entity.baseAP) {
    ap = entity.baseAP;
  }

  state.entityAP[entityId] = ap;
}

function setCursor(
  scene: THREE.Scene,
  state: BattleState,
  entityState: EntityState,
  cursor?: Vec2,
) {
  if (!cursor) {
    state.cursor = [0, 0];
    clearAllCellFills(scene, state.room);
    return;
  }

  let [x, y] = cursor;

  if (equalsVec2(state.cursor, cursor)) {
    return;
  }
  clearAllCellFills(scene, state.room);

  const width = state.room.layout[0].length;
  const height = state.room.layout.length;
  x = x >= 0 ? (x < width ? x : width - 1) : 0;
  y = y >= 0 ? (y < height ? y : height - 1) : 0;
  const nextCursor: Vec2 = [x, y];

  const hero = getEntity(entityState, heroId);
  if (!hero) {
    return;
  }

  const heroXY = getCellXY(state.room, hero.id);
  const currentAp = state.entityAP[hero.id];
  const path = pathfind(state.room, heroXY, nextCursor, currentAp);

  state.currentActionAPCost = minmax(0, currentAp, path.length);
  path.forEach((point) => updateCellFill(scene, point, true));
  state.cursor = nextCursor;
  const cellInPath = equalsVec2(path[path.length - 1], state.cursor);
  const color = cellInPath ? "pCursor" : ("nCursor" as CellColorKey);
  updateCellFill(scene, nextCursor, true, color);
}

function moveCombatant(
  scene: THREE.Scene,
  state: BattleState,
  entityState: EntityState,
  entityId: string,
  from: Vec2,
  to: Vec2,
) {
  const entity = getEntity(entityState, entityId);
  const entityThreeObj = getThreeObj(scene, entityId);
  const animationController = getAnimationController(entityState, entityId);
  if (!entity || !entityThreeObj || !animationController) {
    return;
  }

  const currentAp = state.entityAP[entity.id];
  const path = pathfind(
    state.room,
    from,
    to,
    currentAp,
    entity.weapon.attackRange,
  );

  updateEntityAp(state, entityState, entityId, -path.length);
  updateCell(state.room, from);
  updateCell(state.room, path[path.length - 1], entityId);

  const walkAction = animationController.animations["walk"].action;
  const idleAction = animationController.animations["idle"].action;
  walkAction.time = 0.0;
  walkAction.enabled = true;
  walkAction.setEffectiveTimeScale(1.0);
  walkAction.setEffectiveWeight(1.0);
  walkAction.crossFadeFrom(idleAction, 0.5, true);
  walkAction.play();

  const worldPath = path.map((pos) => xYToWorld(state.room, pos));
  const action: Move = {
    entityId,
    threeObj: entityThreeObj,
    curvePoint: 0,
    curve: new THREE.CatmullRomCurve3(worldPath),
  };

  state.actions.push(action);
}

function tickActionState(
  scene: THREE.Scene,
  state: BattleState,
  entityState: EntityState,
  timeElapsedS: number,
) {
  const action = state.actions[0];
  const increment = timeElapsedS / action.curve.points.length;
  action.curvePoint = Math.min(increment + action.curvePoint, 1);
  const vector = action.curve.getPoint(action.curvePoint);
  action.threeObj.lookAt(vector);
  action.threeObj.position.copy(vector);
  if (action.curvePoint === 1) {
    //TODO: Use a queue
    const animationController = getAnimationController(
      entityState,
      action.entityId,
    );
    if (animationController) {
      const walkAction = animationController.animations["walk"].action;
      const idleAction = animationController.animations["idle"].action;
      idleAction.time = 0.0;
      idleAction.enabled = true;
      idleAction.setEffectiveTimeScale(1.0);
      idleAction.setEffectiveWeight(1.0);
      idleAction.crossFadeFrom(walkAction, 0.5, true);
      idleAction.play();
    }
    state.turnIdx = (state.turnIdx + 1) % state.turnOrder.length;
    state.actions.shift();
    battle(scene, state, entityState);
  }
}

const inputDebouncerCache = createDebouncerCache(200);
export function tickBattleState(
  scene: THREE.Scene,
  state: BattleState,
  entityState: EntityState,
  inputState: GameInputState,
  tacticsCameraState: TacticsCameraState,
  timeElapsedS: number,
) {
  if (state.waitingOnPlayerInput && inputState.space) {
    state.currentActionAPCost = 0;
    state.waitingOnPlayerInput = false;
    const heroXY = getCellXY(state.room, heroId);
    moveCombatant(scene, state, entityState, heroId, heroXY, state.cursor);
    setCursor(scene, state, entityState, undefined);
    return;
  }

  if (state.actions.length) {
    tickActionState(scene, state, entityState, timeElapsedS);
    return;
  }

  if (!state.waitingOnPlayerInput) {
    setCursor(scene, state, entityState, undefined);
    return;
  }
  let delta: Vec2 = [0, 0];

  if (tacticsCameraState.deg >= 315 || tacticsCameraState.deg <= 45) {
    if (inputState.forward) {
      delta[1] = 1;
    }
    if (inputState.backward) {
      delta[1] = -1;
    }
    if (inputState.left) {
      delta[0] = 1;
    }
    if (inputState.right) {
      delta[0] = -1;
    }
  } else if (tacticsCameraState.deg > 45 && tacticsCameraState.deg <= 135) {
    if (inputState.forward) {
      delta[0] = -1;
    }
    if (inputState.backward) {
      delta[0] = 1;
    }
    if (inputState.left) {
      delta[1] = 1;
    }
    if (inputState.right) {
      delta[1] = -1;
    }
  } else if (tacticsCameraState.deg > 135 && tacticsCameraState.deg <= 225) {
    if (inputState.forward) {
      delta[1] = -1;
    }
    if (inputState.backward) {
      delta[1] = 1;
    }
    if (inputState.left) {
      delta[0] = -1;
    }
    if (inputState.right) {
      delta[0] = 1;
    }
  } else if (tacticsCameraState.deg > 225 && tacticsCameraState.deg <= 315) {
    if (inputState.forward) {
      delta[0] = 1;
    }
    if (inputState.backward) {
      delta[0] = -1;
    }
    if (inputState.left) {
      delta[1] = -1;
    }
    if (inputState.right) {
      delta[1] = 1;
    }
  }

  if (delta[0] < 0 && !checkDebouncerCache(inputDebouncerCache, "-x")) {
    delta[0] = 0;
  }

  if (delta[0] > 0 && !checkDebouncerCache(inputDebouncerCache, "+x")) {
    delta[0] = 0;
  }

  if (delta[1] < 0 && !checkDebouncerCache(inputDebouncerCache, "-y")) {
    delta[1] = 0;
  }

  if (delta[1] > 0 && !checkDebouncerCache(inputDebouncerCache, "+y")) {
    delta[1] = 0;
  }
  setCursor(scene, state, entityState, addVec2(state.cursor, delta));
}
