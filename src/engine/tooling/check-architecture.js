import fs from "fs";
import path from "path";

const ROOT = "src/engine";

const LIBS = /^(pixi\.js|three|three-stdlib|matter-js|cannon-es|howler|gsap|stats\.js|@falcongames)/;

/** Mỗi luật = một mũi tên KHÔNG được phép trong sơ đồ hexagon */
const RULES = [
    {
        dir: `${ROOT}/domain`,
        forbid: LIBS,
        why: "domain phải thuần — dùng port, không dùng thư viện",
    },
    {
        dir: `${ROOT}/domain`,
        forbid: /adapters\//,
        why: "chỉ bootstrap.js được import adapter (xem ALLOW)",
    },
    {
        dir: `${ROOT}/ports`,
        forbid: /^[^.]|adapters\/|domain\//,
        why: "port chỉ mô tả hợp đồng — không thư viện, không adapter, không domain",
    },
    {
        // Luật này đáng ra phải có từ đầu. Thiếu nó nên HAI file lọt lưới:
        //  · curve-path-sampler.js import three  → +240 KB cho mọi build 2D
        //  · profiler.js import stats.js         → stats.js có trong CẢ build rỗng
        // Cả hai đều đã dời/viết lại; luật ở đây để không tái diễn.
        dir: `${ROOT}/shared`,
        forbid: LIBS,
        why: "shared phải thuần — file nào chạm thư viện thì thuộc adapters/",
    },
    {
        dir: `${ROOT}/shared`,
        forbid: /adapters\/|domain\//,
        why: "shared nằm dưới cùng — không được biết adapter hay domain",
    },
    {
        // Chỉ file physics, KHÔNG phải cả thư mục: extensions/collider-3d.js
        // vốn là cầu nối cannon↔three (nó sync một THREE.Object3D) nên buộc
        // phải import three. Xem ghi chú ở cuối file.
        file: `${ROOT}/adapters/cannon/cannon-physics.js`,
        forbid: /^three/,
        why: "CannonPhysics không được phụ thuộc three — debug đi qua setDebugRenderer",
    },
    {
        file: `${ROOT}/adapters/matter/matter-physics.js`,
        forbid: /^(three|pixi\.js)/,
        why: "MatterPhysics không được phụ thuộc thư viện render",
    },
    {
        dir: `${ROOT}/adapters/matter`,
        forbid: /^(three|cannon-es)/,
        why: "adapter matter không được chạm three/cannon",
    },
    {
        // `tooling/` nằm trong ALLOW (build-time), nhưng asset-loaders.js là
        // RUNTIME và là composition root thứ hai — nó được require adapter,
        // miễn là trong khối `if (__FLAG__)`. Import tĩnh thì cờ mất tác dụng.
        file: `${ROOT}/tooling/asset-loaders.js`,
        forbid: /adapters\/|^(three|pixi\.js|matter-js|cannon-es)/,
        staticOnly: true,
        why: "asset-loaders phải require() adapter trong khối if (__FLAG__), không import tĩnh",
    },
    {
        // Bảng ánh xạ dùng chung cho cả node lẫn browser → phải không phụ thuộc gì.
        file: `${ROOT}/tooling/asset-types.js`,
        forbid: /.*/,
        why: "asset-types.js là dữ liệu thuần, chạy ở cả node lẫn browser — không import gì",
    },
];

/** Ngoại lệ có chủ đích — mỗi dòng PHẢI kèm lý do */
const ALLOW = [
    // composition root: nơi duy nhất thấy cả domain lẫn adapters + đọc cờ __X__
    `${ROOT}/domain/bootstrap.js`,

    // build-time, chạy bằng node, không vào bundle
    `${ROOT}/tooling/`,
];

const IMPORT_RE = /(?:^|\n)\s*(?:import[\s\S]*?from|export[\s\S]*?from)\s*["']([^"']+)["']/g;
const REQUIRE_RE = /require\(\s*["']([^"']+)["']\s*\)/g;

function walk(dir) {
    if (!fs.existsSync(dir)) return [];

    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const p = path.join(dir, entry.name);
        return entry.isDirectory() ? walk(p) : p.endsWith(".js") ? [p] : [];
    });
}

export function checkArchitecture() {
    const violations = [];
    const stale = [];

    for (const rule of RULES) {
        // Luật trỏ vào thứ không tồn tại thì KHÔNG được coi là "hợp lệ".
        // Đổi tên `application/` → `domain/` mà quên sửa luật thì file này vẫn
        // in ✅ trong khi thực chất nó chẳng kiểm tra gì — im lặng còn tệ hơn
        // là không có kiểm tra, vì nó tạo cảm giác an toàn giả.
        const target = rule.file ?? rule.dir;

        if (!fs.existsSync(target)) {
            stale.push(target);
            continue;
        }

        const files = rule.file ? [rule.file] : walk(rule.dir);

        for (const file of files) {
            const posix = file.replace(/\\/g, "/");
            if (!rule.file && ALLOW.some((a) => posix.startsWith(a))) continue;

            const src = fs.readFileSync(file, "utf8");

            // `staticOnly`: chỉ soi `import` tĩnh, bỏ qua `require()`. Dùng cho
            // file được PHÉP require adapter trong khối `if (__FLAG__)` nhưng
            // KHÔNG được import tĩnh — import tĩnh là cờ mất tác dụng.
            const regexes = rule.staticOnly ? [IMPORT_RE] : [IMPORT_RE, REQUIRE_RE];

            for (const re of regexes) {
                re.lastIndex = 0;

                let match;
                while ((match = re.exec(src))) {
                    if (rule.forbid.test(match[1])) {
                        violations.push(`${posix} → "${match[1]}"\n      ${rule.why}`);
                    }
                }
            }
        }
    }

    if (stale.length) {
        console.error(`\n❌ Luật trỏ vào đường dẫn không tồn tại (${stale.length}) — sửa RULES:\n`);
        stale.forEach((s) => console.error("   " + s));
        console.error("");
        process.exit(1);
    }

    if (violations.length) {
        console.error(`\n❌ Vi phạm kiến trúc (${violations.length}):\n`);
        violations.forEach((v) => console.error("   " + v + "\n"));
        process.exit(1);
    }

    console.log(`✅ Kiến trúc hợp lệ (${RULES.length} luật)`);
}

// Chạy trực tiếp: node src/engine/tooling/check-architecture.js
if (process.argv[1]?.replace(/\\/g, "/").endsWith("check-architecture.js")) {
    checkArchitecture();
}

/**
 * GHI CHÚ — vì sao luật cannon chỉ áp cho `cannon-physics.js` chứ không cả thư mục:
 *
 * `extensions/collider-3d.js` giữ `Vector3`/`Quaternion` của three và gọi
 * `owner.getWorldPosition()` / `parent.worldToLocal()` — nó ĐỒNG BỘ một
 * THREE.Object3D với một cannon Body, tức bản chất là cầu nối hai thư viện.
 * Không có cách nào bỏ three ra khỏi nó mà vẫn giữ chức năng.
 *
 * Hệ quả trung thực: build `__CANNON__: true, __THREE__: false` VẪN kéo three
 * vào bundle qua đường collider. Nhưng tổ hợp đó vô nghĩa với engine này —
 * vật lý 3D mà không có renderer 3D thì không có gì để đồng bộ.
 *
 * Vậy tách debug renderer THỰC SỰ mua được gì?
 *
 *  1. `cannon-physics.js` đọc được mà không phải lội qua ~200 dòng dựng
 *     WebGLRenderer/geometry — file từ ~340 xuống ~180 dòng.
 *  2. Đổi cách vẽ debug (vd sang wireframe của renderer chính) không đụng
 *     file mô phỏng.
 *  3. Nếu thêm cờ compile-time `__DEBUG__` vào module-config.json thì hai file
 *     debug-render bị strip khỏi bản production. CHƯA có cờ đó thì
 *     `config.debugPhysics` là runtime → debug vẫn nằm trong bundle.
 *
 * ── CẠM BẪY DCE, ghi lại để khỏi cắn lần nữa ────────────────────────────────
 *
 * `require()` nằm sau một early-return VẪN vào bundle:
 *
 *     ❌  if (!__MATTER__) return;  const X = require("...matter/debug-render");
 *     ✅  if (__MATTER__) { const X = require("...matter/debug-render"); }
 *
 * esbuild xoá nguyên khối `if (false) {...}` nhưng không phân tích luồng để bỏ
 * câu lệnh sau `return`. Viết theo dạng ❌ thì `__MATTER__: false` vẫn kéo
 * matter-js vào (+433 KB). `check-bundle.js --all` phát hiện ra ngay.
 */
