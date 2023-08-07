import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";

const loader = new FBXLoader();

type Weapon = {
  name: string;
  damageMult: number;
  attackRange: number;
  apCost: number;
};

const SKELETON = "SKELETON";
const HERO = "HERO";
type ThreeObjLoaderKey = typeof HERO | typeof SKELETON;
type ThreeObjLoader = (
  scene: THREE.Scene,
  state: EntityState,
  entity: GameEntity,
) => Promise<THREE.Group>;

export type GameEntity = {
  id: string;
  baseHealth: number;
  isEnemy: boolean;
  baseAttack: number;
  baseAP: number;
  weapon: Weapon;
  threeObjLoaderKey: ThreeObjLoaderKey;
};

type Animation = {
  clip: THREE.AnimationClip;
  action: THREE.AnimationAction;
};

type AnimationController = {
  mixer: THREE.AnimationMixer;
  animations: Record<string, Animation>;
};

const fists: Weapon = {
  name: "fists",
  damageMult: 1,
  attackRange: 1,
  apCost: 2,
};

export const heroId = "h";
export function createHero(): GameEntity {
  return {
    id: heroId,
    baseHealth: 50,
    isEnemy: false,
    baseAP: 10,
    baseAttack: 1,
    weapon: fists,
    threeObjLoaderKey: HERO,
  };
}

export type EntityState = {
  entities: Record<string, GameEntity>;
  animationControllers: Record<string, AnimationController>;
};

export function createEntityState() {
  return {
    entities: {},
    animationControllers: {},
  };
}

export function createSkeleton(idSuffix: string): GameEntity {
  return {
    id: `skel_${idSuffix}`,
    baseHealth: 10,
    baseAttack: 1,
    baseAP: 5,
    weapon: fists,
    isEnemy: true,
    threeObjLoaderKey: SKELETON,
  };
}

export function registerEntity(
  state: EntityState,
  entity: GameEntity,
): GameEntity {
  state.entities[entity.id] = entity;
  return entity;
}

export function getEntity(
  state: EntityState,
  id: string,
): GameEntity | undefined {
  return state.entities[id];
}

export function getAnimationController(
  state: EntityState,
  id: string,
): AnimationController | undefined {
  return state.animationControllers[id];
}

export function getThreeObj(
  scene: THREE.Scene,
  id: string,
): THREE.Group | undefined {
  return scene.getObjectByName(id) as THREE.Group;
}

export function updateAllAnimations(state: EntityState, timeElapsedS: number) {
  const keys = Object.keys(state.animationControllers);
  for (let i = 0; i < keys.length; i++) {
    state.animationControllers[keys[i]].mixer.update(timeElapsedS);
  }
}

async function addAnimation(
  name: string,
  mixer: THREE.AnimationMixer,
  animations: Record<string, Animation>,
): Promise<undefined> {
  const anim = await loader.loadAsync(`${name}.fbx`);
  const clip = anim.animations[0];
  animations[name] = {
    clip,
    action: mixer.clipAction(clip),
  };
}

const threeObjLoaders: Record<ThreeObjLoaderKey, ThreeObjLoader> = {
  async [HERO](
    scene: THREE.Scene,
    state: EntityState,
    entity: GameEntity,
  ): Promise<THREE.Group> {
    loader.setPath("./assets/content/Characters/");
    const fbx = await loader.loadAsync("DungeonCrawler_Character.fbx");
    fbx.scale.setScalar(0.01);
    fbx.traverse((c) => {
      c.castShadow = true;
    });

    fbx.name = entity.id;
    scene.add(fbx);
    const animations: Record<string, Animation> = {};
    const mixer = new THREE.AnimationMixer(fbx);
    const promises: Promise<undefined>[] = [];
    promises.push(addAnimation("idle", mixer, animations));
    promises.push(addAnimation("run", mixer, animations));
    promises.push(addAnimation("walk", mixer, animations));
    promises.push(addAnimation("walkback", mixer, animations));
    promises.push(addAnimation("dance", mixer, animations));
    promises.push(addAnimation("punchcombo", mixer, animations));
    promises.push(addAnimation("zombiehit", mixer, animations));
    await Promise.all(promises);
   state.animationControllers[entity.id] = {
      mixer,
      animations,
    };
    animations["idle"].action.play();
    mixer.update(0);
    return fbx;
  },

  async [SKELETON](
    scene: THREE.Scene,
    state: EntityState,
    entity: GameEntity,
  ): Promise<THREE.Group> {
    loader.setPath("./assets/skeleton/");
    const fbx = await loader.loadAsync("skeleton.fbx");
    fbx.scale.setScalar(0.3);
    fbx.traverse((c) => {
      c.castShadow = true;
    });

    fbx.name = entity.id;
    scene.add(fbx);
    const animations: Record<string, Animation> = {};
    const mixer = new THREE.AnimationMixer(fbx);
    const promises: Promise<undefined>[] = [];
    promises.push(addAnimation("idle", mixer, animations));
    promises.push(addAnimation("hithard", mixer, animations));
    promises.push(addAnimation("punch", mixer, animations));
    promises.push(addAnimation("walk", mixer, animations));
    await Promise.all(promises);
    state.animationControllers[entity.id] = {
      mixer,
      animations,
    };
    animations["idle"].action.play();
    mixer.update(0);
    return fbx;
  },
};

export function loadThreeObj(
  scene: THREE.Scene,
  state: EntityState,
  entity: GameEntity,
): Promise<THREE.Group> {
  return threeObjLoaders[entity.threeObjLoaderKey](scene, state, entity);
}
