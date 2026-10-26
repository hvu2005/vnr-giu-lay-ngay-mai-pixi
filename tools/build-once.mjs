// Build MỘT lần ra dist/ rồi thoát — không dev server, không watch.
// Dùng cho CI hoặc để kiểm tra bundle: `node tools/build-once.mjs`.
import * as esbuild from "esbuild";
import fs from "fs";
import path from "path";

import MODULE_CONFIG from "../module-config.json" with { type: "json" };
import { generateAssets } from "../src/engine/tooling/auto-assets.js";
import { BASE } from "./esbuild-base.mjs";

generateAssets();

fs.mkdirSync("dist", { recursive: true });
fs.copyFileSync("index.html", path.join("dist", "index.html"));

await esbuild.build({
    ...BASE,
    entryPoints: ["main.js"],
    outfile: "dist/main.js",
    define: MODULE_CONFIG,
    logLevel: "info",
});

const kb = (fs.statSync("dist/main.js").size / 1024).toFixed(0);
console.log(`📦 dist/main.js — ${kb} KB`);
