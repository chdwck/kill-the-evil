import { Vector3, Group, PerspectiveCamera } from "three";
import { MapState, isLineCollidingWithWall } from "./map/rendering";

type ThirdPersonCameraState = {
    currentLookAt: Vector3;
};

export function createThirdPersonCameraState() {
    return {
        currentLookAt: new Vector3(),
    };
}

export function tickThirdPersonCameraFollow(
    state: ThirdPersonCameraState,
    mapState: MapState,
    camera: PerspectiveCamera,
    target: Group,
    timeElapsedS: number,
) {
    const idealOffsetBase = new Vector3(0, 1.5, -3.0);
    let idealOffset = idealOffsetBase.clone();
    let isColliding = false;
    let inc = 0;
    do {
        idealOffset = idealOffsetBase.clone();
        idealOffset.setZ(idealOffsetBase.z + inc);
        idealOffset.applyQuaternion(target.quaternion);
        idealOffset.add(target.position);
        isColliding = isLineCollidingWithWall(mapState, idealOffset, target.position);
        inc += 0.1;
    } while (isColliding && (inc + idealOffsetBase.z) < 0);

    const idealLookAt = new Vector3(0, 10, 50);
    idealLookAt.applyQuaternion(target.quaternion);
    idealLookAt.add(target.position);

    const t = 1.1 - Math.pow(0.001, timeElapsedS);
    camera.position.lerp(idealOffset, t);

    state.currentLookAt.lerp(idealLookAt, t);
    camera.lookAt(state.currentLookAt);
}
