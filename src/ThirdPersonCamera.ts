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
    let zInc = 0;
    do {
        idealOffset = idealOffsetBase.clone();
        idealOffset.setZ(idealOffsetBase.z + zInc);
        idealOffset.applyQuaternion(target.quaternion);
        idealOffset.add(target.position);
        isColliding = isLineCollidingWithWall(
            mapState, idealOffset, target.position);
        zInc += 0.1;
    } while (isColliding && zInc < 3);

    if (Math.abs(target.quaternion.y) > 0.5) {
        let xInc = 1.75;
        while (isColliding && xInc >= -1.75) {
            idealOffset = idealOffsetBase.clone();
            idealOffset.setX(xInc);
            idealOffset.setZ(idealOffsetBase.z + zInc);
            idealOffset.applyQuaternion(target.quaternion);
            idealOffset.add(target.position);
            isColliding = isLineCollidingWithWall(
                mapState, idealOffset, target.position);
            xInc -= 0.1;
        }
    } else {
        let xInc = -1.75;
        while (isColliding && xInc <= 1.75) {
            idealOffset = idealOffsetBase.clone();
            idealOffset.setX(xInc);
            idealOffset.setZ(idealOffsetBase.z + zInc);
            idealOffset.applyQuaternion(target.quaternion);
            idealOffset.add(target.position);
            isColliding = isLineCollidingWithWall(
                mapState, idealOffset, target.position);
            xInc += 0.1;
        }
    }

    const idealLookAt = new Vector3(0, 10, 50);
    idealLookAt.applyQuaternion(target.quaternion);
    idealLookAt.add(target.position);

    const t = 1.1 - Math.pow(0.001, timeElapsedS);
    camera.position.lerp(idealOffset, t);

    state.currentLookAt.lerp(idealLookAt, t);
    camera.lookAt(state.currentLookAt);
}
