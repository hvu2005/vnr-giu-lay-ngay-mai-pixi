import { Scene, WebGLRenderer, PerspectiveCamera, Object3D } from "three";
import { RendererPort } from "../../ports/renderer";

/**
 * @implements {RendererPort}
 */
export class ThreeRenderer extends RendererPort {
    /**
     * @param {{ container?: HTMLElement, context?: WebGL2RenderingContext }} [options]
     *   `container` do bootstrap tiêm — engine cũ tự `document.body.appendChild`
     *   nên không nhúng được vào element khác.
     */
    constructor(options = {}) {
        super();

        this.container = options.container ?? document.body;
        this.context = options.context;

        this.renderer = new WebGLRenderer({
            canvas: this.context?.canvas,
            context: this.context,
            alpha: true,
            antialias: true,
        });

        this.stage = new Scene();
        this.camera = new PerspectiveCamera(45, 1, 0.1, 1000);
    }

    /**
     * @override
     */
    async init() {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearAlpha(0);

        this.camera.position.set(0, 0, 10);
        this.camera.lookAt(0, 0, 0);

        if (!this.context) {
            this.container.appendChild(this.renderer.domElement);
        }
    }

    /**
     * @override
     * @param {number} dt
     */
    update(dt) {
        this.renderer.resetState();
        this.renderer.render(this.stage, this.camera);
    }

    /**
     * @override
     * @param {Object3D} object
     */
    add(object) {
        this.stage.add(object);

        return object;
    }

    /**
     * @override
     * @param {Object3D} object
     */
    remove(object) {
        this.stage.remove(object);

        return object;
    }

    /**
     * @override
     * @param {number} width kích thước LOGIC
     * @param {number} height
     */
    resize(width, height) {
        const renderer = this.renderer;

        // Canvas vẽ ở kích thước logic, CSS kéo lên full màn hình.
        renderer.domElement.style.width = window.innerWidth + "px";
        renderer.domElement.style.height = window.innerHeight + "px";

        renderer.setSize(width, height, false);

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    /**
     * @override
     */
    dispose() {
        this.renderer.dispose();
        this.renderer.domElement.remove();
    }
}
