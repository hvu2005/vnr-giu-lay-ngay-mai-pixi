/**
 * Mặt nạ alpha của một texture, để dò chuột theo HÌNH THẬT của vật thể.
 *
 * ── VÌ SAO KHÔNG DÙNG HIT TEST CỦA PIXI ─────────────────────────────────────
 *
 * Pixi dò theo HÌNH CHỮ NHẬT bao sprite. Vật thể ở đây méo mó và chồng lên
 * nhau (ống khói nằm trong khung con tàu, tờ báo nằm trong khung cầu tàu…):
 * dò theo khung thì trỏ vào khoảng trời cạnh cột buồm cũng sáng con tàu — mà
 * viền vàng lại vẽ đúng theo hình, nên người chơi thấy sáng một vật mình
 * không hề chỉ vào.
 *
 * Nên đọc alpha của ảnh MỘT lần lúc nạp, lấy mẫu thưa (`STEP` px một ô) cho
 * nhẹ bộ nhớ, rồi mỗi lần chuột di chỉ là một phép tra mảng.
 */

const STEP = 2;

/** Ô có alpha dưới mức này coi như trong suốt — bỏ vệt mềm ở mép. */
const THRESHOLD = 60;

export class AlphaMask {
    /**
     * @param {import("pixi.js").Texture} texture
     */
    constructor(texture) {
        const source = texture.source;

        this.width = source.width;
        this.height = source.height;

        this.cols = Math.ceil(this.width / STEP);
        this.rows = Math.ceil(this.height / STEP);
        this.bits = new Uint8Array(this.cols * this.rows);

        const resource = source.resource;

        try {
            const canvas = document.createElement("canvas");
            canvas.width = this.cols;
            canvas.height = this.rows;

            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            ctx.drawImage(resource, 0, 0, this.cols, this.rows);

            const data = ctx.getImageData(0, 0, this.cols, this.rows).data;

            for (let i = 0; i < this.bits.length; i++) {
                this.bits[i] = data[i * 4 + 3] >= THRESHOLD ? 1 : 0;
            }
        } catch (error) {
            // Không đọc được pixel (resource lạ) → coi cả khung là đặc. Vẫn
            // chơi được, chỉ là dò theo hình chữ nhật như pixi.
            console.warn("[alpha-mask] không đọc được alpha, dùng khung chữ nhật:", error);
            this.bits.fill(1);
        }
    }

    /**
     * @param {number} x pixel của texture, gốc ở góc trên trái
     * @param {number} y
     */
    hit(x, y) {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;

        return this.bits[((y / STEP) | 0) * this.cols + ((x / STEP) | 0)] === 1;
    }
}
