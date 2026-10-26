/**
 * Bảng ánh xạ ĐUÔI FILE → LOẠI ASSET → HÀM LOAD.
 *
 * File này KHÔNG import gì cả — cố ý, vì nó phải chạy được ở hai nơi:
 *  · trong node, bởi `auto-assets.js` lúc sinh code (build-time)
 *  · trong browser, nếu game muốn tra cứu loại của một asset
 *
 * Thêm định dạng mới = thêm một dòng ở đây, không phải sửa ba chỗ.
 */

/** @type {Record<string, string>} */
export const EXTENSION_TYPE = {
    glb: "model",
    gltf: "model",

    png: "texture",
    jpg: "texture",
    jpeg: "texture",
    webp: "texture",

    mp3: "audio",
    wav: "audio",
    ogg: "audio",

    json: "json",

    txt: "text",
    atlas: "text",
    glsl: "text",
    frag: "text",
    vert: "text",
};

/**
 * Loại asset → các hàm load khả dĩ, XẾP THEO ĐỘ ƯU TIÊN.
 *
 * `auto-assets.js` chọn mục đầu tiên có `flag` đang bật rồi sinh đúng một dòng
 * `import` cho nó. Mảng rỗng = dùng `passthrough` (esbuild đã nhúng sẵn giá trị,
 * không cần decode gì thêm).
 *
 * ── VÌ SAO ĐỂ Ở ĐÂY MÀ KHÔNG PHẢI MỘT REGISTRY RUNTIME ──────────────────────
 *
 * Bản đầu có `asset-loaders.js` chọn loader lúc chạy bằng `if (__THREE__)
 * { require(...) }`. Nó ĐÚNG về mặt cờ nhưng vẫn lãng phí: `__THREE__` bật là
 * `GLTFLoader` (41.7 KB) vào bundle kể cả khi trong `drop-assets-in-me/` KHÔNG
 * có file .glb nào.
 *
 * Generator thì biết cả hai thứ — cờ VÀ danh sách asset thật — nên nó quyết
 * định chuẩn hơn: không có model thì không sinh import model. Đổi lại, quyết
 * định về cờ chuyển hẳn sang build-time; file sinh ra không đọc `__FLAG__` nào.
 *
 * @type {Record<string, Array<{ flag: string, module: string, fn: string }>>}
 */
export const TYPE_LOADERS = {
    model: [
        { flag: "__THREE__", module: "../adapters/three/load/load-model", fn: "loadModel" },
    ],
    texture: [
        { flag: "__PIXI__", module: "../adapters/pixi/load/load-texture", fn: "loadPixiTexture" },
        { flag: "__THREE__", module: "../adapters/three/load/load-texture", fn: "loadThreeTexture" },
    ],
    audio: [],
    json: [],
    text: [],
};

/**
 * Loại asset → tiền tố của key.
 *
 * Nhờ nó mà nhìn `MODEL_Dice` là biết ngay đang cầm cái gì, và gõ `IMG_` trong
 * IDE là ra danh sách toàn bộ ảnh. Đổi quy ước = sửa đúng bảng này.
 *
 * @type {Record<string, string>}
 */
export const TYPE_PREFIX = {
    model: "MODEL_",
    texture: "IMG_",
    audio: "SND_",
    json: "DATA_",
    text: "TXT_",
};

/**
 * Tên file → phần thân của key: mọi ký tự không hợp lệ trong định danh JS
 * (khoảng trắng, gạch ngang, dấu tiếng Việt, ngoặc…) thành `_`.
 *
 * Có gộp chuỗi `_` liên tiếp và cắt `_` ở hai đầu — không gộp thì
 * `"cube - red (1).png"` ra `IMG_cube___red__1_`, đọc rất khó. Bỏ hai lệnh
 * `replace` cuối nếu muốn giữ đúng một-đổi-một.
 *
 * @param {string} baseName tên file, KHÔNG kèm đuôi
 */
export function sanitizeName(baseName) {
    return baseName
        .replace(/[^a-zA-Z0-9_$]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");
}

/**
 * Key cuối cùng của một asset: `PREFIX_ + tên đã làm sạch`.
 *
 * Tiền tố nằm trong key nên `logo.png` và `logo.glb` KHÔNG đụng nhau
 * (`IMG_logo` vs `MODEL_logo`); chỉ trùng cả tên lẫn loại mới cần hậu tố số,
 * việc đó do `auto-assets.js` lo.
 *
 * @param {string} baseName
 * @param {string} type
 */
export function keyOf(baseName, type) {
    const body = sanitizeName(baseName) || "asset";

    return (TYPE_PREFIX[type] ?? "") + body;
}

/**
 * @param {string} fileName
 * @returns {string} đuôi file, viết thường, không có dấu chấm
 */
export function extensionOf(fileName) {
    const dot = fileName.lastIndexOf(".");
    return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
}

/**
 * @param {string} fileName
 * @returns {string | null} loại asset, hoặc null nếu đuôi chưa được hỗ trợ
 */
export function typeOf(fileName) {
    return EXTENSION_TYPE[extensionOf(fileName)] ?? null;
}

/**
 * Loader đầu tiên dùng được với bộ cờ hiện tại.
 *
 * @param {string} type
 * @param {Record<string, string | boolean>} flags nội dung module-config.json
 * @returns {{ flag: string, module: string, fn: string } | null}
 */
export function resolveLoader(type, flags) {
    const candidates = TYPE_LOADERS[type] ?? [];

    return candidates.find((c) => String(flags[c.flag]) === "true") ?? null;
}

/**
 * Loại này có load được không với bộ cờ hiện tại?
 *
 * Không có candidate nào = `passthrough`, luôn dùng được (json, text, audio).
 * Có candidate mà không cờ nào bật = phải bỏ asset, vì nhúng vào cũng vô dụng.
 *
 * @param {string} type
 * @param {Record<string, string | boolean>} flags
 */
export function isTypeEnabled(type, flags) {
    const candidates = TYPE_LOADERS[type] ?? [];

    return candidates.length === 0 || resolveLoader(type, flags) !== null;
}

/**
 * @param {string} type
 * @returns {string[]} tên các cờ có thể bật để dùng được loại này
 */
export function requiredFlags(type) {
    return (TYPE_LOADERS[type] ?? []).map((c) => c.flag);
}
