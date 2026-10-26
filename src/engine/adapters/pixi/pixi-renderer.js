import { Container, WebGLRenderer, Rectangle } from "pixi.js";
import { RendererPort } from "../../ports/renderer";

/**
 * @implements {RendererPort}
 */
export class PixiRenderer extends RendererPort {
    /**
     * @param {{ container?: HTMLElement, context?: WebGL2RenderingContext }} [options]
     */
    constructor(options = {}) {
        super();

        this.container = options.container ?? document.body;
        this.context = options.context;

        this.renderer = new WebGLRenderer();
        this.stage = new Container({ eventMode: "static" });
    }

    /**
     * @override
     */
    async init() {
        await this.renderer.init({
            context: this.context,
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundAlpha: 0,
            clearBeforeRender: true,
        });

        if (!this.context) {
            this.container.appendChild(this.renderer.canvas);
        }

        this.stage.hitArea = this.renderer.screen;
    }

    /**
     * @override
     * @param {number} dt
     */
    update(dt) {
        this.renderer.resetState();
        this.renderer.render(this.stage);
    }

    /**
     * @override
     * @param {import("pixi.js").ContainerChild} object
     */
    add(object) {
        this.stage.addChild(object);

        return object;
    }

    /**
     * Engine cũ THIẾU method này — chỉ `ThreeRenderer` có `remove()`, nên hai
     * renderer "cùng interface" mà khác API và không có gì phát hiện ra.
     *
     * @override
     * @param {import("pixi.js").ContainerChild} object
     */
    remove(object) {
        this.stage.removeChild(object);

        return object;
    }

    /**
     * @override
     * @param {number} width kích thước LOGIC
     * @param {number} height
     */
    resize(width, height) {
        const renderer = this.renderer;

        renderer.canvas.style.width = window.innerWidth + "px";
        renderer.canvas.style.height = window.innerHeight + "px";

        renderer.resize(width, height);
        this.stage.hitArea = new Rectangle(0, 0, width, height);
    }

    /**
     * @override
     */
    dispose() {
        this.renderer.destroy();
    }
}
