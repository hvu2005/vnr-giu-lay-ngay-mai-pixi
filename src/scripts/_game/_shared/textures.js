import { Texture } from "pixi.js";

/**
 * Texture VẼ BẰNG CODE cho hiệu ứng nền (khói, tuyết, cánh hoa, quầng đèn…).
 *
 * Không có asset nào cho mấy thứ này trong bộ bàn giao, mà một đốm mờ tròn thì
 * vẽ bằng canvas 2D còn nhẹ hơn nhúng một file PNG. Mỗi loại dựng đúng một lần
 * rồi dùng chung — hệ hạt tạo hàng trăm Sprite, nhưng chỉ có năm texture.
 */

/** @type {Map<string, Texture>} */
const cache = new Map();

/**
 * @param {string} key
 * @param {number} w
 * @param {number} h
 * @param {(ctx: CanvasRenderingContext2D, w: number, h: number) => void} draw
 */
function _make(key, w, h, draw) {
    const hit = cache.get(key);
    if (hit) return hit;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    draw(canvas.getContext("2d"), w, h);

    const texture = Texture.from(canvas);
    cache.set(key, texture);

    return texture;
}

/** Đốm tròn trắng, mờ dần ra mép — khói, sương, quầng đèn. */
export function softTexture() {
    return _make("soft", 128, 128, (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.35, "rgba(255,255,255,0.55)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
    });
}

/** Chấm sáng nhỏ có lõi — bụi trong nắng, bông tuyết, đom đóm. */
export function moteTexture() {
    return _make("mote", 32, 32, (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.25, "rgba(255,255,255,0.8)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
    });
}

/** Cánh hoa mơ — elip trắng hồng có gân mờ. */
export function petalTexture() {
    return _make("petal", 24, 16, (ctx, w, h) => {
        ctx.translate(w / 2, h / 2);
        const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
        g.addColorStop(0, "#ffffff");
        g.addColorStop(1, "#f4c9d4");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, w / 2 - 1, h / 2 - 1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(200,120,140,0.35)";
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 3, 0);
        ctx.lineTo(w / 2 - 3, 0);
        ctx.stroke();
    });
}

/** Chim bay xa — hai nét cong hình chữ V, đủ để đọc được ở cỡ 20px. */
export function birdTexture() {
    return _make("bird", 40, 16, (ctx) => {
        ctx.strokeStyle = "rgba(40,32,28,0.85)";
        ctx.lineWidth = 2.4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(2, 4);
        ctx.quadraticCurveTo(12, 2, 20, 12);
        ctx.quadraticCurveTo(28, 2, 38, 4);
        ctx.stroke();
    });
}

/** Vệt khói thuốc mảnh — elip dài, mờ. */
export function wispTexture() {
    return _make("wisp", 48, 96, (ctx, w, h) => {
        // Vẽ một đốm TRÒN bán kính h/2 rồi bóp ngang lại còn rộng w.
        ctx.translate(w / 2, h / 2);
        ctx.scale(w / h, 1);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, h / 2);
        g.addColorStop(0, "rgba(255,255,255,0.9)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(-h / 2, -h / 2, h, h);
    });
}
