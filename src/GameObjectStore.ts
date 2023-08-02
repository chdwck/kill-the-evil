import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";

export class Physicalilty {
  health: number;
  attack: number;
  range: number;

  constructor(health: number, attack: number, range: number) {
    this.health = health;
    this.attack = attack;
    this.range = range;
  }
}

abstract class GameObject {
  id: string;
  phys: Physicalilty;
  abstract isEnemy: boolean;

  constructor(id: string, phys: Physicalilty) {
    this.id = id;
    this.phys = phys;
  }
}

class Hero extends GameObject {
  static heroId: string = "h";
  isEnemy: boolean = false;
  constructor() {
    super(Hero.heroId, new Physicalilty(50, 5, 4));
  }
}

class Skeleton extends GameObject {
  isEnemy: boolean = true;

  static skeletonId(suffix: string) {
    return `skel_${suffix}`;
  }

  constructor(idSuffix: string) {
    super(Skeleton.skeletonId(idSuffix), new Physicalilty(10, 5, 4));
  }
}

type Animation = {
  clip: THREE.AnimationClip;
  action: THREE.AnimationAction;
};

type AnimationController = {
  mixer: THREE.AnimationMixer;
  animations: Record<string, Animation>;
};

export default class GameObjectStore {
  private loader: FBXLoader;
  private scene: THREE.Scene;
  private animations: Record<string, AnimationController> = {};
  private entities: Record<string, GameObject>;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.loader = new FBXLoader();
    this.entities = {};
    this.animations = {};
  }

  isEnemy(id: string) : boolean {
    const entity = this.entities[id];
    return entity?.isEnemy;
  }

  getAnimationController(id: string): AnimationController {
    const controller = this.animations[id];
    if (!controller) {
      throw new Error(`${id} does not have an animation controller`);
    }
    return controller;
  }

  getHeroAnimationController() : AnimationController {
    return this.getAnimationController(Hero.heroId);
  }

  getGameObject(id: string): GameObject {
    return this.entities[id];
  }

  getThreeObj(id: string): THREE.Group {
    const obj = this.scene.getObjectByName(id) as THREE.Group;
    if (!obj) {
      throw new Error(`${id} is missing from the scene.`)
    }

    return obj;
  }

  getHero(): Hero {
    return this.getGameObject(Hero.heroId);
  }

  getHeroThreeObj(): THREE.Group {
    return this.getThreeObj(Hero.heroId);
  }

  updateAll(timeElapsedS: number) {
    const keys = Object.keys(this.entities);
    for (let i = 0; i < keys.length; i ++) {
      this.animations[keys[i]].mixer.update(timeElapsedS);
    }
  }

  async createHero(): Promise<Hero> {
    const hero = new Hero();
    this.entities[hero.id] = hero;
    this.loader.setPath("./assets/content/Characters/");
    const fbx = await this.loader.loadAsync("DungeonCrawler_Character.fbx");
    fbx.scale.setScalar(0.01);
    fbx.traverse((c) => {
      c.castShadow = true;
    });

    fbx.name = hero.id;
    this.scene.add(fbx);
    const animations: Record<string, Animation> = {};
    const mixer = new THREE.AnimationMixer(fbx);
    const promises: Promise<undefined>[] = [];
    promises.push(this.addAnimation('idle', mixer, animations))
    promises.push(this.addAnimation('run', mixer, animations))
    promises.push(this.addAnimation('walk', mixer, animations))
    promises.push(this.addAnimation('walkback', mixer, animations))
    promises.push(this.addAnimation('dance', mixer, animations))
    await Promise.all(promises);
    this.animations[hero.id] = {
      mixer,
      animations,
    };
    animations['idle'].action.play();
    mixer.update(0)
    return hero;
  }

  private async addAnimation(
    name: string,
    mixer: THREE.AnimationMixer,
    animations: Record<string, Animation>,
  ): Promise<undefined> {
    const anim = await this.loader.loadAsync(`${name}.fbx`);
    const clip = anim.animations[0];
    animations[name] = {
      clip,
      action: mixer.clipAction(clip),
    };
  }

  async createSkeleton(): Promise<Skeleton> {
    const idSuffix = Object.keys(this.entities).length.toString();
    const skeleton = new Skeleton(idSuffix);
    this.entities[skeleton.id] = skeleton;

    this.loader.setPath("./assets/skeleton/");
    const fbx = await this.loader.loadAsync("skeleton.fbx");
    fbx.scale.setScalar(0.3);
    fbx.traverse((c) => {
      c.castShadow = true;
    });

    fbx.name = skeleton.id;
    this.scene.add(fbx);
    const animations: Record<string, Animation> = {};
    const mixer = new THREE.AnimationMixer(fbx);
    const promises: Promise<undefined>[] = [];
    promises.push(this.addAnimation('idle', mixer, animations))
    promises.push(this.addAnimation('walk', mixer, animations))
    await Promise.all(promises);
    this.animations[skeleton.id] = {
      mixer,
      animations,
    };
    animations['idle'].action.play();
    mixer.update(0)
    return skeleton;
  }
}
