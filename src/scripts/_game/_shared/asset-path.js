import { ASSET } from "../../../engine";
import { ASSET_PATH } from "../../../engine/tooling/assets";

/**
 * Tra asset theo ĐƯỜNG DẪN trong `drop-assets-in-me/`, không theo key.
 *
 * ── VÌ SAO KHÔNG DÙNG THẲNG `ASSET.IMG_x` ──────────────────────────────────
 *
 * Generator đặt key theo TÊN FILE TRẦN, bỏ hết thư mục. Trước khi có level thì
 * điều đó vô hại vì mỗi ảnh một tên. Từ lúc `level-loader/lv9/m/1.png` và
 * `level-loader/lv9/t/1.png` cùng có mặt thì một cái thành `IMG_1`, cái kia
 * `IMG_1_1` — và cái nào nhận hậu tố phụ thuộc THỨ TỰ SẮP XẾP CỦA CẢ THƯ MỤC.
 * Thả thêm một level là key của level cũ đổi chỗ, code viết cứng `IMG_1` hỏng
 * lặng lẽ, không lỗi nào để lần ra.
 *
 * `ASSET_PATH` (đường dẫn → key) sinh ra đúng để chữa việc đó — chính doc của
 * nó bảo dùng nó cho "cây prefab port từ Unity, nơi đường dẫn khớp 1-1 với bên
 * kia". Đây đúng là trường hợp đó.
 *
 * ── VÌ SAO IMPORT TỪ `tooling/assets` CHỨ KHÔNG PHẢI `engine/index` ────────
 *
 * `engine/index.js` quên không re-export `ASSET_PATH` (chỉ có `ASSET`,
 * `ASSET_SKIPPED`, `loadAssets`), mà `src/engine/` là thư mục không được sửa.
 * Import thẳng module SINH RA cũng chính là module mà `index.js` re-export, nên
 * không kéo thêm thư viện nào vào bundle — khác hẳn với việc import một
 * `adapters/*` (điều đó mới làm cờ `__PIXI__`/`__THREE__` mất tác dụng).
 */

/**
 * @param {string} path đường dẫn tương đối tính từ `src/drop-assets-in-me/`,
 *   dùng dấu `/` (ví dụ `"level-loader/lv9/m/1.png"`)
 * @returns {*} giá trị trong `ASSET` — Texture với ảnh, object với .json
 */
export function assetByPath(path) {
    const key = _key(path);

    if (key === undefined) {
        throw new Error(
            `[asset] không có "${path}" trong drop-assets-in-me/. `
            + `Thả file vào rồi chạy lại "npm run app" để sinh lại assets.js.`,
        );
    }

    return ASSET[key];
}

/**
 * @param {string} path
 * @returns {boolean}
 */
export function hasAsset(path) {
    return _key(path) !== undefined;
}

/**
 * @private Tra key, và nếu không thấy thì THỬ LẠI VỚI `.webp`.
 *
 * ── VÌ SAO CẦN BƯỚC THỬ LẠI ────────────────────────────────────────────────
 *
 * `tools/compress-assets.mjs` đổi phần lớn ảnh sang webp — cùng số pixel nhưng
 * nhẹ hơn nhiều lần. Nếu để mọi nơi gọi tự biết đuôi mới thì phải sửa cả
 * `scene-config.js`, `sim-config.js` VÀ `level.json` — mà `level.json` do
 * exporter bên Unity sinh ra, sửa tay là lần xuất sau mất sạch.
 *
 * Nên định dạng lưu trữ là việc của riêng chỗ này: nơi gọi hỏi "ảnh ở
 * đường dẫn này", không hỏi "file png ở đường dẫn này". Nén hay không nén,
 * code gọi không đổi một chữ.
 *
 * Tra ĐÚNG ĐUÔI TRƯỚC: file nào webp lớn hơn thì công cụ giữ nguyên png,
 * nên hai loại sống lẫn nhau trong cùng thư mục.
 *
 * @param {string} path
 * @returns {string | undefined}
 */
function _key(path) {
    const direct = ASSET_PATH[path];

    if (direct !== undefined) return direct;

    const dot = path.lastIndexOf(".");

    if (dot < 0) return undefined;

    const ext = path.slice(dot + 1).toLowerCase();

    if (ext !== "png" && ext !== "jpg" && ext !== "jpeg") return undefined;

    return ASSET_PATH[`${path.slice(0, dot)}.webp`];
}

/**
 * Mọi đường dẫn khớp một mẫu — dùng để DÒ xem có gì trong thư mục, thay vì bắt
 * ai đó khai trước một danh sách.
 *
 * @param {RegExp} pattern
 * @returns {string[]} đã sắp xếp, nên thứ tự ổn định giữa các lần build
 */
export function findAssetPaths(pattern) {
    return Object.keys(ASSET_PATH).filter((path) => pattern.test(path)).sort();
}
