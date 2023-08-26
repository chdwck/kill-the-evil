import { Vector3 } from "three";

export function midpoint3(start: Vector3, end: Vector3): Vector3 {
  return new Vector3(
    (start.x + end.x) / 2,
    (start.y + end.y) / 2,
    (start.z + end.z) / 2,
  );
}
