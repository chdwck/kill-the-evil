import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GUI } from "lil-gui";
import Foyer from "./rooms/Foyer";

class ColorGUIHelper {
  private light: THREE.HemisphereLight;
  private prop: keyof THREE.HemisphereLight;

  constructor(light: THREE.HemisphereLight, prop: keyof THREE.HemisphereLight) {
    this.light = light;
    this.prop = prop;
  }

  get value() {
    return `#${(this.light[this.prop] as THREE.Color).getHexString()}`;
  }

  set value(hexString: string) {
    (this.light[this.prop] as THREE.Color).set(hexString);
  }
}
const ASPECT_RATIO = 1920 / 1080;
export class KillTheEvil {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  hero: THREE.Mesh;

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
    this.camera.position.set(75, 20, 0);
    // this.camera.position.set(15, 8, 0);

    this.scene = new THREE.Scene();

    const skyColor = 0xb3ffd7;
    const groundColor = 0xb97a20;
    const light = new THREE.HemisphereLight(skyColor, groundColor, 1);
    this.scene.add(light);

    const controls = new OrbitControls(this.camera, canvas);
    controls.target.set(0, 0, 0);
    controls.update();

    const gui = new GUI();
    gui.addColor(new ColorGUIHelper(light, "color"), "value").name("skyColor");
    gui
      .addColor(new ColorGUIHelper(light, "groundColor"), "value")
      .name("groundColor");
    gui.add(light, "intensity", 0, 2, 0.01);

    const hero = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 2),
      new THREE.MeshPhongMaterial({
        color: 0x808080,
      }),
    );

    hero.position.set(0, 1, 0);
    hero.castShadow = true;
    hero.receiveShadow = true;
    this.scene.add(hero);
    this.hero = hero;
    // this.camera.lookAt(hero.position)

    const foyer = new Foyer(20);
    foyer.addToScene(this.scene, new THREE.Vector3(0, 0, 0))

    this.raf();
    this.initControls();
  }

  initControls() {
    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp") {
        this.hero.position.setX(this.hero.position.x - 1);
      }
      if (e.key === "ArrowDown") {
        this.hero.position.setX(this.hero.position.x + 1);
      }
      if (e.key === "ArrowLeft") {
        this.hero.position.setZ(this.hero.position.z + 1);
      }
      if (e.key === "ArrowRight") {
        this.hero.position.setZ(this.hero.position.z - 1);
      }
      // this.camera.lookAt(this.hero.position)
    });
  }

  raf() {
    requestAnimationFrame(() => {
      this.renderer.render(this.scene, this.camera);
      this.raf();
    });
  }
}

new KillTheEvil();
