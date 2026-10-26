/**
 * Loader mặc định cho những loại không cần thư viện nào.
 *
 * `.json` đã được esbuild parse thành object, `.txt`/`.glsl`/`.atlas` thành
 * chuỗi, `.mp3` thành data-url để game tự đưa vào Howl — cả ba đều dùng được
 * ngay, chỉ cần trả lại đúng giá trị.
 *
 * File này KHÔNG import adapter và KHÔNG đọc cờ `__FLAG__`: việc chọn loader
 * cho model/texture do `auto-assets.js` quyết lúc sinh code, xem `asset-types.js`.
 *
 * @param {*} src
 */
export async function passthrough(src) {
    return src;
}
