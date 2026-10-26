import { Body, Box, Vec3 } from "cannon-es";
import { Vector3, Quaternion } from "three";

/**
 * @typedef {import("cannon-es").BodyOptions & {
 *   x?: number,
 *   y?: number,
 *   z?: number,
 *   width?: number,
 *   height?: number,
 *   depth?: number,
 *   shape?: import("cannon-es").Shape
 * }} Collider3dOptions
 */

export class Collider3d {
    /**
     * @param {import("../../three/extensions/three-object").ThreeObject} owner
     * @param {Collider3dOptions} options
     */
    constructor(owner, options = {}) {
        this.owner = owner;

        const defaultOptions = {
            x: owner?.position?.x ?? 0,
            y: owner?.position?.y ?? 0,
            z: owner?.position?.z ?? 0,
            width: 1,
            height: 1,
            depth: 1,
            mass: 1,
        };

        /** @type {Collider3dOptions} */
        const mergedOptions = {
            ...defaultOptions,
            ...options,
        };

        const {
            x,
            y,
            z,
            width,
            height,
            depth,
            ...bodyOptions
        } = mergedOptions;

        this._isSyncedToPhysics = false;
        this._mass = bodyOptions.mass;

        this._worldPosition = new Vector3();
        this._worldQuaternion = new Quaternion();

        this.body = new Body({
            ...bodyOptions,
            position: new Vec3(x, y, z),
            shape: bodyOptions.shape || new Box(new Vec3(width / 2, height / 2, depth / 2)),
        });
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    setPosition(x, y, z) {
        this.body.position.set(x, y, z);
        this.body.previousPosition.set(x, y, z);
        this.body.interpolatedPosition.set(x, y, z);

        if (this.owner) {
            this.owner.position.set(x, y, z);
        }
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    setVelocity(x, y, z) {
        this.body.velocity.set(x, y, z);
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    setAngularVelocity(x, y, z) {
        this.body.angularVelocity.set(x, y, z);
    }

    /**
     * Euler radian
     *
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    setRotation(x, y, z) {
        this.body.quaternion.setFromEuler(x, y, z);
    }

    /**
     * @param {boolean} value
     */
    setStatic(value) {
        this.body.type = value ? Body.STATIC : Body.DYNAMIC;
        this.body.mass = value ? 0 : this._mass;

        if (value) {
            this.body.velocity.setZero();
            this.body.angularVelocity.setZero();
        }

        this.body.updateMassProperties();
    }

    get position() {
        return this.body.position;
    }

    get quaternion() {
        return this.body.quaternion;
    }

    get x() {
        return this.body.position.x;
    }

    get y() {
        return this.body.position.y;
    }

    get z() {
        return this.body.position.z;
    }

    /**
     * Sync Three object position từ physics body
     * Gọi sau khi physics engine update
     */
    syncFromPhysics() {
        if (!this._isSyncedToPhysics) {
            this.setStatic(false);
            this.body.wakeUp();
            this._isSyncedToPhysics = true;
        }

        const bodyPosition = this.body.position;

        this._worldPosition.set(bodyPosition.x, bodyPosition.y, bodyPosition.z);

        if (this.owner.parent) {
            this.owner.position.copy(this.owner.parent.worldToLocal(this._worldPosition));
        } else {
            this.owner.position.copy(this._worldPosition);
        }

        const bodyQuaternion = this.body.quaternion;

        this.owner.quaternion.set(
            bodyQuaternion.x,
            bodyQuaternion.y,
            bodyQuaternion.z,
            bodyQuaternion.w,
        );
    }

    /**
     * Sync physics body position từ Three object
     * Gọi khi Three object position thay đổi trực tiếp
     */
    syncToPhysics() {
        this.owner.getWorldPosition(this._worldPosition);
        this.owner.getWorldQuaternion(this._worldQuaternion);

        this.body.position.set(
            this._worldPosition.x,
            this._worldPosition.y,
            this._worldPosition.z,
        );

        this.body.quaternion.set(
            this._worldQuaternion.x,
            this._worldQuaternion.y,
            this._worldQuaternion.z,
            this._worldQuaternion.w,
        );

        if (this._isSyncedToPhysics) {
            this.setStatic(true);
            this._isSyncedToPhysics = false;
        }
    }
}
