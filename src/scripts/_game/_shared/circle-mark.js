import { Container, Graphics, Sprite } from "pixi.js";

import { CIRCLE_MARK } from "../data/scene-config";
import RINGS from "../data/rings.generated.json";
import { assetByPath } from "./asset-path";

const TAU = Math.PI * 2;

/**
 * Vòng khoanh cọ đỏ quanh một vật — thay viền vàng.
 *
 * ── NHIỀU CỠ MÀ NÉT VẪN ĐỀU ─────────────────────────────────────────────────
 *
 * Một vòng duy nhất co giãn cho mọi vật thì micro (35×140) ra nét chỉ, đoàn
 * người (510×275) ra nét bè, bầu dục dọc kéo từ vòng tròn thì nét ngang dày
 * gấp ba nét dọc. Bộ vòng (`rings.generated.json`, `tools/brush-rings.py`) có
 * nhiều tỉ lệ khung (tròn, ngang, dọc) × nhiều độ đậm nét; mỗi vật chọn vòng
 * có tỉ lệ gần khung vòng cần vẽ nhất VÀ nét sau co giãn gần nét chuẩn nhất.
 * Lật ngang theo id vật cho hai vật cạnh nhau ít khi trùng hệt một vòng.
 *
 * ── HIỆU ỨNG KHOANH ─────────────────────────────────────────────────────────
 *
 * Mặt nạ hình quạt quét theo góc quanh tâm vòng (từ mép đoạn chồng đầu–đuôi
 * của nét cọ, xem brush-rings.py) → nét hiện dần như cây cọ đang khoanh; cùng
 * lúc cả vòng xoáy vào: xoay từ `swirlTurn` về 0, thu từ `swirlScale` về 1.
 * Khoanh xong thì gỡ mặt nạ (khỏi tốn stencil mỗi khung).
 */
export class CircleMark {
    /**
     * @param {{ x: number, y: number, w: number, h: number }} box khung vật, px thiết kế
     * @param {string} seed id vật — chọn lật ngang ổn định
     */
    constructor(box, seed) {
        const c = CIRCLE_MARK;
        const W = Math.max(c.minSize, box.w * c.growX + c.pad * 2);
        const H = Math.max(c.minSize, box.h * c.growY + c.pad * 2);
        const stroke = Math.min(c.strokeMax, Math.max(c.strokeMin, c.strokeK * Math.min(W, H)));
        const ring = pickRing(W, H, stroke);

        this.view = new Container();
        this.view.position.set(box.x + box.w / 2, box.y + box.h / 2);
        this.view.visible = false;

        // Lệch tỉ lệ quá `maxStretch` thì chịu vòng hơi khác khung còn hơn nét méo.
        let sx = W / ring.w;
        let sy = H / ring.h;
        const k = Math.sqrt(sx * sy);
        const lim = c.maxStretch;
        sx = Math.min(k * lim, Math.max(k / lim, sx));
        sy = Math.min(k * lim, Math.max(k / lim, sy));

        this.inner = new Container();
        this.inner.scale.set(_hash(seed) & 1 ? -sx : sx, sy);
        this.view.addChild(this.inner);

        this.sprite = new Sprite(assetByPath(ring.file));
        this.sprite.anchor.set(ring.cx, ring.cy);
        this.inner.addChild(this.sprite);

        this._ring = ring;
        this._radius = Math.hypot(ring.w, ring.h);
        this._wipe = new Graphics();
        this.inner.addChild(this._wipe);

        this._time = 0;
        this._phase = (_hash(seed) % 100) / 100 * TAU;
        /** 0..1 tiến độ khoanh; -1 = đứng yên. */
        this._draw = -1;
        /** 1..0 tiến độ mờ đi; -1 = không mờ. */
        this._fade = -1;
    }

    /** @param {boolean} animate khoanh có hiệu ứng (tìm thấy / gợi ý) hay hiện sẵn (vào cảnh) */
    show(animate) {
        this.view.visible = true;
        this.view.alpha = 1;
        this._fade = -1;

        if (animate) {
            this._draw = 0;
            this.sprite.mask = this._wipe;
            this._wipe.visible = true;
            this._paint(0);
        } else {
            this._draw = -1;
            this._finishDraw();
        }
    }

    /** @param {boolean} animate */
    hide(animate) {
        if (!this.view.visible) return;

        if (animate) {
            this._fade = 1;
        } else {
            this.view.visible = false;
            this._fade = -1;
        }
    }

    /** @param {number} dt */
    update(dt) {
        if (!this.view.visible) return;

        const c = CIRCLE_MARK;
        this._time += dt;

        let turn = 0;
        let scale = 1 + c.breathe * Math.sin((this._time / c.breathePeriod) * TAU + this._phase);

        if (this._draw >= 0) {
            this._draw = Math.min(1, this._draw + dt / c.drawTime);
            const p = this._draw;
            // Chậm – nhanh – chậm như tay cầm cọ: đặt cọ, quét, nhấc cọ.
            this._paint(0.5 - 0.5 * Math.cos(Math.PI * p));

            const q = _backOut(p);
            turn = c.swirlTurn * (1 - q);
            scale *= c.swirlScale + (1 - c.swirlScale) * q;

            if (p >= 1) {
                this._draw = -1;
                this._finishDraw();
            }
        }

        if (this._fade >= 0) {
            this._fade = Math.max(0, this._fade - dt / c.fadeTime);
            this.view.alpha = this._fade;

            if (this._fade <= 0) {
                this._fade = -1;
                this.view.visible = false;
            }
        }

        this.view.rotation = turn;
        this.view.scale.set(scale);
    }

    destroy() {
        this.sprite.mask = null;
        this.view.destroy({ children: true });
    }

    /** Quạt mặt nạ từ góc bắt đầu, mở `p` vòng (toạ độ texture quanh tâm vòng). */
    _paint(p) {
        const { start, dir } = this._ring;
        const g = this._wipe;

        g.clear();
        if (p <= 0) return;

        g.moveTo(0, 0)
            .arc(0, 0, this._radius, start, start + dir * p * TAU * 1.02, dir < 0)
            .closePath()
            .fill(0xffffff);
    }

    _finishDraw() {
        this.sprite.mask = null;
        this._wipe.clear();
        this._wipe.visible = false;
    }
}

/**
 * Vòng hợp nhất cho khung W×H với nét chuẩn `stroke`: lệch tỉ lệ khung nặng
 * gấp đôi lệch độ dày nét (méo dáng lộ hơn nét đậm nhạt).
 */
function pickRing(W, H, stroke) {
    let best = RINGS[0];
    let bestCost = Infinity;

    for (const r of RINGS) {
        const aspect = Math.abs(Math.log((r.w / r.h) / (W / H)));
        const k = Math.sqrt((W / r.w) * (H / r.h));
        const weight = Math.abs(Math.log((r.stroke * k) / stroke));
        const cost = 2 * aspect + weight;

        if (cost < bestCost) {
            bestCost = cost;
            best = r;
        }
    }

    return best;
}

function _backOut(t) {
    const s = 1.6;
    const u = t - 1;
    return 1 + (s + 1) * u * u * u + s * u * u;
}

/** @param {string} s */
function _hash(s) {
    let h = 7;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}
