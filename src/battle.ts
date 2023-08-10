import * as THREE from "three";
import {
  CellColorKey,
  Room,
  clearAllCellFills,
  getCell,
  getCellXY,
  updateCell,
  updateCellFill,
  worldToXY,
  xYToWorld,
} from "./rooms";
import {
  Vec2,
  addVec2,
  pathfind,
  _,
  equalsVec2,
  inRange,
  scaleVec2,
  getDir,
  inverseVec2,
} from "./2d";
import {
  EntityState,
  GameEntity,
  Animation,
  getAnimationController,
  getAnimationsForWeapon,
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
  turnOrder: GameEntity[];
  turnIdx: number;
  cursor: Vec2;
  room: Room;
  actions: Action[];
  entityAP: Record<string, number>;
  entityHealth: Record<string, number>;

  // Player input
  waitingOnPlayerInput: boolean;
  currentActionAPCost: number;
  isPlayerAttacking: boolean;
};

const actionTypes = {
  move: "move",
  attack: "attack",
} as const;

type MoveAction = {
  type: typeof actionTypes.move;
  entityId: string;
  threeObj: THREE.Group;
  curvePoint: number;
  curve: THREE.CatmullRomCurve3;
};

type AttackAction = {
  type: typeof actionTypes.attack;
  entityId: string;
  threeObj: THREE.Group;
  animation: Animation;
  targetEntityId?: string;
  targetThreeObj?: THREE.Group;
  targetAnimation?: Animation;
  timeElapsedS: number;
};

type Action = MoveAction | AttackAction;

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
    turnOrder,
    turnIdx: 0,
    cursor: [0, 0],
    room,
    actions: [],
    entityAP,
    entityHealth,
    waitingOnPlayerInput: false,
    currentActionAPCost: 0,
    isPlayerAttacking: false,
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
  turnDelta: number,
) {
  state.turnIdx = (state.turnIdx + turnDelta) % state.turnOrder.length;
  const combatant = state.turnOrder[state.turnIdx];
  const heroXY = getCellXY(state.room, heroId);

  updateEntityAp(state, entityState, combatant.id, 2);

  if (!combatant.isEnemy) {
    state.waitingOnPlayerInput = true;
    setCursor(scene, state, entityState, addVec2(heroXY, [0, 1]));
    return;
  }

  const combatantXY = getCellXY(state.room, combatant.id);
  const combatantAP = state.entityAP[combatant.id];
  if (
    combatantAP > 0 &&
    !inRange(combatantXY, heroXY, combatant.weapon.attackRange)
  ) {
    const succeeded = moveCombatant(
      scene,
      state,
      entityState,
      combatant.id,
      combatantXY,
      heroXY,
    );
    if (succeeded) {
      return;
    }
  }

  battle(scene, state, entityState, 1);
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
  const heroXY = getCellXY(state.room, heroId);
  if (!cursor) {
    state.cursor = heroXY;
    clearAllCellFills(scene, state.room);
    updateCellFill(scene, heroXY, true, "nCursor");
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

  const currentAP = state.entityAP[hero.id];

  if (state.isPlayerAttacking) {
    state.currentActionAPCost = minmax(0, currentAP, hero.weapon.apCost);
    let dir = getDir(heroXY, cursor);
    if (equalsVec2(dir, [0, 0])) {
      dir = getDir(state.cursor, cursor);
    }

    let nextCursor = addVec2(heroXY, dir);
    if (equalsVec2(nextCursor, state.cursor)) {
      dir = getDir(nextCursor, cursor);
      nextCursor = addVec2(heroXY, dir);
    }

    const invertedDir = inverseVec2(dir);
    const negInvertedDir = scaleVec2(invertedDir, -1);

    const attackArea: Vec2[] = [];
    const [x, y] = dir;
    for (let i = 1; i <= hero.weapon.attackRange; i++) {
      const base = addVec2(heroXY, scaleVec2(dir, i));
      for (let j = 1; j <= hero.weapon.attackWidth; j++) {
        if (x === 0 || y === 0) {
          attackArea.push(addVec2(base, scaleVec2(invertedDir, j)));
          attackArea.push(addVec2(base, scaleVec2(negInvertedDir, j)));
          continue;
        }

        attackArea.push(addVec2(base, [-x * j, 0]));
        attackArea.push(addVec2(base, [0, -y * j]));
      }

      attackArea.push(base);
    }

    attackArea.forEach((point) =>
      updateCellFill(scene, point, true, "nCursor"),
    );

    state.cursor = nextCursor;
  } else {
    const path = pathfind(state.room, heroXY, nextCursor, currentAP);
    if (path.length < 1) {
      state.currentActionAPCost = 0;
      updateCellFill(scene, heroXY, true, "nCursor");
      state.cursor = heroXY;
      return;
    }
    state.currentActionAPCost = minmax(0, currentAP, path.length - 1);
    path.forEach((point) => updateCellFill(scene, point, true));
    const cursorInPath = equalsVec2(path[path.length - 1], nextCursor);
    const cursorColor: CellColorKey = cursorInPath ? "pCursor" : "nCursor";
    updateCellFill(scene, nextCursor, true, cursorColor);
    state.cursor = nextCursor;
  }
}

function hasEnoughAP(state: BattleState, entityId: string, apCost?: number) {
  const currentAP = state.entityAP[entityId];
  const cost = apCost ?? state.currentActionAPCost;
  return currentAP > cost;
}

function moveCombatant(
  scene: THREE.Scene,
  state: BattleState,
  entityState: EntityState,
  entityId: string,
  from: Vec2,
  to: Vec2,
): boolean {
  const entity = getEntity(entityState, entityId);
  const entityThreeObj = getThreeObj(scene, entityId);
  if (!entity || !entityThreeObj) {
    return false;
  }

  const currentAp = state.entityAP[entity.id];
  const path = pathfind(state.room, from, to, currentAp);
  if (path.length < 2) {
    return false;
  }

  updateEntityAp(state, entityState, entityId, -path.length);
  updateCell(state.room, from);
  updateCell(state.room, path[path.length - 1], entityId);

  const worldPath = path.map((pos) => xYToWorld(state.room, pos));
  const action: MoveAction = {
    type: actionTypes.move,
    entityId,
    threeObj: entityThreeObj,
    curvePoint: 0,
    curve: new THREE.CatmullRomCurve3(worldPath),
  };

  state.actions.push(action);
  return true;
}

function attack(
  scene: THREE.Scene,
  state: BattleState,
  entityState: EntityState,
  entityId: string,
  target: Vec2,
) {
  const entity = getEntity(entityState, entityId);
  const entityThreeObj = getThreeObj(scene, entityId);
  const animationController = getAnimationController(entityState, entityId);
  if (!entity || !entityThreeObj || !animationController) {
    return;
  }

  const entityXY = getCellXY(state.room, entityId);

  const path = pathfind(
    state.room,
    entityXY,
    target,
    entity.weapon.attackRange,
  );
  const adjustedTarget = path[path.length - 1];
  const cell = getCell(state.room, adjustedTarget);
  const targetThreeObj = getThreeObj(scene, cell);

  const [animation, targetAnimation] = getAnimationsForWeapon(
    entityState,
    entityId,
    cell,
  );

  if (!animation) {
    return;
  }

  const action: AttackAction = {
    type: actionTypes.attack,
    entityId,
    targetEntityId: cell,
    threeObj: entityThreeObj,
    targetThreeObj,
    animation,
    targetAnimation,
    timeElapsedS: 0,
  };

  state.actions.push(action);
}

function tickMoveAction(
  state: BattleState,
  entityState: EntityState,
  move: MoveAction,
  timeElapsedS: number,
) {
  const animationController = getAnimationController(
    entityState,
    move.entityId,
  );

  if (!animationController) {
    state.actions.shift();
    return;
  }

  const increment = timeElapsedS / move.curve.points.length;
  if (move.curvePoint === 0) {
    const walkAction = animationController.animations["walk"].action;
    const idleAction = animationController.animations["idle"].action;
    walkAction.time = 0.0;
    walkAction.enabled = true;
    walkAction.setEffectiveTimeScale(1.0);
    walkAction.setEffectiveWeight(1.0);
    walkAction.crossFadeFrom(idleAction, 0.5, true);
    walkAction.play();
  }
  move.curvePoint = Math.min(increment + move.curvePoint, 1);
  const vector = move.curve.getPoint(move.curvePoint);
  move.threeObj.lookAt(vector);
  move.threeObj.position.copy(vector);
  if (move.curvePoint === 1) {
    const walkAction = animationController.animations["walk"].action;
    const idleAction = animationController.animations["idle"].action;
    idleAction.time = 0.0;
    idleAction.enabled = true;
    idleAction.setEffectiveTimeScale(1.0);
    idleAction.setEffectiveWeight(1.0);
    idleAction.crossFadeFrom(walkAction, 0.5, true);
    idleAction.play();
    state.actions.shift();
  }
}

function tickAttackAction(
  state: BattleState,
  entityState: EntityState,
  attack: AttackAction,
  timeElapsedS: number,
) {
  if (attack.timeElapsedS === 0) {
    if (attack.targetThreeObj) {
      attack.threeObj.lookAt(attack.targetThreeObj.position);
    }

    attack.animation.action.time = 0.0;
    attack.animation.action.enabled = true;
    attack.animation.action.setEffectiveTimeScale(1.0);
    attack.animation.action.setEffectiveWeight(1.0);
    attack.animation.action.play();

    if (attack.targetAnimation) {
      attack.targetAnimation.action.time = 0.0;
      attack.targetAnimation.action.enabled = true;
      attack.targetAnimation.action.setEffectiveTimeScale(1.0);
      attack.targetAnimation.action.setEffectiveWeight(1.0);
      attack.targetAnimation.action.play();
    }
  }

  attack.timeElapsedS += timeElapsedS;

  if (attack.timeElapsedS > 1) {
    const animationController = getAnimationController(
      entityState,
      attack.entityId,
    );
    if (animationController) {
      const idleAction = animationController.animations["idle"].action;
      idleAction.time = 0.0;
      idleAction.enabled = true;
      idleAction.setEffectiveTimeScale(1.0);
      idleAction.setEffectiveWeight(1.0);
      idleAction.crossFadeFrom(attack.animation.action, 0.5, true);
      idleAction.play();
    }

    const targetAnimationController =
      attack.targetEntityId && attack.targetAnimation
        ? getAnimationController(entityState, attack.targetEntityId)
        : undefined;
    if (targetAnimationController) {
      const idleAction = targetAnimationController.animations["idle"].action;
      idleAction.time = 0.0;
      idleAction.enabled = true;
      idleAction.setEffectiveTimeScale(1.0);
      idleAction.setEffectiveWeight(1.0);
      idleAction.crossFadeFrom(attack.animation.action, 0.5, true);
      idleAction.play();
    }

    state.actions.shift();
  }
}

function tickActionState(
  scene: THREE.Scene,
  state: BattleState,
  entityState: EntityState,
  timeElapsedS: number,
) {
  const action = state.actions[0];
  if (action.type === actionTypes.move) {
    tickMoveAction(state, entityState, action, timeElapsedS);
  } else if (action.type === actionTypes.attack) {
    tickAttackAction(state, entityState, action, timeElapsedS);
  }

  if (state.actions.length < 1) {
    state.actions.shift();
    battle(scene, state, entityState, 1);
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
  if (!state.waitingOnPlayerInput) {
    if (state.actions.length) {
      tickActionState(scene, state, entityState, timeElapsedS);
      return;
    }
    return;
  }

  const heroXY = getCellXY(state.room, heroId);
  if (inputState.attack && checkDebouncerCache(inputDebouncerCache, "attack")) {
    state.isPlayerAttacking = !state.isPlayerAttacking;
    setCursor(scene, state, entityState, addVec2(heroXY, [0, 1]));
  }

  if (inputState.space) {
    if (state.isPlayerAttacking && !hasEnoughAP(state, heroId)) {
      return;
    }
    state.currentActionAPCost = 0;
    state.waitingOnPlayerInput = false;
    if (state.isPlayerAttacking) {
      attack(scene, state, entityState, heroId, state.cursor);
    } else if (!equalsVec2(heroXY, state.cursor)) {
      moveCombatant(scene, state, entityState, heroId, heroXY, state.cursor);
    } else {
      battle(scene, state, entityState, 1);
    }
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
