import { World, Vec3, SAPBroadphase } from "cannon-es";
import { PhysicsPort } from "../../ports/physics";
import { Collider3d } from "./extensions/collider-3d";

// ⛔ KHÔNG import "three" ở đây. Engine cũ import cả WebGLRenderer, Scene, Mesh,
//    BoxGeometry… chỉ để vẽ wireframe debug → build `__CANNON__: true,
//    __THREE__: false` là vỡ. Phần đó nằm ở ./debug-render.js, tiêm vào qua
//    `setDebugRenderer()` từ bootstrap.

/**
 * @implements {PhysicsPort}
 */
export class CannonPhysics extends PhysicsPort {
    constructor(options = {}) {
        super();

        this.world = new World({
            gravity: options.gravity ?? new Vec3(0, -9.82, 0),
            allowSleep: true,
        });

        this.world.broadphase = new SAPBroadphase(this.world);

        this.fixedDt = 1 / 60;
        this.accumulator = 0;

        this.bodyToCollider = new Map();
        this.activePairs = new Map();
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
     * @param {import("../three/extensions/three-object").ThreeObject} owner
     * @param {import("./extensions/collider-3d").Collider3dOptions} options
     * @returns {Collider3d}
     */
    createCollider(owner, options) {
        return new Collider3d(owner, options);
    }

    /**
     * @override
     * @param {number} dt
     */
    update(dt) {
        // Vẽ TRƯỚC khi step. Debug của cannon có canvas riêng, vẽ xong là hiện
        // ngay trong frame này — trong khi mesh của three đã được ThreeRenderer
        // render trước đó bằng transform mà game sync từ bước TRƯỚC. Vẽ sau khi
        // step thì wireframe đi trước mesh đúng một bước, nhìn ra ngay ở tốc độ cao.
        //
        // (Debug matter thì ngược lại — nó vẽ vào Graphics trong stage của pixi,
        // chỉ hiện ở frame sau, nên vẽ SAU khi step mới khớp.)
        this._debugRenderer?.render(this.world.bodies);

        this.accumulator += dt;

        while (this.accumulator >= this.fixedDt) {
            this.world.step(this.fixedDt);
            this.accumulator -= this.fixedDt;

            this._emitCollisionStay();
        }
    }

    /**
     * @override
     * @param {Collider3d} collider
     */
    add(collider) {
        if (!collider || !collider.body) return;

        this.world.addBody(collider.body);
        this.bodyToCollider.set(collider.body, collider);

        collider.physics = this;

        return collider;
    }

    /**
     * @override
     * @param {Collider3d} collider
     */
    remove(collider) {
        if (!collider || !collider.body) return;

        this.world.removeBody(collider.body);
        this.bodyToCollider.delete(collider.body);

        for (const [key, pair] of this.activePairs) {
            if (pair[0] === collider || pair[1] === collider) {
                this.activePairs.delete(key);
            }
        }

        collider.physics = null;
    }

    /**
     * @private
     */
    _setupCollisionEvents() {
        this.world.addEventListener("beginContact", (event) => {
            const colA = this.bodyToCollider.get(event.bodyA);
            const colB = this.bodyToCollider.get(event.bodyB);

            if (!colA || !colB) return;

            this.activePairs.set(this._pairKey(event.bodyA, event.bodyB), [colA, colB]);

            if (colA.enabled !== false && colA.onCollisionEnter) {
                colA.onCollisionEnter(colB);
            }

            if (colB.enabled !== false && colB.onCollisionEnter) {
                colB.onCollisionEnter(colA);
            }
        });

        this.world.addEventListener("endContact", (event) => {
            this.activePairs.delete(this._pairKey(event.bodyA, event.bodyB));

            const colA = this.bodyToCollider.get(event.bodyA);
            const colB = this.bodyToCollider.get(event.bodyB);

            if (!colA || !colB) return;

            if (colA.enabled !== false && colA.onCollisionExit) {
                colA.onCollisionExit(colB);
            }

            if (colB.enabled !== false && colB.onCollisionExit) {
                colB.onCollisionExit(colA);
            }
        });
    }

    /**
     * cannon-es không có event "collisionActive" nên stay được suy ra từ các
     * cặp đang contact.
     *
     * @private
     */
    _emitCollisionStay() {
        for (const [colA, colB] of this.activePairs.values()) {
            if (colA.enabled !== false && colA.onCollisionStay) {
                colA.onCollisionStay(colB);
            }

            if (colB.enabled !== false && colB.onCollisionStay) {
                colB.onCollisionStay(colA);
            }
        }
    }

    /**
     * @private
     */
    _pairKey(bodyA, bodyB) {
        return bodyA.id < bodyB.id
            ? bodyA.id + ":" + bodyB.id
            : bodyB.id + ":" + bodyA.id;
    }

    /**
     * @override
     */
    dispose() {
        super.dispose();

        this.bodyToCollider.clear();
        this.activePairs.clear();
    }
}
