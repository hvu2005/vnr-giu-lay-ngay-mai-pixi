import { Engine, Events, World } from "matter-js";
import { PhysicsPort } from "../../ports/physics";
import { Collider2d } from "./extensions/collider-2d";

// Phần debug (matter `Render`) nằm ở ./debug-render.js cho đối xứng với cannon
// và để file này chỉ còn logic mô phỏng.

/**
 * @implements {PhysicsPort}
 */
export class MatterPhysics extends PhysicsPort {
    constructor() {
        super();

        this.engine = Engine.create({ enableSleeping: true });
        this.world = this.engine.world;

        this.fixedDt = 1 / 60;
        this.accumulator = 0;

        this.bodyToCollider = new Map();
    }

    /**
     * @override
     */
    async init() {
        this._setupCollisionEvents();
    }

    /**
     * @override
     * @param {number} width
     * @param {number} height
     */
    resize(width, height) {
        this._debugRenderer?.resize?.(width, height);
    }

    /**
     * @override
     * @param {import("../pixi/extensions/pixi-object").PixiObject} owner
     * @param {import("./extensions/collider-2d").Collider2dOptions} options
     * @returns {Collider2d}
     */
    createCollider(owner, options) {
        return new Collider2d(owner, options);
    }

    /**
     * @override
     * @param {number} dt
     */
    update(dt) {
        this.accumulator += dt;

        while (this.accumulator >= this.fixedDt) {
            Engine.update(this.engine, this.fixedDt * 1000);
            this.accumulator -= this.fixedDt;
        }

        this._debugRenderer?.render(this.world.bodies);
    }

    /**
     * @override
     * @param {Collider2d} collider
     */
    add(collider) {
        if (!collider || !collider.body) return;

        World.add(this.world, collider.body);
        this.bodyToCollider.set(collider.body, collider);

        collider.physics = this;

        return collider;
    }

    /**
     * @override
     * @param {Collider2d} collider
     */
    remove(collider) {
        if (!collider || !collider.body) return;

        World.remove(this.world, collider.body);
        this.bodyToCollider.delete(collider.body);

        collider.physics = null;
    }

    /**
     * @private
     */
    _setupCollisionEvents() {
        const dispatch = (event, method) => {
            for (const pair of event.pairs) {
                const colA = this.bodyToCollider.get(pair.bodyA);
                const colB = this.bodyToCollider.get(pair.bodyB);

                if (!colA || !colB) continue;

                if (colA.enabled !== false && colA[method]) {
                    colA[method](colB);
                }

                if (colB.enabled !== false && colB[method]) {
                    colB[method](colA);
                }
            }
        };

        Events.on(this.engine, "collisionStart", (e) => dispatch(e, "onCollisionEnter"));
        Events.on(this.engine, "collisionEnd", (e) => dispatch(e, "onCollisionExit"));
        Events.on(this.engine, "collisionActive", (e) => dispatch(e, "onCollisionStay"));
    }

    /**
     * @override
     */
    dispose() {
        super.dispose();

        this.bodyToCollider.clear();
        World.clear(this.world, false);
        Engine.clear(this.engine);
    }
}
