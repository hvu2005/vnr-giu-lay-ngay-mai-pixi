// Máy chủ tĩnh tối giản cho `dist/` — chỉ để soi bản build, không phải dev server.
//
//     node tools/serve.mjs          # cổng 8123
//     node tools/serve.mjs 8130     # đổi cổng khi 8123 đã bị project khác giữ
//
// Thư mục con (`dist/level38/` của bản build từng level) tự trả `index.html`.
//
// Cổng mặc định hay đụng: nhiều project khác cũng chọn 8123, mà hai server cùng
// nghe một cổng thì `tools/shot.mjs` chụp nhầm trang của project kia mà không
// báo lỗi gì — soi ảnh mới biết. Đụng thì truyền cổng khác cho cả hai script.
import fs from "fs";
import http from "http";
import path from "path";

const DIR = path.resolve(import.meta.dirname, "..", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json" };
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8123);

http.createServer((req, res) => {
    let file = path.join(DIR, decodeURIComponent(req.url.split("?")[0]));

    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!file.startsWith(DIR) || !fs.existsSync(file)) { res.writeHead(404); res.end("no"); return; }

    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    res.end(fs.readFileSync(file));
}).listen(PORT, "127.0.0.1", () => console.log(`http://127.0.0.1:${PORT}`));
