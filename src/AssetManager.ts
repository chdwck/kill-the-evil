import * as THREE from "three";

import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";

export default class AssetManager {
  loader: FBXLoader;
  scene: THREE.Scene;

  heroObjectName: string | null = null;
  enemyObjectNames: string[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.loader = new FBXLoader();
  }

  getHero(): THREE.Group | null {
    if (!this.heroObjectName) {
      return null;
    }

    return this.scene.getObjectByName(this.heroObjectName) as THREE.Group;
  }

  getEnemy(enemyObjectName: string): THREE.Group | null {
    if (!this.enemyObjectNames.includes(enemyObjectName)) {
      return null;
    }

    return this.scene.getObjectByName(enemyObjectName) as THREE.Group;
  }

  loadHero(onLoad: (hero: THREE.Group) => void) {
    if (this.heroObjectName !== null) {
      onLoad(this.getHero()!);
      return;
    }

    this.loader.setPath("./assets/content/Characters/");
    this.loader.load("DungeonCrawler_Character.fbx", (fbx) => {
      fbx.scale.setScalar(0.01);
      fbx.traverse((c) => {
        c.castShadow = true;
      });

      this.heroObjectName = "hero";
      fbx.name = this.heroObjectName;
      this.scene.add(fbx);
      onLoad(fbx);
    });
  }

  loadSkeleton(onLoad: (name: string, skeleton: THREE.Group) => void) {
    this.loader.setPath("./assets/content/Characters/");
    this.loader.load("skeleton.fbx", (fbx) => {
      fbx.scale.setScalar(0.5);
      fbx.traverse((c) => {
        c.castShadow = true;
      });

      const name = "skel_" + this.enemyObjectNames.length;
      fbx.name = name;
      this.enemyObjectNames.push(name);
      this.scene.add(fbx);
      onLoad(name, fbx);
    });
  }
}
