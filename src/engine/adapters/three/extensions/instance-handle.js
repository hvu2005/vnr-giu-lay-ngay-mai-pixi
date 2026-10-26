import { Color, Matrix4, Quaternion, Vector3 } from "three";

const HIDDEN_MATRIX = new Matrix4().makeScale(0, 0, 0);
const _composeMatrix = new Matrix4();

/**
 * Một slot instance trong InstancedMeshRenderer.
 *
 * Handle giữ bản sao matrix/color của chính nó nên khi index bị đổi
 * (swap-remove) chỉ cần ghi lại, không phải đọc ngược từ buffer.
 */
export class InstanceHandle {
    /**
     * @param {object} group
     * @param {number} index
     */
    constructor(group, index) {
        this.group = group;
        this.index = index;

        /** Gắn entity sở hữu handle này (để raycast tra ngược) */
        this.userData = null;

        this.matrix = new Matrix4();
        this.color = new Color(0xffffff);

        this._visible = true;
    }

    get key() {
        return this.group.key;
    }

    get visible() {
        return this._visible;
    }

    /**
     * @param {Matrix4} matrix
     */
    setMatrix(matrix) {
        this.matrix.copy(matrix);
        this._writeMatrix();

        return this;
    }

    /**
     * @param {Vector3} position
     * @param {Quaternion} quaternion
     * @param {Vector3} scale
     */
    setTransform(position, quaternion, scale) {
        _composeMatrix.compose(position, quaternion, scale);

        return this.setMatrix(_composeMatrix);
    }

    /**
     * @param {number | Color} color
     */
    setColor(color) {
        this.color.set(color);
        this._writeColor();

        return this;
    }

    /**
     * Ẩn bằng matrix scale 0 — không đổi index, không phá mảng dense.
     *
     * @param {boolean} value
     */
    setVisible(value) {
        if (this._visible === value) return this;

        this._visible = value;
        this._writeMatrix();

        return this;
    }

    release() {
        this.group.renderer.release(this);
    }

    /**
     * @private Gọi khi index đổi do swap-remove
     */
    _writeAll() {
        this._writeMatrix();
        this._writeColor();
    }

    /**
     * @private
     */
    _writeMatrix() {
        this.group.mesh.setMatrixAt(this.index, this._visible ? this.matrix : HIDDEN_MATRIX);
        this.group.dirtyMatrix = true;
    }

    /**
     * @private
     */
    _writeColor() {
        this.group.mesh.setColorAt(this.index, this.color);
        this.group.dirtyColor = true;
    }
}
