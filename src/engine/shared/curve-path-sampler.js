/**
 * Bake 1 curve thành polyline cách đều theo cung, rồi sample theo khoảng cách.
 *
 * KHÔNG import `three`. Bản trong engine cũ dùng `Vector3` của three, mà file
 * này lại nằm ở `shared/` và được re-export từ `index.js` → three vào bundle
 * kể cả khi build `__THREE__: false` (đo được: +240 KB cho một bản 2D thuần).
 *
 * Cách gỡ: mọi phép toán làm trên object dạng `{ x, y, z }` bằng hàm cục bộ.
 * `THREE.Vector3` vẫn dùng được vì nó CHÍNH LÀ `{ x, y, z }` — API không đổi,
 * chỉ là file này không còn biết three tồn tại.
 *
 * @typedef {{ x: number, y: number, z?: number }} Point3
 */

/**
 * @param {Point3} a @param {Point3} b
 */
function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = (a.z ?? 0) - (b.z ?? 0);

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * @param {Point3} out @param {Point3} a @param {Point3} b @param {number} t
 */
function lerpInto(out, a, b, t) {
    out.x = a.x + (b.x - a.x) * t;
    out.y = a.y + (b.y - a.y) * t;
    out.z = (a.z ?? 0) + ((b.z ?? 0) - (a.z ?? 0)) * t;

    return out;
}

/**
 * @param {Point3} out @param {Point3} to @param {Point3} from
 */
function subNormalizeInto(out, to, from) {
    const x = to.x - from.x;
    const y = to.y - from.y;
    const z = (to.z ?? 0) - (from.z ?? 0);

    const length = Math.sqrt(x * x + y * y + z * z);

    if (length > 0) {
        out.x = x / length;
        out.y = y / length;
        out.z = z / length;
    } else {
        out.x = 0;
        out.y = 0;
        out.z = 0;
    }

    return out;
}

export class CurvePathSampler {
    /**
     * @param {{ getSpacedPoints(n: number): Point3[] } | Point3[]} source
     *   Curve của three (bất kỳ thứ gì có `getSpacedPoints`) hoặc mảng điểm sẵn.
     * @param {{ segments?: number, loop?: boolean }} [options]
     */
    constructor(source, options = {}) {
        this.segments = options.segments ?? 256;
        this.loop = options.loop ?? false;

        /** @type {Point3[]} */
        this.points = [];

        /** @type {number[]} cumulative[i] = độ dài từ điểm 0 tới điểm i */
        this.cumulative = [];

        this.totalLength = 0;

        this.rebuild(source);
    }

    /**
     * @param {{ getSpacedPoints(n: number): Point3[] } | Point3[]} source
     */
    rebuild(source) {
        this.points = Array.isArray(source)
            ? source.slice()
            : source.getSpacedPoints(this.segments);

        // Curve closed của three không lặp lại điểm đầu ở cuối → tự thêm để
        // đoạn cuối (điểm cuối → điểm đầu) cũng có độ dài.
        if (this.loop) {
            const first = this.points[0];
            this.points.push({ x: first.x, y: first.y, z: first.z ?? 0 });
        }

        this.cumulative = [0];

        for (let i = 1; i < this.points.length; i++) {
            const step = distance(this.points[i], this.points[i - 1]);
            this.cumulative.push(this.cumulative[i - 1] + step);
        }

        this.totalLength = this.cumulative[this.cumulative.length - 1];

        return this;
    }

    /**
     * @param {number} value
     */
    wrapDistance(value) {
        if (!this.loop) {
            return Math.min(Math.max(value, 0), this.totalLength);
        }

        const length = this.totalLength;

        return ((value % length) + length) % length;
    }

    /**
     * Vị trí + tiếp tuyến tại `value` dọc path.
     *
     * `outPosition` / `outTangent` là out-param (thường là `THREE.Vector3` tái
     * dùng) — không cấp phát gì trong vòng lặp mỗi frame.
     *
     * @param {number} value
     * @param {Point3} outPosition
     * @param {Point3} [outTangent]
     */
    sampleByDistance(value, outPosition, outTangent) {
        const target = this.wrapDistance(value);
        const index = this._findSegment(target);

        const from = this.points[index];
        const to = this.points[index + 1] ?? this.points[index];

        const segmentStart = this.cumulative[index];
        const segmentLength = this.cumulative[index + 1] - segmentStart || 1;
        const t = (target - segmentStart) / segmentLength;

        lerpInto(outPosition, from, to, t);

        if (outTangent) {
            subNormalizeInto(outTangent, to, from);
        }

        return outPosition;
    }

    /**
     * Khoảng cách dọc path của điểm gần `position` nhất — dùng để đổi một điểm
     * world (vd drop point) sang path-space.
     *
     * @param {Point3} position
     */
    findNearestDistance(position) {
        let bestDistance = 0;
        let bestSqr = Infinity;

        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];

            const dx = point.x - position.x;
            const dy = point.y - position.y;
            const dz = (point.z ?? 0) - (position.z ?? 0);

            const sqr = dx * dx + dy * dy + dz * dz;

            if (sqr < bestSqr) {
                bestSqr = sqr;
                bestDistance = this.cumulative[i];
            }
        }

        return bestDistance;
    }

    getBoundsX() {
        let min = Infinity;
        let max = -Infinity;

        for (const point of this.points) {
            if (point.x < min) min = point.x;
            if (point.x > max) max = point.x;
        }

        return { min, max };
    }

    /**
     * @private
     * @param {number} value
     */
    _findSegment(value) {
        let low = 0;
        let high = this.cumulative.length - 1;

        while (low < high - 1) {
            const mid = (low + high) >> 1;

            if (this.cumulative[mid] <= value) low = mid;
            else high = mid;
        }

        return low;
    }
}
