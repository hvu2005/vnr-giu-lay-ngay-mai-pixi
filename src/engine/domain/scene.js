import { NULL_PROFILER } from "../ports/profiler";

/**
 * Điều phối các hệ thống. KHÔNG import pixi/three/matter/cannon, KHÔNG đụng
 * `window`/`document`, KHÔNG sở hữu vòng lặp — tất cả nằm ở `bootstrap.js`.
 *
 * Game kế thừa class này và override `startScene()`.
 */
export class Scene {
    /**
     * @param {{
     *   systems?: Array<import("../ports/renderer").RendererPort | import("../ports/physics").PhysicsPort>,
     *   ports?: {
     *     three?: import("../adapters/three/three-renderer").ThreeRenderer,
     *     pixi?: import("../adapters/pixi/pixi-renderer").PixiRenderer,
     *     matter?: import("../adapters/matter/matter-physics").MatterPhysics,
     *     cannon?: import("../adapters/cannon/cannon-physics").CannonPhysics,
     *   },
     *   profiler?: import("../ports/profiler").ProfilerPort | null,
     *   designWidth?: number,
     *   designHeight?: number,
     * }} deps do bootstrap dựng sẵn
     */
    constructor(deps = {}) {
        this.systems = deps.systems ?? [];
        this.ports = deps.ports ?? {};

        /**
         * `NULL_PROFILER` khi build `__PROFILER__: false` — nhờ vậy `update()`
         * gọi thẳng không cần `if`, và domain không phải biết cờ nào cả.
         *
         * @type {import("../ports/profiler").ProfilerPort}
         */
        this.profiler = deps.profiler ?? NULL_PROFILER;

        this.designWidth = deps.designWidth ?? 1028;
        this.designHeight = deps.designHeight ?? 783;

        /** @type {Array<(dt: number) => void>} */
        this.ticker = [];

        /** Kích thước LOGIC hiện tại, cập nhật mỗi lần resize */
        this.width = this.designWidth;
        this.height = this.designHeight;
    }

    /**
     * Bốn getter này giữ nguyên API của engine cũ (`scene.three`, `scene.matter`…)
     * nên `ThreeObject`/`PixiObject` và mọi scene không phải sửa gì.
     *
     * Trả `undefined` khi module bị tắt bằng cờ — game nên kiểm tra sự tồn tại
     * của port (`if (this.cannon)`) chứ KHÔNG đọc cờ `__CANNON__` trực tiếp.
     */
    get three() { return this.ports.three; }
    get pixi() { return this.ports.pixi; }
    get matter() { return this.ports.matter; }
    get cannon() { return this.ports.cannon; }

    async init() {
        for (const system of this.systems) {
            await system.init();
        }

        await this.startScene();
    }

    /**
     * Điểm mở rộng của game. Chạy sau khi mọi hệ thống đã `init()`.
     *
     * @virtual
     * @returns {Promise<void> | void}
     */
    async startScene() {
    }

    /**
     * @param {number} width kích thước LOGIC
     * @param {number} height
     */
    resize(width, height) {
        this.width = width;
        this.height = height;

        // Không cần `?.` nữa: RendererPort/PhysicsPort bảo đảm method tồn tại.
        for (const system of this.systems) {
            system.resize(width, height);
        }

        this.onResize(width, height);
    }

    /**
     * @virtual
     * @param {number} width
     * @param {number} height
     */
    onResize(width, height) {
    }

    /**
     * @param {number} dt giây, bootstrap đã clamp
     */
    update(dt) {
        // begin/end phải KẸP lấy phần việc — khoảng giữa hai lời gọi chính là
        // thứ panel MS hiển thị. Đặt liền nhau thì luôn đo ra ~0ms.
        this.profiler.begin();

        for (const callback of this.ticker) {
            callback(dt);
        }

        for (const system of this.systems) {
            system.update(dt);
        }

        this.profiler.end();
    }

    /**
     * @param {(dt: number) => void} callback
     */
    addUpdate(callback) {
        this.ticker.push(callback);

        return callback;
    }

    /**
     * @param {(dt: number) => void} callback
     */
    removeUpdate(callback) {
        const index = this.ticker.indexOf(callback);

        if (index !== -1) {
            this.ticker.splice(index, 1);
        }
    }

    dispose() {
        for (const system of this.systems) {
            system.dispose();
        }

        this.profiler.dispose();
        this.ticker.length = 0;
    }
}
