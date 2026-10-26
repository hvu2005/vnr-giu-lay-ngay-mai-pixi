// Mở bản build trong Chrome headless, chụp màn hình và BÁO LẠI MỌI LỖI.
//
//     node tools/shot.mjs                          # chup man dau
//     node tools/shot.mjs --w 1080 --h 1920
//     node tools/shot.mjs --out shot.png --wait 6
//     node tools/shot.mjs --eval "__game.scene.openStore()" --wait 3
//     node tools/shot.mjs --url http://127.0.0.1:8137/ --after 4
//
// ── THỨ TỰ: `--wait` → `--eval` → `--after` → CHỤP ─────────────────────────
//
// `--wait` là lúc chờ TRƯỚC khi chạy `--eval`, không phải trước khi chụp. Nên
// đẩy `--wait` lên cao KHÔNG giúp bắt được một hiệu ứng chạy sau đoạn `--eval`:
// đoạn eval xong lúc nào thì ảnh chụp lúc đó cộng `--after`, nâng `--wait` chỉ
// dời cả cụm đi muộn hơn mà khung hình bắt được vẫn y nguyên.
//
// Muốn bắt cảnh lật mặt hung thủ (bắt đầu 3.4 giây sau cú chạm cuối) thì để
// `--after 4`, hoặc tự `await` thêm bên trong chính đoạn eval.
//
// ── VÌ SAO KHÔNG DÙNG `--screenshot` CỦA CHROME ────────────────────────────
//
// Cờ đó chụp xong là thoát, không nói gì về lỗi JS. Màn hình trắng thì chịu,
// không biết là asset hỏng, shader hỏng hay code ném lỗi. Ở đây nối thẳng vào
// DevTools Protocol: bật `Runtime`/`Log`, gom `console.*` và exception, rồi mới
// chụp — trắng màn thì có nguyên nhân kèm theo.
//
// Node 22+ có sẵn WebSocket nên không cần thư viện nào.

import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const args = parseArgs(process.argv.slice(2));

const WIDTH = Number(args.w ?? 1080);
const HEIGHT = Number(args.h ?? 1920);
const WAIT = Number(args.wait ?? 6);
const AFTER = Number(args.after ?? 1.2);
const URL = args.url ?? "http://127.0.0.1:8123/";
const OUT = path.resolve(args.out ?? "shot.png");
const PORT = 9333;

const CHROME = args.chrome ?? [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
].find((p) => fs.existsSync(p));

if (!CHROME) {
    console.error("khong thay chrome.exe — truyen --chrome <duong dan>");
    process.exit(1);
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), "pa-chrome-"));

const chrome = spawn(CHROME, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    `--window-size=${WIDTH},${HEIGHT}`,
    // SwiftShader: máy build không có GPU thật, mà pixi thì đòi WebGL.
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--hide-scrollbars",
    "--mute-audio",
    "--no-first-run",
    "about:blank",
], { stdio: "ignore" });

let code = 0;

try {
    const target = await waitForTarget();
    const socket = await connect(target.webSocketDebuggerUrl);

    const logs = [];

    socket.onMessage((message) => {
        if (message.method === "Runtime.consoleAPICalled") {
            logs.push(`[${message.params.type}] ${message.params.args.map(preview).join(" ")}`);
        }

        if (message.method === "Runtime.exceptionThrown") {
            const d = message.params.exceptionDetails;

            logs.push(`[EXCEPTION] ${d.exception?.description ?? d.text}`);
        }

        if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
            logs.push(`[log] ${message.params.entry.text}`);
        }
    });

    await socket.send("Runtime.enable");
    await socket.send("Log.enable");
    await socket.send("Page.enable");

    // ── KHỔ MÀN PHẢI ÉP BẰNG CDP ───────────────────────────────────────────
    //
    // `--window-size` của chrome KHÔNG tới được trang: headless mới vẫn mở cửa
    // sổ theo cỡ màn hình máy chủ, nên `innerWidth`/`innerHeight` ra một con số
    // cố định bất kể truyền `--w`/`--h` gì. Chụp bao nhiêu kiểu máy cũng chỉ ra
    // đúng một khổ — mà đây lại là cái cần nhìn nhất khi soi responsive.
    //
    // `setDeviceMetricsOverride` thì ép thẳng viewport của trang, và sự kiện
    // `resize` bắn ra đúng như kéo cửa sổ thật.
    await socket.send("Emulation.setDeviceMetricsOverride", {
        width: WIDTH,
        height: HEIGHT,
        deviceScaleFactor: 1,
        mobile: true,
    });

    await socket.send("Page.navigate", { url: URL });

    await sleep(WAIT * 1000);

    if (args.eval) {
        const r = await socket.send("Runtime.evaluate", {
            expression: args.eval,
            awaitPromise: true,
            returnByValue: true,
        });

        console.log("eval:", JSON.stringify(r.result?.value ?? r.result?.description ?? r.result));

        await sleep(AFTER * 1000);
    }

    // Trạng thái scene: màn trắng mà `__game` chưa có nghĩa là `startScene()` chưa
    // chạy xong — treo ở đâu đó chứ không phải lỗi vẽ.
    const probe = await socket.send("Runtime.evaluate", {
        expression: `(() => {
            const d = window.__game;
            if (!d) return { ready: false };
            // Game nào cũng nên có \`scene.debugState()\` trả vài số đủ để biết
            // ván đang ở đâu — thêm khoá tuỳ game ở đó, không sửa file này.
            return {
                ready: true,
                view: d.scene.view ? [Math.round(d.scene.view.w), Math.round(d.scene.view.h), +d.scene.view.scale.toFixed(3)] : null,
                layers: d.scene.layers?.length,
                state: d.scene.debugState?.(),
            };
        })()`,
        returnByValue: true,
    });

    console.log("scene:", JSON.stringify(probe.result?.value));

    const shot = await socket.send("Page.captureScreenshot", { format: "png" });

    fs.writeFileSync(OUT, Buffer.from(shot.data, "base64"));
    console.log(`anh   : ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);

    if (logs.length) {
        console.log("\nconsole:");
        for (const line of logs) console.log("  " + line);

        if (logs.some((l) => l.includes("EXCEPTION"))) code = 1;
    } else {
        console.log("\nconsole: (sach)");
    }

    socket.close();
} finally {
    chrome.kill();
}

process.exit(code);

// ══ CDP ════════════════════════════════════════════════════════════════════

async function waitForTarget() {
    for (let i = 0; i < 60; i++) {
        try {
            const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
            const page = list.find((t) => t.type === "page");

            if (page?.webSocketDebuggerUrl) return page;
        } catch {
            // Chrome chưa mở cổng — thử lại.
        }

        await sleep(250);
    }

    throw new Error("chrome khong mo cong debug");
}

function connect(url) {
    return new Promise((resolve, reject) => {
        const socket = new WebSocket(url);
        const pending = new Map();
        let id = 0;
        let onMessage = () => {};

        socket.addEventListener("message", (event) => {
            const message = JSON.parse(event.data);

            if (message.id && pending.has(message.id)) {
                pending.get(message.id)(message.result ?? {});
                pending.delete(message.id);
                return;
            }

            onMessage(message);
        });

        socket.addEventListener("error", reject);

        socket.addEventListener("open", () => resolve({
            send(method, params = {}) {
                return new Promise((done) => {
                    id++;
                    pending.set(id, done);
                    socket.send(JSON.stringify({ id, method, params }));
                });
            },
            onMessage(handler) { onMessage = handler; },
            close() { socket.close(); },
        }));
    });
}

function preview(arg) {
    if (arg.value !== undefined) return String(arg.value);
    if (arg.description) return arg.description;

    return arg.type;
}

function sleep(ms) {
    return new Promise((done) => setTimeout(done, ms));
}

function parseArgs(list) {
    const out = {};

    for (let i = 0; i < list.length; i++) {
        if (!list[i].startsWith("--")) continue;

        out[list[i].slice(2)] = list[i + 1]?.startsWith("--") ? true : list[++i];
    }

    return out;
}
