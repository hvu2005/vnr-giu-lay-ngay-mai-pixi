import { computeLogicalSize } from "./viewport-policy";

/**
 * COMPOSITION ROOT.
 *
 * File DUY NHẤT trong runtime được đọc `__PIXI__` / `__THREE__` / `__MATTER__`
 * / `__CANNON__` (giá trị đến từ `module.config.json` qua `define` của esbuild),
 * và là file DUY NHẤT trong `domain/` được import `adapters/`.
 *
 * Vì sao vẫn dùng `require()` trong `if (__X__)` chứ không phải registry động:
 * esbuild thay `__THREE__` bằng literal `false` → `if (false) {...}` → DCE xoá
 * sạch cả `require` lẫn cây phụ thuộc. Registry động dùng key runtime thì
 * esbuild không chứng minh được nhánh nào chết → CẢ pixi lẫn three vào bundle.
 */

const MAX_DT = 1 / 20;

/**
 * @param {typeof import("./scene").Scene} SceneClass scene cụ thể của game
 * @param {{
 *   designWidth?: number,
 *   designHeight?: number,
 *   container?: HTMLElement,
 *   context?: WebGL2RenderingContext,
 *   profilerPanel?: number, chỉ có tác dụng khi `__PROFILER__: true` — 0 FPS, 1 MS, 2 MB
 *   debugPhysics?: boolean,
 *   autoStart?: boolean,
 * }} [config]
 * @returns {Promise<{ scene: import("./scene").Scene, start(): void, stop(): void }>}
 */
export async function bootstrap(SceneClass, config = {}) {
    const container = config.container ?? document.body;

    /** @type {Array<*>} */
    const systems = [];
    const ports = {};

    if (__THREE__) {
        const { ThreeRenderer } = require("../adapters/three/three-renderer");
        ports.three = new ThreeRenderer({ container, context: config.context });
        systems.push(ports.three);
    }

    if (__PIXI__) {
        const { PixiRenderer } = require("../adapters/pixi/pixi-renderer");
        ports.pixi = new PixiRenderer({ container, context: config.context });
        systems.push(ports.pixi);
    }

    if (__MATTER__) {
        const { MatterPhysics } = require("../adapters/matter/matter-physics");
        ports.matter = new MatterPhysics();
        systems.push(ports.matter);

        // Debug 2D vẽ bằng Graphics của pixi (chung stage, chung hệ toạ độ logic)
        // → cần cả hai module, giống cặp cannon/three bên dưới.
        if (__PIXI__ && config.debugPhysics) {
            const { MatterDebugRender } = require("../adapters/matter/debug-render");
            ports.matter.setDebugRenderer(new MatterDebugRender({
                renderer: ports.pixi,
            }));
        }
    }

    if (__CANNON__) {
        const { CannonPhysics } = require("../adapters/cannon/cannon-physics");
        ports.cannon = new CannonPhysics();
        systems.push(ports.cannon);

        // Debug của cannon vẽ wireframe bằng three → chỉ nối khi có CẢ HAI module.
        //
        // Lưu ý về bundle: `__THREE__` là compile-time nên khi tắt, cả nhánh này
        // bị DCE xoá. Nhưng `config.debugPhysics` là RUNTIME → khi `__THREE__`
        // bật thì `debug-render.js` vẫn vào bundle dù chạy production với
        // debugPhysics = false. Muốn strip hẳn thì thêm `"__DEBUG__": "false"`
        // vào module-config.json rồi đổi thành `if (__THREE__ && __DEBUG__)`.
        if (__THREE__ && config.debugPhysics) {
            const { CannonDebugRender } = require("../adapters/cannon/debug-render");
            ports.cannon.setDebugRenderer(new CannonDebugRender({
                container,
                camera: ports.three?.camera,
            }));
        }
    }

    let profiler = null;

    // Cờ compile-time, KHÔNG phải `config.profiler` runtime như trước: có cờ thì
    // bản production không ship stats.js. Scene nhận `NULL_PROFILER` thay thế.
    if (__PROFILER__) {
        const { StatsProfiler } = require("../adapters/stats/profiler");
        profiler = new StatsProfiler({ container, panel: config.profilerPanel });
    }

    const scene = new SceneClass({
        systems,
        ports,
        profiler,
        designWidth: config.designWidth ?? 1028,
        designHeight: config.designHeight ?? 783,
    });

    await scene.init();

    const runner = _createRunner(scene);

    if (config.autoStart !== false) {
        runner.start();
    }

    return { scene, ...runner };
}

/**
 * @private Vòng lặp + resize — trước đây nằm trong `scene.js`.
 *
 * @param {import("./scene").Scene} scene
 */
function _createRunner(scene) {
    let frameId = 0;
    let lastTime = 0;

    const applyResize = () => {
        const size = computeLogicalSize(
            window.innerWidth,
            window.innerHeight,
            scene.designWidth,
            scene.designHeight,
        );

        scene.resize(size.width, size.height);
    };

    const loop = (time) => {
        const dt = Math.min((time - lastTime) / 1000, MAX_DT);
        lastTime = time;

        scene.update(dt);

        frameId = requestAnimationFrame(loop);
    };

    return {
        start() {
            if (frameId) return;

            applyResize();
            window.addEventListener("resize", applyResize);

            lastTime = performance.now();
            frameId = requestAnimationFrame(loop);
        },

        stop() {
            if (!frameId) return;

            cancelAnimationFrame(frameId);
            window.removeEventListener("resize", applyResize);
            frameId = 0;
        },
    };
}
