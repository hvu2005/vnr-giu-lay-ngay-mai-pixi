
import * as esbuild from "esbuild";
import open from "open";
import fs from "fs";
import net from "net";
import path from "path";

import MODULE_CONFIG from "./module-config.json" with { type: "json" };
import { generateAssets, watchAssets } from "./src/engine/tooling/auto-assets.js";
import { BASE } from "./tools/esbuild-base.mjs";

// Sinh lại assets.js theo cờ HIỆN TẠI. Bắt buộc: file này ghi nhớ cờ lúc sinh,
// nên đổi module-config.json rồi build mà không sinh lại thì hoặc thiếu asset,
// hoặc nhúng asset của module đã tắt.
generateAssets();

/**
 * @type {esbuild.BuildOptions}
 */
const ESBUILD_CONFIG = {
    ...BASE,
    entryPoints: ["main.js"],
    outfile: "dist/main.js",
    define: MODULE_CONFIG,
    plugins: [
        _bundleSizePlugin(),
    ],
    logLevel: "info",
    metafile: true,
};


(async () => {
    try {
        if (!fs.existsSync("dist")) {
            fs.mkdirSync("dist", { recursive: true });
        }
        fs.copyFileSync("index.html", path.join("dist", "index.html"));

        const ctx = await esbuild.context(ESBUILD_CONFIG);

        const result = await ctx.rebuild();
        fs.writeFileSync('meta.json', JSON.stringify(result.metafile, null, 2));

        await _startServer(ctx);


    } catch (err) {
        console.error("Lỗi build:", err);
        process.exit(1);
    }
})();


async function _startServer(ctx, startPort = 8080, maxTries = 10) {
    const watch = await ctx.watch();

    // Watcher của esbuild chỉ theo dõi file ĐÃ nằm trong module graph, nên thả
    // một asset MỚI vào src/drop-assets-in-me/ thì nó không hề hay biết. Watcher
    // riêng này sinh lại assets.js; chính việc ghi đè file đó mới là thứ esbuild
    // nhìn thấy và kích hoạt rebuild.
    watchAssets();
    console.log(`>>> Đang theo dõi src/drop-assets-in-me/ — thả asset vào là tự build lại`);

    watchIndexHtml();

    let port;
    for (port = startPort; port < startPort + maxTries; port++) {
        // esbuild bind 0.0.0.0 nên nó vẫn "thành công" khi port đã bị process
        // khác chiếm riêng 127.0.0.1 — lúc đó localhost:port trả về của thằng
        // kia (thường là 404 NOT FOUND). Phải tự probe đúng host của URL.
        if (!await _isPortFree(port)) {
            console.log(`>>> Port ${port} đã bị chiếm trên 127.0.0.1, thử port khác...`);
            continue;
        }

        try {
            const server = await ctx.serve({ port, servedir: "dist" });
            const url = `http://localhost:${port}/index.html`;
            console.log(`>>> Dev server chạy tại: ${url}`);
            await open(url);
            return server;
        } catch (err) {
            console.log(`>>> Không bind được port ${port}: ${err.message}`);
            continue;
        }
    }
    throw new Error("Không tìm được port khả dụng!", startPort + "-" + port);
}

/**
 * @param {number} port
 * @param {string} host
 */
/**
 * Copy lại `index.html` sang `dist/` mỗi lần nó đổi.
 *
 * `ctx.watch()` của esbuild chỉ theo dõi những file NẰM TRONG module graph, mà
 * `index.html` thì không phải entry point — nó chỉ được copy đúng một lần lúc
 * khởi động. Mà dev server lại `servedir: "dist"`, nên sửa CSS hay thẻ nào
 * trong `index.html` cũng không thấy gì cho tới khi tắt đi chạy lại — rất dễ
 * tưởng mình sửa sai chỗ.
 *
 * `fs.watch` bắn hai ba lần cho một lần lưu (editor ghi file tạm rồi đổi tên),
 * nên gộp lại bằng một timer ngắn.
 */
function watchIndexHtml() {
    let timer = null;

    fs.watch("index.html", () => {
        clearTimeout(timer);

        timer = setTimeout(() => {
            try {
                fs.copyFileSync("index.html", path.join("dist", "index.html"));
                console.log(">>> index.html đã copy lại — tải lại trang để thấy");
            } catch (err) {
                console.error(">>> Không copy được index.html:", err.message);
            }
        }, 50);
    });

    console.log(">>> Đang theo dõi index.html — sửa là tự copy sang dist/");
}

function _isPortFree(port, host = "127.0.0.1") {
    return new Promise((resolve) => {
        const tester = net.createServer()
            .once("error", () => resolve(false))
            .once("listening", () => tester.close(() => resolve(true)))
            .listen(port, host);
    });
}

function _bundleSizePlugin() {
    return {
        name: "bundle-size",
        setup(build) {
            build.onEnd(result => {
                try {
                    const stats = fs.statSync("dist/main.js");
                    const sizeKB = (stats.size / 1024).toFixed(2);
                    console.log(`📦 Bundle size: ${sizeKB} KB`);
                } catch {
                    console.warn("⚠️ Không đọc được bundle size.");
                }

            });
        }
    };
}


