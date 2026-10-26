/**
 * Quy đổi kích thước cửa sổ (PIXEL) sang không gian thiết kế (LOGIC).
 *
 * Portrait  → fit width  (giữ nguyên chiều rộng thiết kế, chiều cao co giãn)
 * Landscape → fit height (giữ nguyên chiều cao thiết kế, chiều rộng co giãn)
 *
 * Hàm thuần — không đụng `window`, nên test được trong node.
 *
 * @param {number} windowW
 * @param {number} windowH
 * @param {number} designW
 * @param {number} designH
 * @returns {{ width: number, height: number, scale: number }}
 */
export function computeLogicalSize(windowW, windowH, designW, designH) {
    if (windowW <= windowH) {
        const scale = windowW / designW;
        return { width: designW, height: windowH / scale, scale };
    }

    const scale = windowH / designH;
    return { width: windowW / scale, height: designH, scale };
}
