import * as THREE from "three";
import { createGameInputState, setupKeyboardEventListeners } from "./GameInput";
import {
  createEntityState,
  createHero,
  loadThreeObj,
  registerEntity,
  updateAllAnimations,
} from "./entities";
import {
  createEntryRoom,
  renderBattlefield,
  renderRoom,
  teardownBattlefield,
} from "./rooms";
import { createTacticsCameraState, tickTacticsCamera } from "./TacticsCamera";
import {
  createThirdPersonCameraState,
  tickThirdPersonCameraFollow,
} from "./ThirdPersonCamera";
import {
  updateHeroPosition,
  updateHeroExploreAnimations,
  heroAnimationStates,
  HeroAnimationState,
} from "./heroExploration";
import {
  BattleState,
  addHeroToBattlefield,
  battle,
  createBattleState,
  tickBattleState,
} from "./battle";
import { initBattleUI, syncBattleUI } from "./ui";

const ASPECT_RATIO = 1920 / 1080;

const gameStates = {
  explore: "explore",
  battle: "battle",
} as const;

type GameState = keyof typeof gameStates;

async function main() {
  const width = window.innerWidth;
  const height = width / ASPECT_RATIO;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  document.body.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const fov = 60;
  const near = 1.0;
  const far = 1000.0;
  const camera = new THREE.PerspectiveCamera(fov, ASPECT_RATIO, near, far);

  const scene = new THREE.Scene();

  const light = new THREE.HemisphereLight(0x000000, 0xffffff, 1.0);
  scene.add(light);

  const inputState = createGameInputState();
  setupKeyboardEventListeners(inputState);

  const entityState = createEntityState();

  const hero = registerEntity(entityState, createHero());
  const heroThreeObj = await loadThreeObj(scene, entityState, hero);

  const entryRoom = createEntryRoom(entityState, new THREE.Vector3(0, 0, 0));
  // TODO: May need to make this async
  renderRoom(scene, entityState, entryRoom);

  let gameState: GameState = gameStates.explore;

  const tacticsCameraState = createTacticsCameraState(camera, entryRoom);
  const thirdPersonCameraState = createThirdPersonCameraState();

  const heroVelocity = new THREE.Vector3(0, 0, 0);
  let heroAnimationState: HeroAnimationState = heroAnimationStates.idle;

  let battleState: BattleState;
  function switchToBattleState() {
    battleState = createBattleState(scene, entityState, entryRoom);
    addHeroToBattlefield(scene, battleState, entityState);
    renderBattlefield(scene, entryRoom);
    initBattleUI(battleState);
    battle(scene, battleState, entityState, 0);
    gameState = gameStates.battle;
  }
  function update(timeElapsedS: number) {
    renderer.render(scene, camera);

    if (gameState === gameStates.explore) {
      if (inputState.battleView) {
        switchToBattleState();
        return;
      }

      updateHeroPosition(scene, heroVelocity, inputState, timeElapsedS);
      heroAnimationState = updateHeroExploreAnimations(
        heroAnimationState,
        entityState,
        inputState,
      );
      tickThirdPersonCameraFollow(
        thirdPersonCameraState,
        camera,
        heroThreeObj,
        timeElapsedS,
      );
    } else if (gameState === gameStates.battle) {
      if (!inputState.battleView) {
        teardownBattlefield(scene, entryRoom);
        gameState = gameStates.explore;
        return;
      }

      tickTacticsCamera(
        tacticsCameraState,
        inputState,
        camera,
        entryRoom,
        heroThreeObj.position,
        timeElapsedS,
      );

      tickBattleState(
        scene,
        battleState,
        entityState,
        inputState,
        tacticsCameraState,
        timeElapsedS,
      );

      syncBattleUI(battleState);
    }

    updateAllAnimations(entityState, timeElapsedS);
  }

  let previousRaf: number | undefined;
  function raf() {
    requestAnimationFrame((t: number) => {
      if (previousRaf === undefined) {
        previousRaf = t;
      }
      raf();
      update((t - previousRaf) / 1000);
      previousRaf = t;
    });
  }
  raf();
}

main();
