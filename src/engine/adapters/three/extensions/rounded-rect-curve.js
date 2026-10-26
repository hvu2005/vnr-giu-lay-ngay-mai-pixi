import { CatmullRomCurve3, Vector3 } from "three";

/**
 * Vòng kín hình chữ nhật bo góc — dùng cho băng chuyền, khỏi phải nhập tay điểm.
 *
 * Hàm này ở `adapters/three/` chứ KHÔNG phải `shared/` vì nó cần
 * `CatmullRomCurve3`. Phần sample (`CurvePathSampler`) thì thuần toán nên ở
 * `shared/` — tách đôi như vậy giữ cho một build 2D thuần không kéo three vào.
 *
 * @param {{ centerY?: number, halfWidth: number, halfHeight: number, cornerRadius: number }} options
 * @returns {CatmullRomCurve3}
 */
export function createRoundedRectCurve(options) {
    const cy = options.centerY ?? 0;
    const hw = options.halfWidth;
    const hh = options.halfHeight;
    const r = Math.min(options.cornerRadius, hw, hh);

    // Đi ngược chiều kim đồng hồ, bắt đầu từ giữa cạnh trên.
    const points = [
        new Vector3(0, cy + hh, 0),
        new Vector3(-(hw - r), cy + hh, 0),
        new Vector3(-hw, cy + hh - r, 0),
        new Vector3(-hw, cy - hh + r, 0),
        new Vector3(-(hw - r), cy - hh, 0),
        new Vector3(hw - r, cy - hh, 0),
        new Vector3(hw, cy - hh + r, 0),
        new Vector3(hw, cy + hh - r, 0),
        new Vector3(hw - r, cy + hh, 0),
    ];

    return new CatmullRomCurve3(points, true, "catmullrom", 0.2);
}
