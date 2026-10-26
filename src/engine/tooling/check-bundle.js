import * as esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateAssets } from "./auto-assets.js";

/**
 * Đo bundle theo từng tổ hợp cờ và LIỆT KÊ thư viện nào thực sự vào bundle.
 *
 * Lý do có file này: "cờ `__PIXI__: false` chắc loại được pixi" là một giả định.
 * `metafile` của esbuild biến nó thành số đo. Chính công cụ này đã phát hiện
 * `shared/curve-path-sampler.js` kéo three vào MỌI build (240 KB chết trong
 * một bản 2D thuần) — thứ không ai nhìn code mà thấy được.
 *
 * Dùng:
 *   node src/engine/tooling/check-bundle.js              # cấu hình hiện tại
 *   node src/engine/tooling/check-bundle.js --all        # cả 5 tổ hợp
 *   node src/engine/tooling/check-bundle.js --engine     # engine không kèm scene
 */

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../../../..");
const LIBS = ["pixi.js", "three", "matter-js", "cannon-es", "stats.js"];

/** Ngưỡng chặn — đặt theo budget của ad network. 0 = không chặn. */
const MAX_BUNDLE_KB = 0;

const COMBOS = [
    { __PIXI__: "false", __THREE__: "true", __MATTER__: "false", __CANNON__: "false", __PROFILER__: "true" },
    { __PIXI__: "true", __THREE__: "false", __MATTER__: "true", __CANNON__: "false", __PROFILER__: "true" },
    { __PIXI__: "false", __THREE__: "true", __MATTER__: "false", __CANNON__: "true", __PROFILER__: "true" },
    { __PIXI__: "true", __THREE__: "true", __MATTER__: "true", __CANNON__: "true", __PROFILER__: "true" },
    // Hai dòng cuối: cùng tắt hết module, chỉ khác __PROFILER__ — kiểm chứng
    // stats.js thật sự biến mất chứ không chỉ "không hiển thị".
    { __PIXI__: "false", __THREE__: "false", __MATTER__: "false", __CANNON__: "false", __PROFILER__: "true" },
    { __PIXI__: "false", __THREE__: "false", __MATTER__: "false", __CANNON__: "false", __PROFILER__: "false" },
];

const LOADER = {
    ".png": "dataurl", ".jpg": "dataurl", ".jpeg": "dataurl", ".gif": "dataurl",
    ".glb": "dataurl", ".gltf": "dataurl", ".mp3": "dataurl", ".json": "json",
    ".atlas": "text", ".glsl": "text", ".frag": "text", ".vert": "text",
    ".fbx": "dataurl", ".obj": "dataurl", ".stl": "dataurl", ".txt": "dataurl",
};

/** Entry chỉ chứa engine, không có scene của game — đo xem engine tự nó có sạch không. */
const ENGINE_ONLY_ENTRY = `
import { bootstrap, Scene } from "./src/engine";
class Empty extends Scene { async startScene() {} }
(async () => { await bootstrap(Empty); })();
`;

async function measure(define, entry) {
    // BẮT BUỘC sinh lại theo đúng bộ cờ sắp đo. `assets.js` chốt loader lúc
    // sinh, nên nếu không sinh lại thì một bản build `__PIXI__: false` vẫn kéo
    // pixi vào qua `import { loadPixiTexture }` còn sót — số đo thành vô nghĩa.
    generateAssets(define);

    const result = await esbuild.build({
        absWorkingDir: ROOT,
        entryPoints: [entry],
        bundle: true,
        write: false,
        format: "iife",
        target: ["esnext"],
        minify: true,
        treeShaking: true,
        legalComments: "none",
        define,
        loader: LOADER,
        logLevel: "silent",
        metafile: true,
    });

    const sizeKB = result.outputFiles[0].contents.length / 1024;

    const libs = LIBS.map((lib) => {
        const count = Object.keys(result.metafile.inputs)
            .filter((p) => p.includes(`node_modules/${lib}/`)).length;

        return { lib, count };
    });

    return { sizeKB, libs };
}

function format(define, { sizeKB, libs }) {
    const flags = Object.entries(define)
        .map(([k, v]) => `${k.replace(/_/g, "")}=${v === "true" ? "1" : "0"}`)
        .join(" ");

    const present = libs
        .map(({ lib, count }) => (count ? `${lib}` : `\x1b[2m${lib}\x1b[0m`))
        .join("  ");

    return `  ${sizeKB.toFixed(1).padStart(8)} KB   ${flags.padEnd(60)} ${present}`;
}

const args = process.argv.slice(2);
const engineOnly = args.includes("--engine");
const all = args.includes("--all");

let entry = "main.js";
let tempEntry = null;

if (engineOnly) {
    tempEntry = path.join(ROOT, "__engine-only-entry.js");
    fs.writeFileSync(tempEntry, ENGINE_ONLY_ENTRY);
    entry = "__engine-only-entry.js";
}

try {
    const defines = all || engineOnly
        ? COMBOS
        : [JSON.parse(fs.readFileSync(path.join(ROOT, "module-config.json"), "utf8"))];

    console.log(`\n  entry: ${entry}   (thư viện mờ = KHÔNG có trong bundle)\n`);

    let over = false;

    for (const define of defines) {
        const result = await measure(define, entry);
        console.log(format(define, result));

        if (MAX_BUNDLE_KB && result.sizeKB > MAX_BUNDLE_KB) over = true;
    }

    console.log("");

    if (over) {
        console.error(`❌ Có bundle vượt ${MAX_BUNDLE_KB} KB`);
        process.exit(1);
    }
} finally {
    if (tempEntry) fs.rmSync(tempEntry, { force: true });

    // Trả assets.js về đúng module-config.json thật. Không có dòng này thì
    // công cụ đo để lại một file sinh theo tổ hợp cờ CUỐI CÙNG trong COMBOS —
    // chạy `check-bundle --all` xong đi build là ra bundle sai.
    generateAssets();
}
