import Stats from "stats.js";
import { ProfilerPort } from "../../ports/profiler";

/** Panel của stats.js: 0 = FPS, 1 = MS, 2 = MB (chỉ Chrome). */
export const PANEL = { FPS: 0, MS: 1, MB: 2 };

/**
 * Hiện thực `ProfilerPort` bằng package `stats.js`.
 *
 * File này ở `adapters/` chứ KHÔNG phải `shared/`: nó import một thư viện.
 * Engine cũ để `new Stats()` thẳng trong `scene.js` và lấy từ
 * `three/examples/jsm/libs/stats.module.js` — kéo cả three vào bundle ngay cả
 * khi build `__THREE__: false`.
 *
 * @implements {ProfilerPort}
 */
export class StatsProfiler extends ProfilerPort {
    /**
     * @param {{ container?: HTMLElement, panel?: number }} [options]
     */
    constructor(options = {}) {
        super();

        this.container = options.container ?? document.body;

        this.stats = new Stats();
        this.stats.showPanel(options.panel ?? PANEL.FPS);

        const dom = this.stats.dom;

        dom.style.position = "absolute";
        dom.style.left = "0px";
        dom.style.top = "0px";
        dom.style.zIndex = "1000000";

        this.container.appendChild(dom);
    }

    /**
     * @override
     */
    begin() {
        this.stats.begin();
    }

    /**
     * @override
     */
    end() {
        this.stats.end();
    }

    /**
     * @override
     */
    dispose() {
        this.stats.dom.remove();
    }
}
