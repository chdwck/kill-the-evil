import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";

const loader = new FBXLoader();

type Weapon = {
  name: string;
  damageMult: number;
  attackRange: number;
};

const SKELETON = "SKELETON";
const HERO = "HERO";
type ThreeObjLoaderKey = typeof HERO | typeof SKELETON;
type ThreeObjLoader = (
  scene: THREE.Scene,
  entity: GameEntity,
) => Promise<THREE.Group>;

export type GameEntity = {
  id: string;
  health: number;
  moveRange: number;
  isEnemy: boolean;
  baseAttack: number;
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
};

export const heroId = "h";
let hero: GameEntity = {
  id: heroId,
  health: 50,
  moveRange: 4,
  isEnemy: false,
  baseAttack: 1,
  weapon: fists,
  threeObjLoaderKey: HERO,
};

const entities: Record<string, GameEntity> = {
  [heroId]: hero,
};

const animationControllers: Record<string, AnimationController> = {};

export function createSkeleton(idSuffix: string): GameEntity {
  return {
    id: `skel_${idSuffix}`,
    health: 10,
    baseAttack: 1,
    moveRange: 4,
    weapon: fists,
    isEnemy: true,
    threeObjLoaderKey: SKELETON,
  };
}

export function registerEntity(entity: GameEntity): GameEntity {
  entities[entity.id] = entity;
  return entity;
}

export function getEntity(id: string): GameEntity | undefined {
  return entities[id];
}

export function getAnimationController(
  id: string,
): AnimationController | undefined {
  return animationControllers[id];
}

export function getThreeObj(
  scene: THREE.Scene,
  id: string,
): THREE.Group | undefined {
  return scene.getObjectByName(id) as THREE.Group;
}

export function updateAllAnimations(timeElapsedS: number) {
  const keys = Object.keys(entities);
  for (let i = 0; i < keys.length; i++) {
    animationControllers[keys[i]].mixer.update(timeElapsedS);
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
  async [HERO](scene: THREE.Scene, entity: GameEntity): Promise<THREE.Group> {
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
    animationControllers[entity.id] = {
      mixer,
      animations,
    };
    animations["idle"].action.play();
    mixer.update(0);
    return fbx;
  },

  async [SKELETON](
    scene: THREE.Scene,
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
    animationControllers[entity.id] = {
      mixer,
      animations,
    };
    animations["idle"].action.play();
    mixer.update(0);
    console.log(animationControllers);
    return fbx;
  },
};

export function loadThreeObj(
  scene: THREE.Scene,
  entity: GameEntity,
): Promise<THREE.Group> {
  return threeObjLoaders[entity.threeObjLoaderKey](scene, entity);
}
