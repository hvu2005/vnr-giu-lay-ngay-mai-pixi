/**
 * Hợp đồng của mọi engine vật lý.
 *
 * Bản engine cũ KHÔNG có file này: `MatterPhysics` và `CannonPhysics` không kế
 * thừa gì cả, chỉ trùng tên method một cách tình cờ.
 *
 * @abstract
 */
export class PhysicsPort {
    constructor() {
        /**
         * @protected
         * @type {{ render(bodies: *): void, dispose(): void } | null}
         */
        this._debugRenderer = null;
    }

    /**
     * @returns {Promise<void>}
     */
    async init() {
        throw new Error("PhysicsPort.init chưa hiện thực");
    }

    /**
     * Bên trong tự chạy fixed-step accumulator (fixedDt = 1/60).
     *
     * @param {number} dt giây
     */
    update(dt) {
        throw new Error("PhysicsPort.update chưa hiện thực");
    }

    /**
     * @param {number} width
     * @param {number} height kích thước LOGIC
     */
    resize(width, height) {
    }

    /**
     * Tạo collider của engine vật lý đang dùng.
     *
     * Đây là factory chứ không phải để game `new Collider3d(...)` trực tiếp:
     * game import thẳng adapter thì `cannon-es` vào bundle kể cả khi
     * `__CANNON__: false` — cờ mất tác dụng. Qua factory thì chỉ bootstrap
     * chạm adapter, cờ vẫn cắt sạch.
     *
     * @param {*} owner ThreeObject / PixiObject sở hữu collider
     * @param {object} options
     * @returns {*} Collider3d (cannon) hoặc Collider2d (matter)
     */
    createCollider(owner, options) {
        throw new Error("PhysicsPort.createCollider chưa hiện thực");
    }

    /**
     * @param {*} collider phải có `.body`
     * @returns {*} chính collider đó, để gọi chuỗi
     */
    add(collider) {
        throw new Error("PhysicsPort.add chưa hiện thực");
    }

    /**
     * @param {*} collider
     */
    remove(collider) {
        throw new Error("PhysicsPort.remove chưa hiện thực");
    }

    /**
     * Debug renderer tiêm từ bootstrap, KHÔNG import trong file physics.
     * Đây là cách gỡ phụ thuộc `three` ra khỏi `cannon-physics.js`.
     *
     * @param {{ render(bodies: *): void, dispose(): void } | null} renderer
     */
    setDebugRenderer(renderer) {
        this._debugRenderer?.dispose();
        this._debugRenderer = renderer;
    }

    get debug() {
        return !!this._debugRenderer;
    }

    dispose() {
        this._debugRenderer?.dispose();
        this._debugRenderer = null;
    }
}
