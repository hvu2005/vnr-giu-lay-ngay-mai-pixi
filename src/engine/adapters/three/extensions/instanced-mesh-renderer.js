import { Color, Euler, InstancedMesh, Matrix4, Vector3 } from "three";
import { InstanceHandle } from "./instance-handle";

const WHITE = new Color(0xffffff);

const _matrix = new Matrix4();
const _euler = new Euler();
const _center = new Vector3();

/**
 * Gom mọi entity cùng (geometry, material) vào 1 InstancedMesh → 1 draw call.
 *
 * Handle "push" transform vào renderer (khác bản Unity "pull" mỗi LateUpdate),
 * nên entity không đổi transform thì không tốn gì.
 */
export class InstancedMeshRenderer {
    /**
     * @param {import("../three-renderer").ThreeRenderer} three
     */
    constructor(three) {
        this.three = three;
        this.groups = new Map();
    }

    /**
     * Khai báo 1 nhóm. Gọi lúc load, không gọi trong gameplay.
     *
     * `source` nhận cả **model** (gltf / Object3D / Mesh), không chỉ BufferGeometry:
     * lúc đó geometry của mesh đầu tiên được lấy ra và **bake `matrixWorld`** —
     * node trong file .glb hay có scale + lệch pivot riêng, đọc thẳng
     * `mesh.geometry` là ra toạ độ thô sai cả trăm lần. Material lấy luôn của
     * model nếu không truyền `material`.
     *
     * @param {string} key
     * @param {{
     *   source?: import("three").BufferGeometry | import("three").Object3D | { scene: import("three").Object3D },
     *   geometry?: import("three").BufferGeometry | import("three").Object3D | { scene: import("three").Object3D },
     *   material?: import("three").Material,
     *   capacity?: number,
     *   castShadow?: boolean,
     *   receiveShadow?: boolean,
     *   center?: boolean,
     *   rotation?: { x?: number, y?: number, z?: number },
     *   scale?: number | { x?: number, y?: number, z?: number },
     * }} options `center` (mặc định true, chỉ áp cho model) dịch khối về gốc;
     *   `rotation` xoay sau khi bake; `scale` nhân thêm, số hoặc theo từng trục.
     */
    define(key, options) {
        if (this.groups.has(key)) {
            console.warn(`[InstancedMeshRenderer] key "${key}" đã define`);
            return this.groups.get(key);
        }

        const resolved = this._resolveSource(options);

        const group = {
            key: key,
            renderer: this,
            geometry: resolved.geometry,
            material: options.material ?? resolved.material,
            capacity: options.capacity ?? 256,
            castShadow: options.castShadow ?? false,
            receiveShadow: options.receiveShadow ?? false,
            mesh: null,
            handles: [],
            dirtyMatrix: false,
            dirtyColor: false,
        };

        group.mesh = this._createMesh(group, group.capacity);
        this.three.add(group.mesh);

        this.groups.set(key, group);

        return group;
    }

    /**
     * @param {string} key
     * @returns {InstanceHandle}
     */
    acquire(key) {
        const group = this.groups.get(key);

        if (!group) {
            console.error(`[InstancedMeshRenderer] chưa define key "${key}"`);
            return null;
        }

        if (group.handles.length >= group.capacity) {
            this._grow(group);
        }

        const handle = new InstanceHandle(group, group.handles.length);

        group.handles.push(handle);
        group.mesh.count = group.handles.length;

        handle._writeAll();

        return handle;
    }

    /**
     * Swap-remove: phần tử cuối lấp vào chỗ trống để mảng luôn dense
     * (three chỉ vẽ [0, count) nên không được để lỗ).
     *
     * @param {InstanceHandle} handle
     */
    release(handle) {
        if (!handle) return;

        const group = handle.group;

        if (group.handles[handle.index] !== handle) {
            console.warn("[InstancedMeshRenderer] handle đã release hoặc không thuộc nhóm");
            return;
        }

        const last = group.handles.pop();

        if (last !== handle) {
            group.handles[handle.index] = last;
            last.index = handle.index;
            last._writeAll();
        }

        group.mesh.count = group.handles.length;
        group.dirtyMatrix = true;

        handle.index = -1;
        handle.userData = null;
    }

    /**
     * Upload buffer. PHẢI gọi cuối ticker, sau mọi thay đổi transform trong frame.
     */
    update() {
        for (const group of this.groups.values()) {
            if (group.dirtyMatrix) {
                group.mesh.instanceMatrix.needsUpdate = true;

                // three chỉ tự tính boundingSphere 1 lần khi nó còn null →
                // không recompute thì instance bay ra ngoài sphere cũ sẽ bị
                // frustum-cull mất hình và raycast không trúng.
                group.mesh.computeBoundingSphere();

                group.dirtyMatrix = false;
            }

            if (group.dirtyColor) {
                group.mesh.instanceColor.needsUpdate = true;
                group.dirtyColor = false;
            }
        }
    }

    /**
     * @param {string} key
     */
    getMesh(key) {
        return this.groups.get(key)?.mesh ?? null;
    }

    /**
     * instanceId từ raycast → handle
     *
     * @param {string} key
     * @param {number} instanceId
     */
    getHandle(key, instanceId) {
        return this.groups.get(key)?.handles[instanceId] ?? null;
    }

    /**
     * @param {string} key
     */
    releaseAll(key) {
        const group = this.groups.get(key);
        if (!group) return;

        for (const handle of group.handles) {
            handle.index = -1;
            handle.userData = null;
        }

        group.handles.length = 0;
        group.mesh.count = 0;
        group.dirtyMatrix = true;
    }

    dispose() {
        for (const group of this.groups.values()) {
            this.three.remove(group.mesh);
            group.mesh.dispose();
            group.geometry.dispose();
            group.material.dispose();
        }

        this.groups.clear();
    }

    /**
     * @private Đưa `source`/`geometry` (BufferGeometry hoặc model) về 1
     * BufferGeometry + material mặc định.
     *
     * @returns {{ geometry: import("three").BufferGeometry, material: import("three").Material | null }}
     */
    _resolveSource(options) {
        const source = options.source ?? options.geometry;

        if (!source) {
            console.error("[InstancedMeshRenderer] define thiếu source/geometry");
            return { geometry: null, material: null };
        }

        // BufferGeometry thì dùng nguyên, KHÔNG bake/center — nó do người gọi
        // dựng nên toạ độ đã là cái họ muốn.
        if (source.isBufferGeometry) {
            return { geometry: source, material: null };
        }

        const root = source.isObject3D ? source : source.scene;

        if (!root?.isObject3D) {
            console.error("[InstancedMeshRenderer] source không phải BufferGeometry, Object3D hay gltf");
            return { geometry: null, material: null };
        }

        root.updateMatrixWorld(true);

        /** @type {import("three").Mesh | null} */
        let mesh = null;
        let meshCount = 0;

        root.traverse((child) => {
            if (!child.isMesh) return;

            meshCount++;
            if (!mesh) mesh = child;
        });

        if (!mesh) {
            console.error("[InstancedMeshRenderer] model không có mesh nào");
            return { geometry: null, material: null };
        }

        if (meshCount > 1) {
            console.warn(`[InstancedMeshRenderer] model có ${meshCount} mesh, instanced chỉ vẽ mesh đầu`);
        }

        // Bake transform của node vào vertex: InstancedMesh nằm trực tiếp trong
        // scene nên transform của node cha trong file .glb sẽ bị mất.
        const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);

        if (options.rotation) {
            _euler.set(options.rotation.x ?? 0, options.rotation.y ?? 0, options.rotation.z ?? 0);
            geometry.applyMatrix4(_matrix.makeRotationFromEuler(_euler));
        }

        if (options.center !== false) {
            geometry.computeBoundingBox();
            geometry.boundingBox.getCenter(_center);
            geometry.applyMatrix4(_matrix.makeTranslation(-_center.x, -_center.y, -_center.z));
        }

        if (options.scale !== undefined && options.scale !== null) {
            const scale = options.scale;

            geometry.applyMatrix4(
                typeof scale === "number"
                    ? _matrix.makeScale(scale, scale, scale)
                    : _matrix.makeScale(scale.x ?? 1, scale.y ?? 1, scale.z ?? 1),
            );
        }

        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

        // Material clone: `dispose()` của renderer sẽ dispose material của nhóm,
        // mà material này là của ASSET dùng chung — không clone là dispose xong
        // model gốc mất luôn material.
        const material = Array.isArray(mesh.material)
            ? mesh.material[0].clone()
            : mesh.material.clone();

        if (Array.isArray(mesh.material)) {
            console.warn("[InstancedMeshRenderer] model có nhiều material, chỉ dùng material đầu");
        }

        return { geometry, material };
    }

    /**
     * @private
     */
    _createMesh(group, capacity) {
        const mesh = new InstancedMesh(group.geometry, group.material, capacity);

        mesh.count = 0;
        mesh.castShadow = group.castShadow;
        mesh.receiveShadow = group.receiveShadow;

        // setColorAt lần đầu mới cấp phát instanceColor; mảng khởi tạo bằng 0
        // (= đen) nên phải fill trắng trước.
        for (let i = 0; i < capacity; i++) {
            mesh.setColorAt(i, WHITE);
        }

        return mesh;
    }

    /**
     * @private InstancedMesh cố định capacity lúc construct → tràn thì tạo mesh mới x2.
     */
    _grow(group) {
        const capacity = group.capacity * 2;
        const mesh = this._createMesh(group, capacity);

        mesh.instanceMatrix.array.set(group.mesh.instanceMatrix.array);
        mesh.instanceColor.array.set(group.mesh.instanceColor.array);
        mesh.count = group.mesh.count;

        this.three.remove(group.mesh);
        group.mesh.dispose();
        this.three.add(mesh);

        group.mesh = mesh;
        group.capacity = capacity;
        group.dirtyMatrix = true;
        group.dirtyColor = true;

        console.warn(`[InstancedMeshRenderer] "${group.key}" grow → ${capacity}, nên tăng capacity lúc define`);
    }
}
