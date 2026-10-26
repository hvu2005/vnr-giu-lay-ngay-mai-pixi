import { Body, Box, Sphere, Plane, ConvexPolyhedron, Trimesh } from "cannon-es";
import {
    Scene,
    WebGLRenderer,
    PerspectiveCamera,
    Mesh,
    MeshBasicMaterial,
    BoxGeometry,
    SphereGeometry,
    PlaneGeometry,
    BufferGeometry,
    Float32BufferAttribute,
    Quaternion,
    Vector3,
} from "three";

/**
 * Vẽ wireframe body của cannon bằng three.
 *
 * Đây là ADAPTER CẦU NỐI — file duy nhất trong `adapters/cannon/` được phép
 * import `three`. Nó chỉ được `require()` trong bootstrap sau HAI lớp cờ
 * (`__CANNON__ && __THREE__`), nên esbuild vẫn loại sạch khi một trong hai tắt.
 *
 * Hợp đồng: `render(bodies)` + `dispose()` — xem `PhysicsPort.setDebugRenderer`.
 */
export class CannonDebugRender {
    /**
     * @param {{
     *   container?: HTMLElement,
     *   camera?: PerspectiveCamera,
     *   color?: number,
     *   sleepColor?: number,
     * }} [options] Truyền `camera` của game vào để wireframe khớp đúng góc nhìn;
     *   không truyền thì tự dựng camera riêng.
     */
    constructor(options = {}) {
        this.container = options.container ?? document.body;

        this.ownCamera = !options.camera;
        this.camera = options.camera
            || new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

        if (this.ownCamera) {
            this.camera.position.set(0, 0, 20);
            this.camera.lookAt(0, 0, 0);
        }

        this.renderer = new WebGLRenderer({ alpha: true, antialias: true });
        this.scene = new Scene();

        /** @type {Map<import("cannon-es").Shape, Mesh>} */
        this.meshes = new Map();

        this.material = new MeshBasicMaterial({
            color: options.color ?? 0x00ff00,
            wireframe: true,
        });

        this.sleepMaterial = new MeshBasicMaterial({
            color: options.sleepColor ?? 0x888888,
            wireframe: true,
        });

        this._tmpVec = new Vector3();
        this._tmpQuat = new Quaternion();

        this._mountCanvas();
    }

    /**
     * @private
     */
    _mountCanvas() {
        const canvas = this.renderer.domElement;

        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearAlpha(0);

        canvas.style.position = "absolute";
        canvas.style.left = "0px";
        canvas.style.top = "0px";
        canvas.style.pointerEvents = "none";
        canvas.style.zIndex = "999999";
        canvas.style.background = "transparent";

        this.container.appendChild(canvas);
    }

    /**
     * @param {number} width kích thước LOGIC
     * @param {number} height
     */
    resize(width, height) {
        this.renderer.setSize(width, height, false);

        this.renderer.domElement.style.width = window.innerWidth + "px";
        this.renderer.domElement.style.height = window.innerHeight + "px";

        if (this.ownCamera) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }
    }

    /**
     * @param {import("cannon-es").Body[]} bodies
     */
    render(bodies) {
        const alive = new Set();

        for (const body of bodies) {
            for (let i = 0; i < body.shapes.length; i++) {
                const shape = body.shapes[i];

                let mesh = this.meshes.get(shape);

                if (!mesh) {
                    const geometry = this._createGeometry(shape);
                    if (!geometry) continue;

                    mesh = new Mesh(geometry, this.material);
                    this.scene.add(mesh);
                    this.meshes.set(shape, mesh);
                }

                alive.add(shape);

                // world transform = body transform * shape offset/orientation
                body.quaternion.vmult(body.shapeOffsets[i], this._tmpVec);

                mesh.position.set(
                    body.position.x + this._tmpVec.x,
                    body.position.y + this._tmpVec.y,
                    body.position.z + this._tmpVec.z,
                );

                const orientation = body.shapeOrientations[i];

                mesh.quaternion.set(
                    body.quaternion.x,
                    body.quaternion.y,
                    body.quaternion.z,
                    body.quaternion.w,
                );

                this._tmpQuat.set(orientation.x, orientation.y, orientation.z, orientation.w);
                mesh.quaternion.multiply(this._tmpQuat);

                mesh.material = body.sleepState === Body.SLEEPING
                    ? this.sleepMaterial
                    : this.material;
            }
        }

        for (const [shape, mesh] of this.meshes) {
            if (alive.has(shape)) continue;

            this.scene.remove(mesh);
            mesh.geometry.dispose();
            this.meshes.delete(shape);
        }

        this.renderer.resetState();
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * @private
     * @param {import("cannon-es").Shape} shape
     */
    _createGeometry(shape) {
        if (shape instanceof Box) {
            const he = shape.halfExtents;
            return new BoxGeometry(he.x * 2, he.y * 2, he.z * 2);
        }

        if (shape instanceof Sphere) {
            return new SphereGeometry(shape.radius, 16, 12);
        }

        if (shape instanceof Plane) {
            return new PlaneGeometry(100, 100, 10, 10);
        }

        if (shape instanceof Trimesh) {
            const geometry = new BufferGeometry();
            geometry.setAttribute("position", new Float32BufferAttribute(Array.from(shape.vertices), 3));
            geometry.setIndex(Array.from(shape.indices));
            geometry.computeVertexNormals();

            return geometry;
        }

        // Cylinder cũng là ConvexPolyhedron nên dùng chung nhánh này
        if (shape instanceof ConvexPolyhedron) {
            const position = [];

            for (const face of shape.faces) {
                for (let i = 1; i < face.length - 1; i++) {
                    const a = shape.vertices[face[0]];
                    const b = shape.vertices[face[i]];
                    const c = shape.vertices[face[i + 1]];

                    position.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
                }
            }

            const geometry = new BufferGeometry();
            geometry.setAttribute("position", new Float32BufferAttribute(position, 3));
            geometry.computeVertexNormals();

            return geometry;
        }

        return null;
    }

    dispose() {
        for (const mesh of this.meshes.values()) {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
        }

        this.meshes.clear();

        this.material.dispose();
        this.sleepMaterial.dispose();

        this.renderer.domElement.remove();
        this.renderer.dispose();
    }
}
