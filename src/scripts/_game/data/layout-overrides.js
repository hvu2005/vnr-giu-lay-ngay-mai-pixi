/**
 * Dời chỗ vật thể bằng tay — chỉ dùng khi vị trí sinh tự động lệch với nền.
 *
 * Sprite cắt từ chính ảnh master của cảnh nên vị trí trong
 * `layout.generated.json` đã trùng pixel; bảng này để trống. Khi cần: mở game
 * với `?edit`, kéo thả vật, bấm P rồi dán bảng in ra console vào đây.
 *
 * @type {Record<string, Record<string, { x: number, y: number }>>}
 */
export const LAYOUT_OVERRIDES = {};
