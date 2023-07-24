import * as THREE from "three";

export const W = 0
export const D = 1
export const _ = 2
export type LayoutCell = typeof W | typeof D | typeof _

export default class Foyer {
  // prettier-ignore
  static readonly layout : LayoutCell[] = [
    W, W, W, W, W, D, W, W,
    W, _, _, _, _, _, _, W,
    W, _, _, _, _, _, _, W,
    D, _, _, _, _, _, _, D,
    W, _, _, _, _, _, _, W,
    W, _, _, _, _, _, _, W,
    W, W, W, D, W, W, W, W,
  ];
  static readonly rowLength :number = 8;
  static readonly cellMultiplier : number = 10;
  floor: THREE.Mesh;
  height: number;

  constructor(height: number) {
    const floorHeight = Foyer.rowLength * Foyer.cellMultiplier;
    const floorWidth = Foyer.layout.length / Foyer.rowLength * Foyer.cellMultiplier;
    this.height = height;
    this.floor = new THREE.Mesh(
      new THREE.PlaneGeometry(floorWidth, floorHeight, 1, 1),
      new THREE.MeshPhongMaterial({ color: 0xff00ff }),
    );
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.floor.castShadow = true;

    const topSideWalls = this.getWalls(0, Foyer.rowLength, 1)
    for (let i = 0; i < topSideWalls.length; i++) {
      const [x, width] = topSideWalls[i]
      const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height, 1, 1),
        new THREE.MeshBasicMaterial({ color: 0x00ffff })
      )
      this.floor.add(wall)
      wall.rotation.x = -Math.PI / 2
      wall.rotation.y = Math.PI / 2
      wall.position.y = ((floorHeight - width) / -2) + x;
      wall.position.x = floorWidth / -2;
      wall.position.z = height / 2;
    }

    const bottomSideWalls = this.getWalls(0, Foyer.rowLength, 1)
    for (let i = 0; i < bottomSideWalls.length; i++) {
      const [x, width] = bottomSideWalls[i]
      const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height, 1, 1),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
      )
      this.floor.add(wall)
      wall.rotation.x = -Math.PI / 2
      wall.rotation.y = Math.PI / -2
      wall.position.y = ((floorHeight - width) / 2) - x;
      wall.position.x = floorWidth / 2;
      wall.position.z = height / 2;
    }

    const leftSideWalls = this.getWalls(0, Foyer.layout.length * Foyer.rowLength, Foyer.rowLength);
    for (let i = 0; i < leftSideWalls.length; i++) {
      const [x, width] = leftSideWalls[i]
      const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height, 1, 1),
        new THREE.MeshBasicMaterial({ color: 0xff0055 })
      )
      this.floor.add(wall)
      wall.rotation.x = -Math.PI / 2
      wall.position.z = height / 2;
      wall.position.x = ((floorWidth - width) / 2) - x 
      wall.position.y = floorHeight / -2;
    }
    
    const rightSideWalls = this.getWalls(0, Foyer.layout.length * Foyer.rowLength, Foyer.rowLength);
    for (let i = 0; i < rightSideWalls.length; i++) {
      const [x, width] = rightSideWalls[i]
      const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height, 1, 1),
        new THREE.MeshBasicMaterial({ color: 0xff0055 })
      )
      this.floor.add(wall)
      wall.rotation.x = Math.PI / 2
      wall.position.z = height / 2;
      wall.position.x = ((floorWidth - width) / -2) + x 
      wall.position.y = floorHeight / 2;
    }
  }

  getWalls(start: number, max: number, stride: number) : [number, number][] {
    const walls : [number, number][] = [];
    let wallStart = 0;
    let wallLen = 0;

    for (let i = start; i < max; i += stride) {
      if (Foyer.layout[i] !== W) {
        walls.push([wallStart, wallLen])
        wallStart = wallLen + Foyer.cellMultiplier
        wallLen = 0;
        continue;
      }
      wallLen += Foyer.cellMultiplier;
    }

    if (wallLen > 0) {
        walls.push([wallStart, wallLen])
    }
    
    return walls;
  }

  addToScene(scene: THREE.Scene, position: THREE.Vector3) {
    this.floor.position.set(position.x, 0, position.z);
    scene.add(this.floor);
  }
}
