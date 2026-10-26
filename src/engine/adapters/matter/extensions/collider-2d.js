import { Bodies, Body, Sleeping } from "matter-js";

/**
 * @typedef {import("matter-js").IChamferableBodyDefinition & {
 *   x?: number,
 *   y?: number,
 *   width?: number,
 *   height?: number
 * }} Collider2dOptions
 */

export class Collider2d {
    /**
     * @param {import("../../pixi/extensions/pixi-object").PixiObject} owner
     * @param {Collider2dOptions} options
     */
    constructor(owner, options = {}) {
        this.owner = owner;

        const defaultOptions = {
            x: owner?.position?.x ?? 0,
            y: owner?.position?.y ?? 0,
            width: 100,
            height: 100,
            render: {
                strokeStyle: "#00ff00",
                lineWidth: 3,
                fillStyle: "transparent",
            }
        };

        /** @type {Collider2dOptions} */
        const mergedOptions = {
            ...defaultOptions,
            ...options,
        };

        const {
            x,
            y,
            width,
            height,
            ...bodyOptions
        } = mergedOptions;

        this._isSyncedToPhysics = false;

        this.body = Bodies.rectangle(
            x,
            y,
            width,
            height,
            bodyOptions
        );
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    setPosition(x, y) {
        Body.setPosition(this.body, { x, y });
        if (this.owner) {
            this.owner.position.set(x, y);
        }
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    setVelocity(x, y) {
        Body.setVelocity(this.body, { x, y });
    }

    /**
     * @param {number} angle
     */
    setAngle(angle) {
        Body.setAngle(this.body, angle);
    }

    /**
     * 
     * @param {number} x 
     * @param {number} y 
     */
    scale(x, y) {
        Body.scale(this.body, x, y);
    }

    /**
     * @param {boolean} value
     */
    setStatic(value) {
        Body.setStatic(this.body, value);
    }

    get position() {
        return this.body.position;
    }

    get angle() {
        return this.body.angle;
    }

    get x() {
        return this.body.position.x;
    }

    get y() {
        return this.body.position.y;
    }


    /**
     * Sync Pixi object position từ physics body
     * Gọi sau khi physics engine update
     */
    syncFromPhysics() {
        if (!this._isSyncedToPhysics) {
            Body.setStatic(this.body, false);
            Sleeping.set(this.body, false);
            this._isSyncedToPhysics = true;
        }

        const worldX = this.body.position.x;
        const worldY = this.body.position.y;

        if (this.owner.parent) {
            const localPos = this.owner.parent.toLocal({
                x: worldX,
                y: worldY,
            });

            this.owner.position.set(localPos.x, localPos.y);
        } else {
            this.owner.position.set(worldX, worldY);
        }

        this.owner.rotation = this.body.angle;

    }

    /**
     * Sync physics body position từ Pixi object
     * Gọi khi Pixi object position thay đổi trực tiếp
     */
    syncToPhysics() {
        Body.setPosition(this.body, this.owner.position);
        Body.setAngle(this.body, this.owner.rotation);

        if (this._isSyncedToPhysics) {
            Body.setStatic(this.body, true);
            this._isSyncedToPhysics = false;
        }

    }
}