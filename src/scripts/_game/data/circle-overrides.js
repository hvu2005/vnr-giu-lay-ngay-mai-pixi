/**
 * Khung vòng khoanh riêng cho vật mà khung sprite không hợp để khoanh (px thiết
 * kế 1376×768, `{ x, y, w, h }` như layout). Mặc định vòng ôm khung sprite —
 * xem `_shared/circle-mark.js`.
 *
 * @type {Record<string, Record<string, { x: number, y: number, w: number, h: number }>>}
 */
export const CIRCLE_OVERRIDES = {
    s01: {
        // Sprite cờ gồm cả cán dài xuống tận mép dưới cảnh → vòng ôm cả khung
        // thành vòng khổng lồ trùm người cầm cờ. Khoanh mảnh vải + đầu cán.
        O1: { x: 0, y: 190, w: 235, h: 345 },
    },
};
