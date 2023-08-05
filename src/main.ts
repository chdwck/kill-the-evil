import * as THREE from "three";
import GameController from "./GameController";
import { setupKeyboardEventListeners } from "./GameInput";

const ASPECT_RATIO = 1920 / 1080;

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

setupKeyboardEventListeners();

const gameController = new GameController(scene, camera);

let previousRaf: number | undefined;
function raf() {
  requestAnimationFrame((t: number) => {
    if (previousRaf === undefined) {
      previousRaf = t;
    }
    raf();
    renderer.render(scene, camera);
    gameController.update((t - previousRaf) / 1000);
    previousRaf = t;
  });
}
gameController.init().then(() => {
  raf();
});
