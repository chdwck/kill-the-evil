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
  equalsVec2,
  inRange,
  getDir,
  getAttackArea,
} from "./2d";
import {
  EntityState,
  GameEntity,
  getAnimationController,
  getEntityAnimationsForWeapon,
  getEntity,
  getThreeObj,
  heroId,
  EntityAnimation,
} from "./entities";
import { checkDebouncerCache, createDebouncerCache } from "./debouncerCache";
import { TacticsCameraState } from "./TacticsCamera";
import { GameInputState } from "./GameInput";
import { Queue, createQueue, deque, enqueue, peek } from "./fifoQueue";

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
  actions: Queue<Action>;
  entityAP: Record<string, number>;
  entityHealth: Record<string, number>;

  // Player input
  waitingOnPlayerInput: boolean;
  currentActionAPCost: number;
  isPlayerAttacking: boolean;
  log: Queue<Log>;
};

const logItemTypes = {
  damageRecieved: "damageRecieved",
} as const;

type DamageRecievedLog = {
  type: typeof logItemTypes.damageRecieved;
  targetEntityId: string;
  damageRecieved: number;
};

type Log = DamageRecievedLog;

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
  entityAnimations: EntityAnimation[];
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
    actions: createQueue(),
    log: createQueue(),
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

  if (turnDelta > 0) {
    updateEntityAp(state, entityState, combatant.id, 2);
  }

  if (!combatant.isEnemy) {
    state.waitingOnPlayerInput = true;
    setCursor(scene, state, entityState, heroXY);
    return;
  }

  const combatantThreeObj = getThreeObj(scene, combatant.id);
  const heroThreeObj = getThreeObj(scene, heroId);

  if (combatantThreeObj && heroThreeObj) {
    combatantThreeObj?.lookAt(heroThreeObj?.position);
  }

  const combatantXY = getCellXY(state.room, combatant.id);
  const combatantAP = state.entityAP[combatant.id];

  const inAttackRange = inRange(
    combatantXY,
    heroXY,
    combatant.weapon.attackRange,
  );
  const hasAttackAp = combatantAP >= combatant.weapon.apCost;
  if (inAttackRange && hasAttackAp) {
    const succeeded = attack(scene, state, entityState, combatant.id, heroXY);
    if (succeeded) {
      return;
    }
    return;
  }

  if (combatantAP > 0) {
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

    const attackArea = getAttackArea(heroXY, dir, hero);

    attackArea.forEach((point) =>
      updateCellFill(scene, point, true, "nCursor"),
    );

    state.cursor = nextCursor;
  } else {
    const path = pathfind(state.room, heroXY, nextCursor, currentAP + 1);
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
  const heroThreeObj = getThreeObj(scene, heroId);
  if (heroThreeObj) {
    heroThreeObj.lookAt(xYToWorld(state.room, state.cursor));
  }
}

function hasEnoughAP(state: BattleState, entityId: string, apCost?: number) {
  const currentAP = state.entityAP[entityId];
  const cost = apCost ?? state.currentActionAPCost;
  return currentAP >= cost;
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
  const path = pathfind(state.room, from, to, currentAp + 1);
  if (path.length < 2) {
    return false;
  }

  updateEntityAp(state, entityState, entityId, -(path.length - 1));
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

  enqueue(state.actions, action);
  return true;
}

function attack(
  scene: THREE.Scene,
  state: BattleState,
  entityState: EntityState,
  entityId: string,
  target: Vec2,
): boolean {
  const entity = getEntity(entityState, entityId);
  const entityThreeObj = getThreeObj(scene, entityId);
  const animationController = getAnimationController(entityState, entityId);
  if (!entity || !entityThreeObj || !animationController) {
    return false;
  }

  const entityXY = getCellXY(state.room, entityId);
  const dir = getDir(entityXY, target);
  const attackArea = getAttackArea(entityXY, dir, entity);
  const targetIds = [];
  for (let i = 0; i < attackArea.length; i++) {
    const targetId = getCell(state.room, attackArea[i]);
    if (!getEntity(entityState, targetId)) {
      continue;
    }
    targetIds.push(targetId);
    const damage =
      Math.round(Math.random() * entity.weapon.damageMult * entity.baseAttack) +
      entity.baseAttack;

    state.entityHealth[targetId] = Math.max(0, state.entityHealth[targetId] - damage);
    enqueue(state.log, {
      type: logItemTypes.damageRecieved,
      damageRecieved: damage,
      targetEntityId: entityId,
    });
  }

  const entityAnimations = getEntityAnimationsForWeapon(
    entityState,
    state,
    entityId,
    targetIds,
  );

  const action: AttackAction = {
    type: actionTypes.attack,
    entityId,
    entityAnimations,
    timeElapsedS: 0,
  };

  enqueue(state.actions, action);
  updateEntityAp(state, entityState, entityId, -entity.weapon.apCost);
  return true;
}

function tickAttackAction(
  scene: THREE.Scene,
  state: BattleState,
  entityState: EntityState,
  attack: AttackAction,
  timeElapsedS: number,
) {
  const attackingEntity = getEntity(entityState, attack.entityId);
  const animationController = getAnimationController(
    entityState,
    attack.entityId,
  );

  if (!animationController || !attackingEntity) {
    deque(state.actions);
    return;
  }

  const attackDuration = 2.0;
  if (attack.timeElapsedS === 0) {
    const attackerThreeObj = getThreeObj(scene, attack.entityId);
    if (!attack.entityAnimations.length || !attackerThreeObj) {
      deque(state.actions);
      return;
    }
    for (let i = 0; i < attack.entityAnimations.length; i++) {
      const entityAnimation = attack.entityAnimations[i];
      if (entityAnimation.entity.id !== attack.entityId) {
        const threeObj = getThreeObj(scene, entityAnimation.entity.id);
        if (threeObj) {
          threeObj.lookAt(attackerThreeObj.position);
        }
      }
      entityAnimation.animation.action.time = 0.0;
      entityAnimation.animation.action.enabled = true;
      entityAnimation.animation.action.setEffectiveWeight(10.0);
      entityAnimation.animation.action.clampWhenFinished = true;
      entityAnimation.animation.action.reset();
      entityAnimation.animation.action.setLoop(THREE.LoopOnce, 1);
      entityAnimation.animation.action.setDuration(attackDuration);
      entityAnimation.animation.action.play();
    }
  }

  attack.timeElapsedS += timeElapsedS;
  if (attack.timeElapsedS >= attackDuration) {
    for (let i = 0; i < attack.entityAnimations.length; i++) {
      const entityAnimation = attack.entityAnimations[i];
      if (state.entityHealth[entityAnimation.entity.id] < 1) {
        continue;
      }

      const idleAction = entityAnimation.controller.animations["idle"].action;
      idleAction.time = 0.0;
      idleAction.enabled = true;
      idleAction.setEffectiveTimeScale(1.0);
      idleAction.setEffectiveWeight(1.0);
      idleAction.crossFadeFrom(entityAnimation.animation.action, 0.25, true);
      idleAction.play();
    }

    deque(state.actions);
  }
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
    deque(state.actions);
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
    deque(state.actions);
  }
}

function tickActionState(
  scene: THREE.Scene,
  state: BattleState,
  entityState: EntityState,
  timeElapsedS: number,
) {
  const action = peek(state.actions);
  if (!action) {
    battle(scene, state, entityState, 1);
    return;
  }

  if (action.type === actionTypes.move) {
    tickMoveAction(state, entityState, action, timeElapsedS);
  } else if (action.type === actionTypes.attack) {
    tickAttackAction(scene, state, entityState, action, timeElapsedS);
  }

  if (state.actions.length < 1) {
    const entityId = state.turnOrder[state.turnIdx].id;
    const entityAP = state.entityAP[entityId];
    const turnDelta = entityAP > 0 ? 0 : 1;
    battle(scene, state, entityState, turnDelta);
  }
}

const cursorDebouncerCache = createDebouncerCache(200);
const stateToggleDebouncerCache = createDebouncerCache(1000);
export function tickBattleState(
  scene: THREE.Scene,
  state: BattleState,
  entityState: EntityState,
  inputState: GameInputState,
  tacticsCameraState: TacticsCameraState,
  timeElapsedS: number,
) {
  if (state.actions.length) {
    tickActionState(scene, state, entityState, timeElapsedS);
    return;
  }

  if (!state.waitingOnPlayerInput) {
    return;
  }

  const heroXY = getCellXY(state.room, heroId);
  if (
    inputState.attack &&
    checkDebouncerCache(stateToggleDebouncerCache, "attack")
  ) {
    state.isPlayerAttacking = !state.isPlayerAttacking;
    setCursor(scene, state, entityState, heroXY);
  }

  if (inputState.pass) {
    state.waitingOnPlayerInput = false;
    battle(scene, state, entityState, 1);
    return;
  }

  if (inputState.space) {
    if (state.isPlayerAttacking && !hasEnoughAP(state, heroId)) {
      return;
    }
    state.currentActionAPCost = 0;
    state.waitingOnPlayerInput = false;
    let success = false;
    if (state.isPlayerAttacking) {
      success = attack(scene, state, entityState, heroId, state.cursor);
    } else if (!equalsVec2(heroXY, state.cursor)) {
      success = moveCombatant(
        scene,
        state,
        entityState,
        heroId,
        heroXY,
        state.cursor,
      );
    }

    if (!success) {
      battle(scene, state, entityState, 0);
    }
    setCursor(scene, state, entityState, undefined);
    return;
  }

  const delta: Vec2 = [0, 0];

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

  if (delta[0] < 0 && !checkDebouncerCache(cursorDebouncerCache, "-x")) {
    delta[0] = 0;
  }

  if (delta[0] > 0 && !checkDebouncerCache(cursorDebouncerCache, "+x")) {
    delta[0] = 0;
  }

  if (delta[1] < 0 && !checkDebouncerCache(cursorDebouncerCache, "-y")) {
    delta[1] = 0;
  }

  if (delta[1] > 0 && !checkDebouncerCache(cursorDebouncerCache, "+y")) {
    delta[1] = 0;
  }
  if (!equalsVec2(delta, [0, 0])) {
    setCursor(scene, state, entityState, addVec2(state.cursor, delta));
  }
}
