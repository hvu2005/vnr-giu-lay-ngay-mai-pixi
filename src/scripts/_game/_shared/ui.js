import { Container, Graphics, Rectangle, Sprite, Text, Texture } from "pixi.js";

import { UI } from "../data/scene-config";

/**
 * Khối dựng giao diện dùng chung: tấm giấy, bảng sơn mài, nút bấm, chữ.
 *
 * ── PHONG CÁCH ──────────────────────────────────────────────────────────────
 *
 * Lấy NGUYÊN từ project tham khảo `hcm-di-tim-con-duong` để hai game cùng một
 * phong cách. Giao diện mượn đồ vật của một tập hồ sơ lưu trữ — đúng tinh thần
 * "người chơi mở một tập hồ sơ ký ức" của high concept — thay cho khung bo
 * tròn kiểu ứng dụng:
 *
 *   · giấy hồ sơ cũ — mép xơ, ố vàng, cháy sém ở rìa, kẻ viền mực nâu đôi có
 *     hoa góc (thẻ tư liệu, sổ tay);
 *   · bảng sơn mài — nền nâu đen ánh đỏ, viền đồng thau góc vát, đinh tán ở
 *     góc (nhãn tên cảnh, thanh vật, bộ sưu tập, bảng chuyển cảnh);
 *   · nút đồng thau góc vát, nút tròn như đồng xu có vành hạt.
 *
 * ── VẼ BẰNG CANVAS 2D, KHÔNG BẰNG ẢNH ───────────────────────────────────────
 *
 * Bộ bàn giao không có asset UI nào. Vân giấy, vết ố, gradient đồng thau thì
 * `Graphics` của pixi không vẽ được, nên dựng texture bằng canvas 2D (gấp
 * `RES` lần cho nét khi khung cảnh phóng to), mỗi kích thước một lần rồi dùng
 * chung. Ngẫu nhiên có hạt giống theo kích thước → cùng một tấm giấy luôn ố
 * cùng một chỗ, mở lại thẻ không "nhảy" vết.
 */

const RES = 2;

/** Lề trong suốt quanh texture cho bóng đổ — sprite lùi ra đúng chừng đó. */
const PAD = 24;

/** @type {Map<string, Texture>} */
const cache = new Map();

/**
 * @param {string} key
 * @param {number} w kích thước LOGIC (chưa nhân RES), chưa tính lề bóng
 * @param {number} h
 * @param {(ctx: CanvasRenderingContext2D, w: number, h: number, rnd: () => number) => void} draw
 *   vẽ trong hệ toạ độ logic, gốc ở góc trên trái của tấm (lề bóng đã trừ)
 */
function _texture(key, w, h, draw) {
    const hit = cache.get(key);
    if (hit) return hit;

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil((w + PAD * 2) * RES);
    canvas.height = Math.ceil((h + PAD * 2) * RES);

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.scale(RES, RES);
    ctx.translate(PAD, PAD);
    draw(ctx, w, h, _rng(key));

    const texture = Texture.from(canvas);
    cache.set(key, texture);

    return texture;
}

/**
 * Sprite của texture `_texture`, đặt sao cho góc tấm trùng (0, 0). Vùng bấm
 * chỉ là tấm, không gồm lề bóng — không thì HUD "ăn" chuột cả viền 24px quanh
 * nó và người chơi trỏ vào vật sát thanh vật không được.
 */
function _sprite(texture) {
    const s = new Sprite(texture);
    const p = PAD * RES;
    s.scale.set(1 / RES);
    s.position.set(-PAD, -PAD);
    s.hitArea = new Rectangle(p, p, texture.width - p * 2, texture.height - p * 2);
    return s;
}

/** mulberry32 — hạt giống lấy từ chuỗi key. */
function _rng(key) {
    let a = 0;
    for (let i = 0; i < key.length; i++) a = (Math.imul(a, 31) + key.charCodeAt(i)) | 0;

    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ══ HÌNH ════════════════════════════════════════════════════════════════════

/** Điểm của hình chữ nhật vát góc `c`. */
function _chamferPoints(x, y, w, h, c) {
    return [x + c, y, x + w - c, y, x + w, y + c, x + w, y + h - c, x + w - c, y + h, x + c, y + h, x, y + h - c, x, y + c];
}

function _chamferPath(ctx, x, y, w, h, c) {
    const p = _chamferPoints(x, y, w, h, c);
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
    ctx.closePath();
}

/**
 * Mép giấy xơ: đi quanh hình chữ nhật, mỗi vài px lệch vào/ra một chút.
 * Góc bo nhẹ để không thành nhọn hoắt.
 */
function _deckledPath(ctx, w, h, rnd, fresh = true, amp = 1.8, step = 7) {
    const pts = [];
    const edge = (x0, y0, x1, y1, nx, ny) => {
        const len = Math.hypot(x1 - x0, y1 - y0);
        const n = Math.max(2, Math.round(len / step));
        for (let i = 0; i < n; i++) {
            const t = i / n;
            const j = (rnd() - 0.5) * 2 * amp;
            pts.push([x0 + (x1 - x0) * t + nx * j, y0 + (y1 - y0) * t + ny * j]);
        }
    };
    const r = 5;
    edge(r, 0, w - r, 0, 0, 1);
    edge(w, r, w, h - r, 1, 0);
    edge(w - r, h, r, h, 0, 1);
    edge(0, h - r, 0, r, 1, 0);

    if (fresh) ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const [x, y] of pts) ctx.lineTo(x, y);
    ctx.closePath();
}

/**
 * Bóng đổ vào TRONG hình (viền cháy, mép lõm): tô một tấm khổng lồ có khoét
 * đúng hình đó, chỉ cho bóng của nó lọt vào trong vùng clip.
 *
 * @param {(fresh: boolean) => void} pathFn vẽ hình; `fresh = false` thì nối
 *   tiếp vào path đang có thay vì mở path mới
 */
function _innerShadow(ctx, pathFn, color, blur) {
    ctx.save();
    pathFn(true);
    ctx.clip();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur * RES;
    ctx.beginPath();
    ctx.rect(-4000, -4000, 8000, 8000);
    pathFn(false);
    ctx.fillStyle = "#000";
    ctx.fill("evenodd");
    ctx.restore();
}

/** Nhiễu độ sáng từng điểm — vân giấy, vân sơn. Chỉ đụng điểm đã có màu. */
function _grain(ctx, amount, rnd) {
    const { width, height } = ctx.canvas;
    const img = ctx.getImageData(0, 0, width, height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0) continue;
        const n = (rnd() - 0.5) * 2 * amount;
        d[i] += n;
        d[i + 1] += n;
        d[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
}

/** Gradient đồng thau chéo — dùng cho viền, nút. */
function _brass(ctx, x0, y0, x1, y1, bright = 0) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    const lift = (hex) => _mix(hex, "#fff4cc", bright);
    g.addColorStop(0, lift("#fbe7a6"));
    g.addColorStop(0.3, lift("#c8902f"));
    g.addColorStop(0.55, lift("#f1cf78"));
    g.addColorStop(0.8, lift("#a8741f"));
    g.addColorStop(1, lift("#e3bb62"));
    return g;
}

function _mix(a, b, t) {
    if (!t) return a;
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const ch = (p, s) => (p >> s) & 255;
    const c = (s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t);
    return `rgb(${c(16)},${c(8)},${c(0)})`;
}

/**
 * Hoa góc: nét chữ L bo cong + nét trong mảnh + hạt thoi. Vẽ ở góc (x, y),
 * hướng (sx, sy) là chiều đi VÀO trong tấm.
 */
function _corner(ctx, x, y, sx, sy, size, stroke, width = 1.4) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx, sy);
    ctx.strokeStyle = stroke;
    ctx.fillStyle = stroke;
    ctx.lineCap = "round";

    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.lineTo(0, 7);
    ctx.quadraticCurveTo(0, 0, 7, 0);
    ctx.lineTo(size, 0);
    ctx.stroke();

    ctx.lineWidth = width * 0.7;
    ctx.beginPath();
    ctx.moveTo(5, size * 0.6);
    ctx.lineTo(5, 11);
    ctx.quadraticCurveTo(5, 5, 11, 5);
    ctx.lineTo(size * 0.6, 5);
    ctx.stroke();

    // cuộn nhỏ ở đầu hai nét ngoài
    ctx.beginPath();
    ctx.arc(size + 2.5, 0, 2.5, Math.PI, Math.PI * 2.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, size + 2.5, 2.5, -Math.PI / 2, Math.PI * 1.1);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(12, 9);
    ctx.lineTo(15, 12);
    ctx.lineTo(12, 15);
    ctx.lineTo(9, 12);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

// ══ CHỮ ═════════════════════════════════════════════════════════════════════

/**
 * @param {string} text
 * @param {Partial<import("pixi.js").TextStyleOptions>} [style]
 */
export function label(text, style = {}) {
    return new Text({
        text,
        style: {
            fontFamily: UI.fontBody,
            fontSize: 18,
            fill: UI.ink,
            ...style,
        },
    });
}

/**
 * @param {string} text
 * @param {Partial<import("pixi.js").TextStyleOptions>} [style]
 */
export function title(text, style = {}) {
    return label(text, { fontFamily: UI.fontTitle, fontWeight: "bold", fontSize: 28, ...style });
}

// ══ TẤM NỀN ═════════════════════════════════════════════════════════════════

/**
 * Tờ giấy hồ sơ cũ: mép xơ, ố vàng, cháy sém ở rìa, viền mực nâu đôi có hoa
 * góc, bóng đổ mềm.
 *
 * @param {number} w
 * @param {number} h
 * @param {{ alpha?: number, rules?: boolean }} [opt]
 */
export function paperPanel(w, h, opt = {}) {
    w = Math.round(w);
    h = Math.round(h);
    const rules = opt.rules ?? true;

    const texture = _texture(`paper:${w}x${h}:${rules}`, w, h, (ctx, w, h, rnd) => {
        // Mỗi lần vẽ dùng lại cùng hạt giống → đúng một đường mép.
        const path = (fresh = true) => _deckledPath(ctx, w, h, _rng(`edge:${w}x${h}`), fresh);

        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.55)";
        ctx.shadowBlur = 20 * RES;
        ctx.shadowOffsetY = 8 * RES;
        path();
        ctx.fillStyle = "#e3cfa2";
        ctx.fill();
        ctx.restore();

        ctx.save();
        path();
        ctx.clip();

        const base = ctx.createRadialGradient(w * 0.45, h * 0.4, 0, w / 2, h / 2, Math.max(w, h) * 0.75);
        base.addColorStop(0, "#f6ebcf");
        base.addColorStop(0.6, "#ecdbb3");
        base.addColorStop(1, "#d3b783");
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, w, h);

        // Vết ố loang — tròn mờ màu trà.
        const stains = Math.round((w * h) / 9000);
        for (let i = 0; i < stains; i++) {
            const x = rnd() * w;
            const y = rnd() * h;
            const r = 20 + rnd() * 80;
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, `rgba(150,104,48,${0.025 + rnd() * 0.05})`);
            g.addColorStop(1, "rgba(150,104,48,0)");
            ctx.fillStyle = g;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }

        // Chấm mốc nhỏ.
        for (let i = 0; i < stains * 3; i++) {
            ctx.fillStyle = `rgba(130,82,36,${0.06 + rnd() * 0.12})`;
            ctx.beginPath();
            ctx.arc(rnd() * w, rnd() * h, 0.4 + rnd() * 1.4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Sợi giấy.
        ctx.lineWidth = 0.6;
        for (let i = 0; i < (w * h) / 500; i++) {
            const x = rnd() * w;
            const y = rnd() * h;
            const a = rnd() * Math.PI;
            const l = 3 + rnd() * 10;
            ctx.strokeStyle = `rgba(110,80,40,${0.04 + rnd() * 0.05})`;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
            ctx.stroke();
        }
        ctx.restore();

        _innerShadow(ctx, path, "rgba(105,60,20,0.75)", 26);
        _innerShadow(ctx, path, "rgba(80,45,15,0.5)", 6);

        _grain(ctx, 9, rnd);

        if (rules) {
            const ink = "rgba(112,78,40,0.6)";
            ctx.strokeStyle = ink;
            ctx.lineWidth = 1.3;
            ctx.strokeRect(16, 16, w - 32, h - 32);
            ctx.lineWidth = 0.7;
            ctx.strokeRect(21, 21, w - 42, h - 42);
            const s = 30;
            _corner(ctx, 10, 10, 1, 1, s, ink);
            _corner(ctx, w - 10, 10, -1, 1, s, ink);
            _corner(ctx, 10, h - 10, 1, -1, s, ink);
            _corner(ctx, w - 10, h - 10, -1, -1, s, ink);
        }
    });

    const c = new Container();
    const s = _sprite(texture);
    s.alpha = opt.alpha ?? 1;
    c.addChild(s);
    return c;
}

/**
 * Bảng sơn mài: nền nâu đen ánh đỏ, vân sơn, viền đồng thau góc vát.
 * `ornate` thêm hoa góc và đinh tán — cho bảng lớn (bộ sưu tập, chuyển cảnh).
 *
 * @param {number} w
 * @param {number} h
 * @param {{ chamfer?: number, alpha?: number, ornate?: boolean, shadow?: boolean }} [opt]
 */
export function lacquerPanel(w, h, opt = {}) {
    w = Math.round(w);
    h = Math.round(h);
    const c = Math.round(opt.chamfer ?? Math.min(14, h * 0.22));
    const ornate = opt.ornate ?? false;
    const shadow = opt.shadow ?? true;

    const texture = _texture(`lacquer:${w}x${h}:${c}:${ornate}:${shadow}`, w, h, (ctx, w, h, rnd) => {
        const path = (fresh = true) => {
            const p = _chamferPoints(0, 0, w, h, c);
            if (fresh) ctx.beginPath();
            ctx.moveTo(p[0], p[1]);
            for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
            ctx.closePath();
        };

        if (shadow) {
            ctx.save();
            ctx.shadowColor = "rgba(0,0,0,0.6)";
            ctx.shadowBlur = 16 * RES;
            ctx.shadowOffsetY = 6 * RES;
            path();
            ctx.fillStyle = "#1a0f0a";
            ctx.fill();
            ctx.restore();
        }

        ctx.save();
        path();
        ctx.clip();

        const base = ctx.createLinearGradient(0, 0, 0, h);
        base.addColorStop(0, "#2e1b12");
        base.addColorStop(1, "#150c07");
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, w, h);

        // Ánh son đỏ của sơn mài, lệch về góc trên trái.
        const glow = ctx.createRadialGradient(w * 0.25, -h * 0.2, 0, w * 0.25, -h * 0.2, Math.max(w, h) * 0.9);
        glow.addColorStop(0, "rgba(140,48,28,0.28)");
        glow.addColorStop(1, "rgba(140,48,28,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);

        // Vân sơn: vệt ngang mờ.
        for (let i = 0; i < h / 3; i++) {
            const y = rnd() * h;
            ctx.strokeStyle = rnd() < 0.5 ? "rgba(255,210,150,0.025)" : "rgba(0,0,0,0.06)";
            ctx.lineWidth = 0.5 + rnd() * 1.5;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.bezierCurveTo(w * 0.3, y + (rnd() - 0.5) * 6, w * 0.7, y + (rnd() - 0.5) * 6, w, y + (rnd() - 0.5) * 4);
            ctx.stroke();
        }
        ctx.restore();

        _innerShadow(ctx, path, "rgba(0,0,0,0.8)", 10);
        _grain(ctx, 5, rnd);

        // Viền đồng thau + chỉ trong.
        ctx.lineJoin = "miter";
        _chamferPath(ctx, 1.5, 1.5, w - 3, h - 3, c - 0.6);
        ctx.strokeStyle = _brass(ctx, 0, 0, w, h);
        ctx.lineWidth = 2.6;
        ctx.stroke();

        _chamferPath(ctx, 6, 6, w - 12, h - 12, Math.max(1, c - 2.5));
        ctx.strokeStyle = "rgba(217,164,65,0.42)";
        ctx.lineWidth = 1;
        ctx.stroke();

        if (ornate) {
            const brass = _brass(ctx, 0, 0, w, h);
            const s = 22;
            _corner(ctx, 10, 10, 1, 1, s, brass, 1.6);
            _corner(ctx, w - 10, 10, -1, 1, s, brass, 1.6);
            _corner(ctx, 10, h - 10, 1, -1, s, brass, 1.6);
            _corner(ctx, w - 10, h - 10, -1, -1, s, brass, 1.6);
        }
    });

    const root = new Container();
    const s = _sprite(texture);
    s.alpha = opt.alpha ?? 1;
    root.addChild(s);
    return root;
}

/**
 * Tấm mực tối — nhãn trên khung cảnh. Giữ chữ ký cũ; giờ là bảng sơn mài.
 *
 * @param {number} w
 * @param {number} h
 * @param {number} [radius] độ vát góc (giữ tên tham số cũ)
 * @param {number} [alpha]
 */
export function inkPanel(w, h, radius = 12, alpha = 0.92) {
    return lacquerPanel(w, h, { chamfer: Math.min(radius, 14), alpha: Math.max(alpha, 0.88) });
}

/** Bảng lớn có hoa góc — bộ sưu tập, chuyển cảnh, banner mở chương. */
export function framePanel(w, h, alpha = 1) {
    return lacquerPanel(w, h, { chamfer: 18, ornate: true, alpha });
}

/**
 * Vẽ hình vát góc lên một `Graphics` (ô vật, tab, thẻ cảnh — những thứ đổi
 * màu khi trỏ chuột nên vẽ lại liên tục, không đáng làm texture).
 *
 * @param {Graphics} g
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} [c]
 */
export function chamfer(g, x, y, w, h, c = 8) {
    return g.poly(_chamferPoints(x, y, w, h, c));
}

/**
 * Khung ô lõm (ô vật, ô bộ sưu tập, thẻ cảnh): nền tối, viền đồng, chỉ trong.
 *
 * @param {Graphics} g
 * @param {number} w
 * @param {number} h
 * @param {{ fill?: number, fillAlpha?: number, border?: number, borderAlpha?: number, width?: number, c?: number }} [o]
 */
export function drawSlot(g, w, h, o = {}) {
    const c = o.c ?? 8;
    chamfer(g, 0, 0, w, h, c).fill({ color: o.fill ?? 0x0f0805, alpha: o.fillAlpha ?? 0.6 });
    chamfer(g, 0, 0, w, h, c).stroke({ color: o.border ?? UI.gold, width: o.width ?? 1.4, alpha: o.borderAlpha ?? 0.75 });
    chamfer(g, 4, 4, w - 8, h - 8, Math.max(1, c - 3)).stroke({ color: UI.gold, width: 0.8, alpha: (o.borderAlpha ?? 0.75) * 0.35 });
    return g;
}

/**
 * Đường kẻ trang trí: hai nét mảnh, thoi ở giữa, chấm ở hai đầu.
 *
 * @param {number} w
 * @param {number} [color]
 * @param {number} [alpha]
 */
export function ornamentRule(w, color = UI.gold, alpha = 0.9) {
    const g = new Graphics();
    const m = w / 2;
    g.moveTo(0, 0).lineTo(m - 10, 0).stroke({ color, width: 1, alpha });
    g.moveTo(m + 10, 0).lineTo(w, 0).stroke({ color, width: 1, alpha });
    g.poly([m - 6, 0, m, -5, m + 6, 0, m, 5]).fill({ color, alpha });
    g.circle(-3, 0, 1.8).fill({ color, alpha });
    g.circle(w + 3, 0, 1.8).fill({ color, alpha });
    return g;
}

/**
 * Dấu xi đỏ có chữ ✓ — đánh dấu vật đã tìm.
 *
 * @param {number} x tâm
 * @param {number} y
 * @param {number} [r]
 */
export function waxSeal(x, y, r = 10) {
    const g = new Graphics();
    // mép xi chảy: vài cánh tròn lệch nhau
    for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + 0.4;
        g.circle(x + Math.cos(a) * r * 0.32, y + Math.sin(a) * r * 0.32, r * 0.78).fill(0x8c231d);
    }
    g.circle(x, y, r * 0.86).fill(0xa8322a);
    g.circle(x, y, r * 0.62).stroke({ color: 0x6e1712, width: 1.2 });
    g.moveTo(x - r * 0.38, y).lineTo(x - r * 0.1, y + r * 0.3).lineTo(x + r * 0.42, y - r * 0.32)
        .stroke({ color: 0xffe0b0, width: Math.max(1.6, r * 0.2), cap: "round", join: "round" });
    return g;
}

// ══ NÚT ═════════════════════════════════════════════════════════════════════

function _plateTexture(w, h, variant, hover) {
    return _texture(`plate:${variant}:${w}x${h}:${hover}`, w, h, (ctx, w, h, rnd) => {
        const c = Math.min(12, h * 0.3);

        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.55)";
        ctx.shadowBlur = 8 * RES;
        ctx.shadowOffsetY = 4 * RES;
        _chamferPath(ctx, 0, 0, w, h, c);
        ctx.fillStyle = "#3a250f";
        ctx.fill();
        ctx.restore();

        if (variant === "gold") {
            const g = ctx.createLinearGradient(0, 0, 0, h);
            const t = hover ? 0.28 : 0;
            g.addColorStop(0, _mix("#f8e3a2", "#fff6d8", t));
            g.addColorStop(0.45, _mix("#e2ae4c", "#fff0c0", t));
            g.addColorStop(0.56, _mix("#c48d30", "#ffe7a8", t));
            g.addColorStop(1, _mix("#9e6b1d", "#e8bb64", t));
            _chamferPath(ctx, 0, 0, w, h, c);
            ctx.fillStyle = g;
            ctx.fill();

            ctx.save();
            _chamferPath(ctx, 0, 0, w, h, c);
            ctx.clip();
            _grain(ctx, 6, rnd);
            ctx.restore();

            // Chỉ khắc chìm bên trong + mép sáng phía trên.
            _chamferPath(ctx, 4, 4, w - 8, h - 8, Math.max(1, c - 2.5));
            ctx.strokeStyle = "rgba(96,58,14,0.55)";
            ctx.lineWidth = 1;
            ctx.stroke();
            _chamferPath(ctx, 5, 5, w - 10, h - 10, Math.max(1, c - 3));
            ctx.strokeStyle = "rgba(255,244,210,0.35)";
            ctx.lineWidth = 0.8;
            ctx.stroke();

            _chamferPath(ctx, 0.75, 0.75, w - 1.5, h - 1.5, c);
            ctx.strokeStyle = "#5e3c10";
            ctx.lineWidth = 1.5;
            ctx.stroke();
        } else {
            const g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, hover ? "#4a2c1c" : "#33201a");
            g.addColorStop(1, hover ? "#26150d" : "#170d08");
            _chamferPath(ctx, 0, 0, w, h, c);
            ctx.fillStyle = g;
            ctx.fill();

            _chamferPath(ctx, 1.2, 1.2, w - 2.4, h - 2.4, c);
            ctx.strokeStyle = _brass(ctx, 0, 0, w, h, hover ? 0.35 : 0);
            ctx.lineWidth = 2;
            ctx.stroke();
            _chamferPath(ctx, 5, 5, w - 10, h - 10, Math.max(1, c - 3));
            ctx.strokeStyle = "rgba(217,164,65,0.35)";
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }
    });
}

/**
 * Nút đồng thau góc vát (gold) hoặc bảng sơn mài viền đồng (ink).
 *
 * @param {string} text
 * @param {() => void} onClick
 * @param {{ width?: number, height?: number, fontSize?: number, variant?: "gold" | "ink" }} [opt]
 */
export function button(text, onClick, opt = {}) {
    const w = Math.round(opt.width ?? 220);
    const h = Math.round(opt.height ?? 52);
    const variant = opt.variant ?? "gold";
    const gold = variant === "gold";

    const root = new Container();
    root.eventMode = "static";
    root.cursor = "pointer";

    const idle = _plateTexture(w, h, variant, false);
    const hover = _plateTexture(w, h, variant, true);
    const plate = _sprite(idle);

    const txt = label(text, {
        fontFamily: UI.fontTitle,
        fontWeight: "bold",
        fontSize: opt.fontSize ?? 20,
        fill: gold ? 0x3a2410 : UI.goldLight,
        ...(gold
            ? { dropShadow: { color: 0xfff2cc, alpha: 0.55, blur: 0, distance: 1, angle: Math.PI / 2 } }
            : { dropShadow: { color: 0x000000, alpha: 0.6, blur: 2, distance: 1, angle: Math.PI / 2 } }),
    });
    txt.anchor.set(0.5);
    txt.position.set(w / 2, h / 2);

    const set = (on) => {
        plate.texture = on ? hover : idle;
        plate.y = -PAD - (on ? 1 : 0);
        txt.y = h / 2 - (on ? 1 : 0);
    };

    root.addChild(plate, txt);
    root.on("pointerover", () => set(true));
    root.on("pointerout", () => set(false));
    root.on("pointertap", (e) => {
        e.stopPropagation();
        onClick();
    });

    root.buttonWidth = w;
    root.buttonHeight = h;

    return root;
}

function _coinTexture(size, hover) {
    return _texture(`coin:${size}:${hover}`, size, size, (ctx, s, _h, rnd) => {
        const r = s / 2;

        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.55)";
        ctx.shadowBlur = 7 * RES;
        ctx.shadowOffsetY = 3 * RES;
        ctx.beginPath();
        ctx.arc(r, r, r, 0, Math.PI * 2);
        ctx.fillStyle = "#3a250f";
        ctx.fill();
        ctx.restore();

        // Vành đồng.
        ctx.beginPath();
        ctx.arc(r, r, r, 0, Math.PI * 2);
        ctx.fillStyle = _brass(ctx, 0, 0, s, s, hover ? 0.3 : 0);
        ctx.fill();

        // Vành hạt.
        const beads = Math.max(12, Math.round(s / 3));
        for (let i = 0; i < beads; i++) {
            const a = (i / beads) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(r + Math.cos(a) * (r - 3.2), r + Math.sin(a) * (r - 3.2), 0.95, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(90,55,14,0.7)";
            ctx.fill();
        }

        // Lòng sơn mài.
        const inner = r - 6;
        const g = ctx.createRadialGradient(r - inner * 0.35, r - inner * 0.45, 0, r, r, inner);
        g.addColorStop(0, hover ? "#5a3522" : "#40261a");
        g.addColorStop(1, hover ? "#24130b" : "#140a06");
        ctx.beginPath();
        ctx.arc(r, r, inner, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = "#5e3c10";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.save();
        ctx.beginPath();
        ctx.arc(r, r, r, 0, Math.PI * 2);
        ctx.clip();
        _grain(ctx, 5, rnd);
        ctx.restore();
    });
}

/**
 * Nút tròn như đồng xu: vành đồng có hạt, lòng sơn mài, biểu tượng chữ.
 *
 * @param {string} glyph
 * @param {() => void} onClick
 * @param {number} [size]
 */
export function roundButton(glyph, onClick, size = 50) {
    size = Math.round(size);

    const root = new Container();
    root.eventMode = "static";
    root.cursor = "pointer";

    const idle = _coinTexture(size, false);
    const hover = _coinTexture(size, true);
    const coin = _sprite(idle);

    const txt = label(glyph, { fontFamily: UI.fontTitle, fontWeight: "bold", fontSize: size * 0.44, fill: UI.goldLight });
    txt.anchor.set(0.5);
    txt.position.set(size / 2, size / 2);

    root.addChild(coin, txt);
    root.on("pointerover", () => {
        coin.texture = hover;
    });
    root.on("pointerout", () => {
        coin.texture = idle;
    });
    root.on("pointertap", (e) => {
        e.stopPropagation();
        onClick();
    });

    return root;
}
