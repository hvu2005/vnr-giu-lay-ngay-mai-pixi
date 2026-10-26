import fs from "fs";
import path from "path";
import {
    EXTENSION_TYPE,
    extensionOf,
    isTypeEnabled,
    keyOf,
    requiredFlags,
    resolveLoader,
    typeOf,
} from "./asset-types.js";

/**
 * Quét `src/drop-assets-in-me/` rồi sinh `src/engine/tooling/assets.js`.
 *
 * Chạy: `npm run app` (có watch) hoặc `node src/engine/tooling/auto-assets.js`.
 * `build.js` cũng gọi `generateAssets()` một lần trước khi bundle.
 *
 * ── VÌ SAO GENERATOR PHẢI ĐỌC module-config.json ────────────────────────────
 *
 * Nếu cứ sinh import cho mọi file thì tắt `__THREE__` xong data-url của .glb
 * (thường vài MB, nhúng dạng base64 nên còn phình thêm ~33%) VẪN nằm trong
 * bundle dù không ai load được nó. Loader vô hiệu lúc runtime chỉ chặn được lỗi,
 * không chặn được dung lượng — chỉ khâu sinh code mới chặn được.
 */

const ASSET_DIR = "src/drop-assets-in-me";
const OUTPUT = "src/engine/tooling/assets.js";
const CONFIG_CANDIDATES = ["module-config.json", "module.config.json"];

const watchDir = path.resolve(ASSET_DIR);
const output = path.resolve(OUTPUT);

/**
 * @returns {Record<string, string>}
 */
function readFlags() {
    for (const name of CONFIG_CANDIDATES) {
        const file = path.resolve(name);
        if (fs.existsSync(file)) {
            return JSON.parse(fs.readFileSync(file, "utf8"));
        }
    }

    console.warn(`[assets] không tìm thấy ${CONFIG_CANDIDATES.join(" hay ")} — coi như bật hết`);

    return { __PIXI__: "true", __THREE__: "true", __MATTER__: "true", __CANNON__: "true" };
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function getAllFiles(dir) {
    if (!fs.existsSync(dir)) return [];

    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        return entry.isDirectory() ? getAllFiles(full) : [full];
    });
}

/**
 * Thêm hậu tố số cho tới khi key chưa bị dùng.
 *
 * Vòng `while` chứ không phải `base + "_1"` một phát: thư mục có sẵn `cube.png`
 * VÀ `cube_1.png` thì `cube.png` thứ hai phải nhảy tới `IMG_cube_2`, không
 * được đè lên key của `cube_1.png`.
 *
 * @param {string} base
 * @param {Set<string>} used
 */
function uniqueKey(base, used) {
    if (!used.has(base)) return base;

    let index = 1;
    while (used.has(`${base}_${index}`)) index++;

    return `${base}_${index}`;
}

/**
 * @param {string} full
 */
function toImportPath(full) {
    return path.relative(path.dirname(output), full).replace(/\\/g, "/");
}

/**
 * @param {Record<string, string> | null} [flagsOverride] dùng bộ cờ này thay vì
 *   đọc module-config.json. `check-bundle.js` cần nó: file sinh ra CHỐT loader
 *   theo cờ, nên đo một tổ hợp cờ khác mà không sinh lại thì số đo sai —
 *   `assets.js` vẫn import loader của module lẽ ra đã tắt.
 */
export function generateAssets(flagsOverride = null) {
    const flags = flagsOverride ?? readFlags();
    const files = getAllFiles(watchDir);

    /** @type {Array<{ key: string, type: string, ext: string, importPath: string, rel: string }>} */
    const included = [];

    /** @type {Array<{ key: string, type: string, reason: string }>} */
    const skipped = [];

    /** Dùng chung cho cả `included` lẫn `skipped` để không có key nào trùng nhau. */
    const used = new Set();
    const owner = new Map();

    // Sắp xếp trước khi đặt key: thứ tự file quyết định ai giữ key gốc, ai nhận
    // hậu tố `_1`. Không sort thì thứ tự readdir của OS đổi là key đổi theo.
    for (const file of files.sort()) {
        const ext = extensionOf(file);
        const type = typeOf(file);
        const rel = path.relative(watchDir, file).replace(/\\/g, "/");

        if (!type) {
            if (ext) console.warn(`[assets] bỏ qua "${rel}" — đuôi .${ext} chưa có trong EXTENSION_TYPE`);
            continue;
        }

        const base = keyOf(path.basename(file, path.extname(file)), type);
        const key = uniqueKey(base, used);

        if (key !== base) {
            if (!flagsOverride) console.log(`[assets] "${rel}" → ${key} (trùng ${base} với "${owner.get(base)}")`);
        }

        used.add(key);
        owner.set(key, rel);

        if (!isTypeEnabled(type, flags)) {
            skipped.push({ key, type, reason: rel, need: requiredFlags(type).join(" hoặc ") });
            continue;
        }

        included.push({ key, type, ext, importPath: toImportPath(file), rel });
    }

    const code = render(included, skipped, flags);

    // Chỉ ghi khi NỘI DUNG đổi. Ghi lại y hệt vẫn làm mtime nhảy → esbuild ở
    // chế độ watch coi là thay đổi và rebuild, rebuild lại gọi generate,
    // thành vòng lặp vô tận.
    const changed = !fs.existsSync(output) || fs.readFileSync(output, "utf8") !== code;

    if (changed) fs.writeFileSync(output, code);

    if (!flagsOverride && changed) {
        const note = skipped.length ? `, bỏ ${skipped.length} (module tắt)` : "";
        console.log(`✅ assets.js — ${included.length} asset${note}`);
    }

    return { included, skipped, changed };
}

/**
 * Theo dõi thư mục asset, sinh lại mỗi khi có thay đổi.
 *
 * Dùng ở hai nơi: `npm run app` (chạy độc lập) và `build.js` (kèm dev server).
 * `build.js` CẦN nó vì watcher của esbuild chỉ theo dõi những file đã nằm trong
 * module graph — file vừa thả vào thì chưa ai import, nên không có gì kích hoạt
 * rebuild. Ghi đè `assets.js` mới là thứ esbuild nhìn thấy.
 *
 * @param {(filename: string) => void} [onChange]
 * @returns {import("fs").FSWatcher}
 */
export function watchAssets(onChange) {
    if (!fs.existsSync(watchDir)) {
        fs.mkdirSync(watchDir, { recursive: true });
        console.log(`[assets] đã tạo ${ASSET_DIR}/ — thả file vào đây`);
    }

    const known = new RegExp(`\\.(${Object.keys(EXTENSION_TYPE).join("|")})$`, "i");

    let timer = null;

    return fs.watch(watchDir, { recursive: true }, (_, filename) => {
        if (!filename || !known.test(filename)) return;

        // Copy một file có thể bắn nhiều event (create → write → write). Gộp lại
        // để không sinh code ba lần cho một thao tác kéo-thả.
        clearTimeout(timer);
        timer = setTimeout(() => {
            const { changed } = generateAssets();

            if (changed) {
                console.log(`[assets] cập nhật do "${filename.replace(/\\/g, "/")}"`);
                onChange?.(filename);
            }
        }, 60);
    });
}

/**
 * @param {Array<{ key: string, type: string, ext: string, importPath: string, rel: string }>} included
 * @param {Array<{ key: string, type: string, reason: string }>} skipped
 * @param {Record<string, string>} flags
 */
function render(included, skipped, flags) {
    const flagLine = Object.entries(flags).map(([k, v]) => `${k}=${v}`).join("  ");

    const imports = included
        .map((a, i) => `import _a${i} from "${a.importPath}";`)
        .join("\n");

    const sourceEntries = included
        .map((a, i) => `    ${a.key}: _a${i},`)
        .join("\n");

    const typeEntries = included
        .map((a) => `    ${a.key}: "${a.type}",`)
        .join("\n");

    const pathEntries = included
        .map((a) => `    ${JSON.stringify(a.rel)}: "${a.key}",`)
        .join("\n");

    // Mỗi key một dòng JSDoc `@type {*}`: không có nó, TS suy ra kiểu từ giá trị
    // ban đầu (data-url → `string`) rồi báo đỏ khi bạn dùng `ASSET.IMG_x` như
    // một Texture sau khi load. `*` giữ được gợi ý TÊN KEY mà bỏ suy luận kiểu.
    const assetEntries = included
        .map((a, i) => {
            const loader = resolveLoader(a.type, flags);
            const via = loader ? loader.fn : "passthrough";

            return `    /** ${a.type} (.${a.ext}) → ${via} @type {*} */\n    ${a.key}: _a${i},`;
        })
        .join("\n");

    const skippedEntries = skipped
        .map((a) => `    ${a.key}: { type: "${a.type}", from: "${a.reason}", need: "${a.need}" },`)
        .join("\n");

    // CHỈ import loader của những loại THẬT SỰ có asset. Không có .glb thì
    // GLTFLoader (41.7 KB) không vào bundle, dù `__THREE__` đang bật.
    const usedTypes = [...new Set(included.map((a) => a.type))].sort();

    /** @type {string[]} */
    const loaderImports = [];
    /** @type {string[]} */
    const loaderEntries = [];

    let needPassthrough = false;

    for (const type of usedTypes) {
        const loader = resolveLoader(type, flags);

        if (loader) {
            loaderImports.push(`import { ${loader.fn} } from "${loader.module}";`);
            loaderEntries.push(`    ${type}: ${loader.fn},`);
        } else {
            needPassthrough = true;
            loaderEntries.push(`    ${type}: passthrough,`);
        }
    }

    if (needPassthrough) {
        loaderImports.unshift(`import { passthrough } from "./asset-loaders";`);
    }

    return `// ⚙️ File tự sinh bởi tooling/auto-assets.js — ĐỪNG SỬA TAY
// Nguồn: ${ASSET_DIR}/
// module-config lúc sinh: ${flagLine}
//
// Đây là COMPOSITION ROOT CHO ASSET: generator đã chốt sẵn loader theo cờ, nên
// file này không đọc \`__FLAG__\` nào và chỉ import đúng loader thật sự cần.
${imports ? "\n" + imports + "\n" : "\n"}
${loaderImports.join("\n")}

/** Loại asset → hàm load, đã chốt theo module-config lúc sinh. */
const LOADERS = {
${loaderEntries.join("\n")}
};

/** key → loại asset, để \`loadAssets()\` biết gọi loader nào. Chi tiết nội bộ. */
const TYPES = {
${typeEntries}
};

/**
 * Nguồn thô esbuild nhúng sẵn, giữ riêng khỏi \`ASSET\`.
 *
 * Không có nó thì gọi \`loadAssets()\` lần thứ hai sẽ đưa chính Texture đã load
 * ngược vào \`loadPixiTexture\` và nổ. Có nó thì hàm load lại bao nhiêu lần cũng được.
 */
const SOURCES = {
${sourceEntries}
};

/**
 * Toàn bộ asset của game — MỘT object duy nhất, key có sẵn từ đầu nên IDE gợi ý
 * được ngay mà không cần load trước.
 *
 * · Trước \`loadAssets()\`: mỗi key là nguồn thô (data-url với ảnh/model/âm
 *   thanh, object với .json, chuỗi với .txt).
 * · Sau \`loadAssets()\`: chính key đó bị GHI ĐÈ bằng kết quả của loader —
 *   \`ASSET.IMG_x\` thành Texture, \`ASSET.MODEL_y\` thành gltf.
 *
 * Loại nào không cần loader (json/text/audio) thì trước sau như một.
 */
export const ASSET = {
${assetEntries}
};

/**
 * Đường dẫn nguồn trong ${ASSET_DIR}/ → key trong \`ASSET\`.
 *
 * ── VÌ SAO CẦN BẢNG NÀY ─────────────────────────────────────────────────────
 *
 * Key sinh từ **tên file trần**, nên hai thư mục cùng có \`flour.png\` thì một cái
 * thành \`IMG_flour\`, cái kia \`IMG_flour_1\` — và hậu tố phụ thuộc **thứ tự sắp xếp
 * của cả thư mục**, tức là thả thêm một file có thể đổi key của file khác.
 *
 * Code nào biết asset của mình theo *đường dẫn* (vd cây prefab port từ Unity, nơi
 * đường dẫn khớp 1-1 với bên kia) thì tra qua đây, đừng viết thẳng \`IMG_flour_2\`
 * vào code — nó sẽ hỏng lặng lẽ vào một ngày bạn thêm ảnh.
 *
 * Để riêng chứ không nhét vào \`ASSET\`: \`ASSET.IMG_x\` phải là **giá trị** dùng được
 * ngay, không phải object bọc metadata.
 *
 * @type {Record<string, string>}
 */
export const ASSET_PATH = {
${pathEntries}
};

/**
 * Asset có mặt trong ${ASSET_DIR}/ nhưng KHÔNG được nhúng, vì module cần thiết
 * đang tắt trong module-config.json. Bật cờ rồi chạy lại \`npm run app\` là có.
 *
 * Data-url của chúng KHÔNG nằm trong bundle — một file .glb vài MB khi tắt
 * \`__THREE__\` sẽ biến mất hoàn toàn, không chỉ là "không load được".
 *
 * @type {Record<string, { type: string, from: string, need: string }>}
 */
export const ASSET_SKIPPED = {
${skippedEntries}
};

/**
 * @param {(progress: number, key: string) => void} [onProgress] progress trong [0, 1]
 * @returns {Promise<typeof ASSET>}
 */
export async function loadAssets(onProgress) {
    const keys = Object.keys(SOURCES);
    let done = 0;

    await Promise.all(keys.map(async (key) => {
        // Đọc từ SOURCES chứ không từ ASSET: ASSET đã bị ghi đè ở lần gọi trước.
        ASSET[key] = await LOADERS[TYPES[key]](SOURCES[key], key);

        done++;
        onProgress?.(done / keys.length, key);
    }));

    return ASSET;
}
`;
}

// Chạy trực tiếp (npm run app) → sinh một lần rồi theo dõi thay đổi.
if (process.argv[1]?.replace(/\\/g, "/").endsWith("auto-assets.js")) {
    generateAssets();
    watchAssets();

    console.log(`[assets] đang theo dõi ${ASSET_DIR}/ …`);
}
