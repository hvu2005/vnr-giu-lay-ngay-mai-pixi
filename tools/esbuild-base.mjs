// Phần cấu hình esbuild dùng chung cho HAI đường build.
//
//   · `build.js`             — dev server, bundle ra `dist/main.js`
//   · `tools/build-levels.mjs` — bundle mỗi level một file `dist/lv<n>.js`
//
// Để riêng ra vì bảng `loader` là thứ dễ quên nhất: thêm một đuôi file mới mà
// chỉ sửa một bên thì bản playable im lặng thiếu asset, còn dev server vẫn chạy
// ngon — kiểu lỗi chỉ lộ ra lúc nộp bài.

/**
 * Đuôi file → cách esbuild nhúng.
 *
 * @type {Record<string, import("esbuild").Loader>}
 */
export const LOADER = {
    ".png": "dataurl",
    ".jpg": "dataurl",
    ".jpeg": "dataurl",
    // `asset-types.js` đã nhận .webp là texture từ trước, chỉ thiếu dòng
    // này nên esbuild không nhúng được. Bộ ảnh màn THẮNG dùng webp: con vịt
    // 324×520 nặng 210 KB ở PNG, còn 33 KB ở webp q90 — cùng số pixel.
    ".webp": "dataurl",
    ".gif": "dataurl",
    // Font không đi qua `drop-assets-in-me/` được: `asset-types.js` của
    // engine không khai đuôi font và file đó không được sửa. Nên font nằm
    // ở `src/assets/font/` và được import thẳng — chỉ cần loader ở đây.
    ".woff2": "dataurl",
    ".woff": "dataurl",
    ".ttf": "dataurl",
    ".glb": "dataurl",
    ".gltf": "dataurl",
    ".mp3": "dataurl",
    ".json": "json",
    ".atlas": "text",
    ".glsl": "text",
    ".frag": "text",
    ".vert": "text",
    ".fbx": "dataurl",
    ".obj": "dataurl",
    ".stl": "dataurl",
    ".txt": "dataurl",
};

/**
 * Mọi thứ không phụ thuộc vào việc đang build cái gì.
 *
 * Cố ý KHÔNG có `entryPoints` / `outfile` / `define` / `plugins` — bốn thứ đó
 * mỗi đường build tự khai, và để trống ở đây thì không ai vô tình thừa hưởng
 * nhầm của bên kia.
 *
 * @type {import("esbuild").BuildOptions}
 */
export const BASE = {
    bundle: true,
    sourcemap: false,
    format: "iife",
    target: ["es2021"],
    minify: true,
    treeShaking: true,
    legalComments: "none",
    splitting: false,
    loader: LOADER,
};
