// Nhận ảnh Gemini từ tab trình duyệt (POST data-url) → art/gemini/<name>.png
// Dùng khi gen scene bằng Gemini trong Chrome: nút tải của Gemini không ghi được
// file ra đĩa trong phiên tự động, nên trang tự đẩy ảnh về đây.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("art/gemini");
fs.mkdirSync(OUT, { recursive: true });

const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Private-Network": "true",
};

const RECV_PAGE = `<!doctype html><meta charset=utf-8><title>recv</title><body>recv
<script>
addEventListener("message", async (e) => {
  if (e.data && e.data.cmd === "prompts") {
    const p = await fetch("/prompts.json").then((r) => r.json());
    e.source.postMessage({ prompts: p }, "*");
    return;
  }
  const { name, data } = e.data || {};
  if (!name || !data) return;
  const r = await fetch("/save?name=" + encodeURIComponent(name), { method: "POST", body: data });
  e.source && e.source.postMessage({ saved: name, status: r.status, text: await r.text() }, "*");
  document.body.append(" " + name);
});
</script>`;

http.createServer((req, res) => {
    if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
    const url = new URL(req.url, "http://x");
    if (req.method === "GET" && url.pathname === "/prompts.json") {
        res.writeHead(200, { ...cors, "Content-Type": "application/json" });
        return res.end(fs.readFileSync("art/prompts/prompts.json"));
    }
    if (req.method === "GET") { res.writeHead(200, { ...cors, "Content-Type": "text/html" }); return res.end(RECV_PAGE); }
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
        const name = (url.searchParams.get("name") || "img").replace(/[^\w.-]/g, "_");
        const body = Buffer.concat(chunks).toString();
        const m = body.match(/^data:image\/(\w+);base64,(.*)$/s);
        const buf = m ? Buffer.from(m[2], "base64") : Buffer.concat(chunks);
        const ext = m ? (m[1] === "jpeg" ? "jpg" : m[1]) : "bin";
        const file = path.join(OUT, `${name}.${ext}`);
        fs.writeFileSync(file, buf);
        console.log("saved", file, buf.length);
        res.writeHead(200, cors); res.end(`${file} ${buf.length}`);
    });
}).listen(8765, "127.0.0.1", () => console.log("recv on 8765"));
