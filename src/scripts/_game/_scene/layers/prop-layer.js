import { Container, Sprite } from "pixi.js";

import { AMBIENCE } from "../../data/ambience";
import { chapterByKey } from "../../data/chapters";
import { LAYOUT_OVERRIDES } from "../../data/layout-overrides";
import LAYOUT from "../../data/layout.generated.json";
import { HINT } from "../../data/scene-config";
import { AlphaMask } from "../../_shared/alpha-mask";
import { assetByPath } from "../../_shared/asset-path";
import { createRippleFilter } from "../../_shared/ripple-filter";
import { play, SFX } from "../../_shared/sfx";

const TAU = Math.PI * 2;

/**
 * Vật thể tương tác + nhân vật nền, và toàn bộ phần "trỏ chuột" của game.
 *
 * ── TRỎ CHUỘT KHÔNG LỘ VẬT ──────────────────────────────────────────────────
 *
 * Như bản mới của hcm: di chuột qua vật chưa khám phá không sáng, không hiện
 * tên, không đổi con trỏ — người chơi phải nhìn mà tìm. Bấm trúng thì mở thẻ;
 * vật đã khám phá giữ viền vàng trong cảnh từ đó về sau.
 *
 * ── MỘT HANDLER Ở STAGE, KHÔNG PHẢI MỖI VẬT MỘT HANDLER ─────────────────────
 *
 * Như project tham khảo: vật thể không bật `eventMode`, cả layer chỉ nghe
 * `pointermove` / `pointertap` trên stage rồi tự dò theo HÌNH (`AlphaMask`),
 * không theo khung. Sự kiện nào có `target` khác stage nghĩa là chuột đang nằm
 * trên HUD / thẻ tư liệu → bỏ hover, không dò xuyên qua giao diện.
 *
 * Vật được phép che nhau khi hợp lý về không gian (vật gần che vật xa). Dò từ
 * vật vẽ TRÊN CÙNG xuống, nên chỗ chồng nhau người chơi bấm trúng đúng vật mình
 * nhìn thấy. Thứ tự vẽ theo chiều sâu — xem `enter()`.
 *
 * ── ẢNH 1.5× ────────────────────────────────────────────────────────────────
 *
 * Texture xuất ở `artScale` lần khung thiết kế. Sprite đặt `scale = 1/artScale`
 * làm GỐC; idle (thở, nhấp nhô) nhân thêm lên gốc đó. `AlphaMask` đọc theo pixel
 * texture, còn `toLocal` đã tự chia tỉ lệ — nên dò chuột không cần biết artScale.
 *
 * ── BÓNG ĐỔ ─────────────────────────────────────────────────────────────────
 *
 * Người / vật chuyển động có bóng tách riêng (`shadow_<id>.webp`, chỉ có độ
 * tối). Bóng nằm dưới mọi vật, KHÔNG idle và KHÔNG nhận viền vàng: người thở
 * mà bóng trên đất vẫn yên, viền sáng chỉ ôm thân người.
 *
 * ── IDLE ────────────────────────────────────────────────────────────────────
 *
 * Cấu hình ở `data/ambience.js`. Mỗi kiểu idle chọn điểm neo riêng (thở thì
 * neo ở bàn chân, cờ neo ở cột…) nên sprite đặt bằng `anchor` + vị trí điểm neo.
 *
 * ── CHẾ ĐỘ CHỈNH BỐ CỤC (`?edit` trên URL) ──────────────────────────────────
 *
 * Kéo thả vật thể để dời chỗ, phím P in bảng dời chỗ để dán vào
 * `data/layout-overrides.js`. Hiếm khi cần: sprite cắt từ chính ảnh master nên
 * vị trí sinh tự động đã trùng pixel.
 */

/**
 * @typedef {{
 *   id: string,
 *   item: import("../../data/chapters").ChapterItem | null,
 *   sprite: Sprite,
 *   mask: AlphaMask | null,
 *   idle: any,
 *   base: number,
 *   baseX: number, baseY: number,
 *   baseFilters: import("pixi.js").Filter[] | null,
 *   hintUntil: number,
 * }} Entry
 */

export class PropLayer {
    /**
     * @param {import("../game-scene").GameScene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.view = new Container();
        this.shadows = new Container();
        this.bodies = new Container();
        this.view.addChild(this.shadows, this.bodies);

        /** @type {Entry[]} vật tương tác, THEO THỨ TỰ VẼ (dưới → trên) */
        this.props = [];

        /** @type {Entry[]} nhân vật nền, không tương tác */
        this.actors = [];

        /** @type {Entry | null} */
        this.hovered = null;

        /** Tắt hẳn việc dò chuột (lúc đang mở thẻ, đang chuyển cảnh…). */
        this.enabled = false;

        this.editMode = new URLSearchParams(location.search).has("edit");

        this._time = 0;
        this._hintReadyAt = 0;
        this._chapterKey = null;

        /** Vật vừa được gợi ý bằng LỜI — bấm "?" lần nữa thì chỉ vị trí. */
        this._hinted = null;
    }

    init() {
        this.scene.stage.world.addChild(this.view);
        this._bindInput();
    }

    /** @param {string} key */
    enter(key) {
        this._chapterKey = key;

        const layout = LAYOUT[key];
        const chapter = chapterByKey(key);
        const amb = AMBIENCE[key] ?? {};
        const overrides = LAYOUT_OVERRIDES[key] ?? {};
        const base = 1 / (layout.artScale ?? 1);

        (layout.actors ?? []).forEach((info, k) => {
            const entry = this._build(`actor_${k}`, info, amb.actors?.[k], null, base);
            this.actors.push(entry);
        });

        const props = [];

        for (const item of chapter.items) {
            const info = layout.props[item.id];

            if (!info) {
                console.warn(`[props] ${key}/${item.id} không có sprite trong layout.generated.json — bỏ qua`);
                continue;
            }

            const moved = overrides[item.id];
            const placed = moved ? { ...info, x: moved.x, y: moved.y } : info;

            props.push(this._build(item.id, placed, amb.props?.[item.id], item, base));
        }

        // Thứ tự vẽ = CHIỀU SÂU: vật có chân thấp hơn trên màn (gần camera hơn)
        // vẽ sau, nên che đúng vật ở xa và được dò chuột trước. Vật được phép đè
        // nhau khi hợp lý về không gian (cổng Dinh Độc Lập đè lên xe tăng phía
        // sau…). Vật treo / gắn trên vật khác (cờ trên nóc hầm, giấy trên bục)
        // khai `z` trong `ambience.js` để nằm trên dù chân cao hơn.
        const depth = (e) => e.idle?.z ?? (e.footY ?? 0);
        props.sort((a, b) => depth(a) - depth(b));

        for (const entry of this.actors) this.bodies.addChild(entry.sprite);

        for (const entry of props) {
            entry.mask = new AlphaMask(entry.sprite.texture);
            this.bodies.addChild(entry.sprite);
            this.props.push(entry);
        }

        this._hintReadyAt = 0;
        this._hinted = null;
    }

    leave() {
        this._setHover(null);
        this.props.length = 0;
        this.actors.length = 0;

        for (const child of this.shadows.removeChildren()) child.destroy();
        for (const child of this.bodies.removeChildren()) child.destroy();
    }

    /**
     * @param {string} id
     * @param {{ file: string, x: number, y: number, w: number, h: number,
     *   shadow?: { file: string, x: number, y: number } }} info
     * @param {any} idle
     * @param {import("../../data/chapters").ChapterItem | null} item
     * @param {number} base tỉ lệ gốc = 1 / artScale
     * @returns {Entry}
     */
    _build(id, info, idle, item, base) {
        if (info.shadow) {
            const shadow = new Sprite(assetByPath(info.shadow.file));
            shadow.scale.set(base);
            shadow.position.set(info.shadow.x, info.shadow.y);
            this.shadows.addChild(shadow);
        }

        const sprite = new Sprite(assetByPath(info.file));
        const [ax, ay] = _anchorFor(idle);

        sprite.anchor.set(ax, ay);
        sprite.scale.set(base);
        sprite.position.set(info.x + info.w * ax, info.y + info.h * ay);

        /** @type {import("pixi.js").Filter[] | null} */
        let baseFilters = null;

        if (idle?.type === "flag") {
            baseFilters = [createRippleFilter({ mode: "cloth", amp: 6, freq: 9, speed: 4, ...idle, anchor: idle.pole })];
            sprite.filters = baseFilters;
        }

        return {
            id, item, sprite, mask: null,
            idle: idle ? { period: 3, phase: Math.random() * TAU, ...idle } : null,
            base,
            baseX: sprite.x, baseY: sprite.y,
            footY: info.y + info.h,
            baseFilters,
            hintUntil: 0,
            lit: false,
        };
    }

    // ══ IDLE ═════════════════════════════════════════════════════════════════

    /** @param {number} dt */
    update(dt) {
        this._time += dt;

        for (const e of this.actors) _applyIdle(e, this._time, dt);
        for (const e of this.props) _applyIdle(e, this._time, dt);

        // Viền vàng = vật ĐÃ KHÁM PHÁ (giữ luôn), hoặc vật đang được gợi ý.
        // Trỏ chuột vào vật chưa tìm thì KHÔNG sáng — như hcm-di-tim-con-duong:
        // lộ sẵn thì người chơi chỉ cần quét chuột là thấy hết, mất phần "tìm".
        const progress = this.scene.progress;
        for (const e of this.props) {
            if (e.hintUntil && this._time > e.hintUntil) e.hintUntil = 0;

            const lit = e.hintUntil > 0 || progress.isFound(this._chapterKey, e.id);
            if (lit !== e.lit) {
                e.lit = lit;
                this._glow(e, lit);
            }
        }

        this.scene.glow.update(dt);
    }

    /**
     * Bật/tắt viền vàng mà KHÔNG làm mất filter riêng của vật (sóng cờ).
     *
     * @param {Entry} e
     * @param {boolean} on
     */
    _glow(e, on) {
        const own = e.baseFilters ?? [];
        e.sprite.filters = on ? [...own, ...this.scene.glow.filters] : (own.length ? own : null);
    }

    // ══ TRỎ CHUỘT ════════════════════════════════════════════════════════════

    _bindInput() {
        const stage = this.scene.pixi.stage;
        stage.eventMode = "static";

        let drag = null;

        stage.on("pointermove", (event) => {
            if (drag) {
                const p = this.scene.stage.toArt(event.global);
                drag.entry.sprite.x = drag.entry.baseX = p.x - drag.dx;
                drag.entry.sprite.y = drag.entry.baseY = p.y - drag.dy;
                return;
            }

            if (!this.enabled || event.target !== stage) {
                this._setHover(null);
                return;
            }

            this.scene.noteActivity();
            this._setHover(this.pick(event.global));
        });

        stage.on("pointerdown", (event) => {
            if (!this.enabled || event.target !== stage) return;

            const entry = this.pick(event.global);

            if (this.editMode && entry) {
                const p = this.scene.stage.toArt(event.global);
                drag = { entry, dx: p.x - entry.sprite.x, dy: p.y - entry.sprite.y };
                return;
            }

            // Màn cảm ứng không có "trỏ vào": chạm xuống là sáng luôn, để người
            // chơi thấy mình chạm trúng gì trước khi thẻ mở ra.
            this._setHover(entry);
        });

        stage.on("pointerup", () => {
            drag = null;
        });

        stage.on("pointertap", (event) => {
            if (!this.enabled || this.editMode || event.target !== stage) return;

            const entry = this.pick(event.global);

            if (entry) this.scene.openItem(entry.id);
        });

        if (this.editMode) {
            window.addEventListener("keydown", (e) => {
                if (e.key === "p" || e.key === "P") this._printOverrides();
            });
            console.log("[edit] Kéo thả vật thể để dời chỗ, bấm P để in bảng dời chỗ.");
        }
    }

    /**
     * Vật TRÊN CÙNG có pixel đặc ngay dưới con trỏ.
     *
     * @param {import("pixi.js").PointData} global
     * @returns {Entry | null}
     */
    pick(global) {
        for (let i = this.props.length - 1; i >= 0; i--) {
            const e = this.props[i];
            const local = e.sprite.toLocal(global);
            const tex = e.sprite.texture;

            // `toLocal` tính từ điểm neo; mặt nạ tính từ góc trên trái texture.
            const tx = local.x + e.sprite.anchor.x * tex.width;
            const ty = local.y + e.sprite.anchor.y * tex.height;

            if (e.mask.hit(tx, ty)) return e;
        }

        return null;
    }

    /** @param {Entry | null} entry */
    _setHover(entry) {
        if (entry === this.hovered) return;

        // Trỏ vào KHÔNG làm vật sáng viền, không hiện nhãn tên, không đổi con
        // trỏ (theo bản cập nhật "remove hover info & pointing" của hcm). Viền
        // vàng do `update()` lo: vật đã khám phá sáng luôn, vật đang gợi ý sáng tạm.
        this.hovered = entry;
    }

    /**
     * Gợi ý hai cấp — mục "Điều khiển và hỗ trợ" của high concept:
     *   cấp 1: NÓI vùng cần tìm (câu `hint` của vật, ví dụ "Tìm … ở phía gần");
     *   cấp 2: bấm lại khi vẫn chưa tìm ra → CHỈ vị trí, vật sáng một nhịp ngắn.
     *
     * @returns {{ level: 1 | 2, item: any } | null} `null` nếu đang hồi / hết vật
     */
    hint() {
        if (this._time < this._hintReadyAt) return null;

        const progress = this.scene.progress;
        const key = this._chapterKey;
        const left = this.props.filter((e) => !progress.isFound(key, e.id));

        // Còn vật bắt buộc thì chỉ gợi ý vật bắt buộc — vật ẩn là phần thưởng
        // cho người chịu khó nhìn, gợi ý nó sớm là làm hỏng phần đó.
        const required = left.filter((e) => e.item.kind === "required");
        const pool = required.length ? required : left;

        if (!pool.length) return null;

        if (this._hinted && pool.includes(this._hinted)) {
            const entry = this._hinted;
            entry.hintUntil = this._time + HINT.duration;
            this._hintReadyAt = this._time + HINT.cooldown;
            this._hinted = null;
            play(SFX.HINT);
            return { level: 2, item: entry.item };
        }

        const entry = pool[(Math.random() * pool.length) | 0];
        this._hinted = entry;
        this._hintReadyAt = this._time + 1.2;
        play(SFX.HINT);

        return { level: 1, item: entry.item };
    }

    /** Giây còn phải chờ trước khi gợi ý tiếp. */
    get hintCooldown() {
        return Math.max(0, this._hintReadyAt - this._time);
    }

    _printOverrides() {
        const out = {};

        for (const e of this.props) {
            const [ax, ay] = [e.sprite.anchor.x, e.sprite.anchor.y];
            const w = e.sprite.texture.width * e.base;
            const h = e.sprite.texture.height * e.base;
            out[e.id] = { x: Math.round(e.baseX - w * ax), y: Math.round(e.baseY - h * ay) };
        }

        console.log(`[edit] Dán vào LAYOUT_OVERRIDES["${this._chapterKey}"]:\n`
            + JSON.stringify(out, null, 4));
    }

    resize() {
    }

    dispose() {
        this.leave();
        this.view.destroy({ children: true });
    }
}

// ══ IDLE ════════════════════════════════════════════════════════════════════

/** Điểm neo theo kiểu idle — neo sai là thở bằng đầu, đung đưa quanh bụng. */
function _anchorFor(idle) {
    if (!idle) return [0.5, 0.5];
    if (idle.anchor) return idle.anchor;

    switch (idle.type) {
        case "breathe":
        case "bob":
            return [0.5, 1];
        case "wave":
            return [0.5, 0];
        default:
            return [0.5, 0.5];
    }
}

/**
 * @param {Entry} e
 * @param {number} time
 * @param {number} dt
 */
function _applyIdle(e, time, dt) {
    const idle = e.idle;
    if (!idle) return;

    const s = Math.sin((time / idle.period) * TAU + idle.phase);
    const sprite = e.sprite;
    const k = e.base;

    switch (idle.type) {
        case "breathe": {
            const a = idle.amp ?? 0.012;
            sprite.scale.set(k * (1 - a * 0.35 * s), k * (1 + a * s));
            break;
        }
        case "bob":
            sprite.y = e.baseY + (idle.amp ?? 2) * s;
            sprite.rotation = (idle.amp ?? 2) * 0.0015 * Math.cos((time / idle.period) * TAU + idle.phase);
            break;
        case "sway":
            sprite.rotation = (idle.amp ?? 0.015) * s;
            break;
        case "flutter": {
            // Hai nhịp chồng lên nhau + một "cơn gió" thưa → lật phật không đều.
            const gust = Math.max(0, Math.sin(time * 0.6 + idle.phase)) ** 6;
            const a = idle.amp ?? 0.04;
            sprite.rotation = a * (s + 0.5 * Math.sin(time * 5.3 + idle.phase)) * (0.4 + gust);
            sprite.y = e.baseY - gust * 3;
            break;
        }
        case "wave":
            sprite.skew.x = (idle.amp ?? 0.02) * s;
            sprite.scale.y = k * (1 + (idle.amp ?? 0.02) * 0.4 * Math.cos((time / idle.period) * TAU));
            break;
        case "flicker": {
            const n = Math.sin(time * 23 + idle.phase) * Math.sin(time * 7 + idle.phase * 3);
            sprite.alpha = 1 - (idle.amp ?? 0.2) * (0.5 + 0.5 * n);
            break;
        }
        case "flag":
            // Sóng vải chạy trong shader — chỉ cần đẩy thời gian.
            e.baseFilters[0].resources.rippleUniforms.uniforms.uTime += dt;
            break;
        default:
            break;
    }
}
