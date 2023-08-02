import * as THREE from "three";
import GameController from "./GameController";

const ASPECT_RATIO = 1920 / 1080;
export class KillTheEvil {
  gameController: GameController;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  previousRaf: number | null = null;

  constructor() {
    const width = window.innerWidth;
    const height = width / ASPECT_RATIO;
    const canvas = document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;
    document.body.appendChild(canvas);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 1000.0;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

    this.scene = new THREE.Scene();

    const light = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.0);
    this.scene.add(light);

    this.gameController = new GameController(this.scene, this.camera);

    this.gameController.init().then(() => {
      this.raf();
    });
  }

  raf() {
    requestAnimationFrame((t: number) => {
      if (this.previousRaf === null) {
        this.previousRaf = t;
      }
      this.raf();
      this.renderer.render(this.scene, this.camera);
      this.gameController.update((t - this.previousRaf) / 1000);
      this.previousRaf = t;
    });
  }
}

new KillTheEvil();
