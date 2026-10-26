import { gsap } from "gsap";
import { BlurFilter, Container, Graphics, Sprite } from "pixi.js";

import { EPILOGUE } from "../../data/chapters";
import LAYOUT from "../../data/layout.generated.json";
import { DESIGN_HEIGHT, DESIGN_WIDTH, UI } from "../../data/scene-config";
import { assetByPath } from "../../_shared/asset-path";
import { button, label, title } from "../../_shared/ui";

/**
 * Cutscene giữa hai cảnh — gói nội dung: "Hai khung tranh và một khung chữ".
 *
 * Chưa có tranh riêng cho khung 1 và 2 (định mức 20 khung minh hoạ chưa sản
 * xuất), nên tạm dựng bằng NỀN CẢNH: khung 1 là cảnh vừa xong, khung 2 là cảnh
 * sắp tới — mờ, tối, trôi chậm kiểu Ken Burns — với lời người dẫn làm phụ đề.
 * Hai nền nối hai cảnh nên cutscene vẫn làm đúng việc "nối thời gian". Khi có
 * tranh thật thì thay `_backdrop()` bằng sprite của từng khung.
 *
 * Mô tả khung tranh trong gói (`frames[i][0]`) là ghi chú SẢN XUẤT cho hoạ sĩ,
 * không phải lời cho người chơi — chỉ hiện `frames[i][1]`.
 *
 * Chạm bất kỳ đâu để sang khung kế, nút "Bỏ qua" để kết thúc ngay ("Bỏ qua
 * toàn cutscene vẫn mở các thẻ Timeline tương ứng" — Timeline tính theo cảnh
 * đã qua, không theo khung đã xem, nên tự đúng).
 *
 * Sau CS10: lời kết + câu hỏi "Bạn muốn gìn giữ điều gì cho ngày mai?".
 */

const FRAME_SECONDS = 6;

export class CutsceneLayer {
    /**
     * @param {import("../game-scene").GameScene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.view = new Container({ eventMode: "static" });
        this.view.visible = false;
        this.content = new Container();
        this.tweens = [];
    }

    init() {
        const black = new Graphics().rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT).fill(0x07050a);
        this.view.addChild(black, this.content);
        this.view.on("pointertap", () => this._next());

        this.scene.stage.ui.addChild(this.view);
    }

    /**
     * @param {import("../../data/chapters").Chapter} chapter cảnh vừa xong
     * @param {import("../../data/chapters").Chapter | null} next cảnh kế, `null` = hết hành trình
     * @returns {Promise<void>}
     */
    play(chapter, next) {
        this._clear();

        const cs = chapter.cutscene;

        /** @type {Array<() => void>} */
        this.steps = [
            () => this._frame(chapter.key, cs.frames[0][1], 0),
            () => this._frame((next ?? chapter).key, cs.frames[1][1], 1),
            () => this._caption(cs.card, next),
        ];

        if (!next) this.steps.push(() => this._ending());

        const skip = button("Bỏ qua  ›", () => this._finish(), { width: 150, height: 44, fontSize: 17, variant: "ink" });
        skip.position.set(DESIGN_WIDTH - 150 - 24, DESIGN_HEIGHT - 44 - 24);
        this.skip = skip;
        this.view.addChild(skip);

        this.view.visible = true;
        this.view.alpha = 0;
        gsap.to(this.view, { alpha: 1, duration: 0.6 });

        this.index = -1;
        this._next();

        return new Promise((resolve) => {
            this._resolve = resolve;
        });
    }

    _next() {
        if (!this.steps || this._locked) return;

        this.index++;

        if (this.index >= this.steps.length) {
            this._finish();
            return;
        }

        this._auto?.kill();
        this._fadeOutContent(() => {
            this.steps[this.index]();

            // Khung cuối (chữ / lời kết) không tự qua — đợi người chơi đọc xong.
            const last = this.index >= this.steps.length - 1;
            if (!last) this._auto = gsap.delayedCall(FRAME_SECONDS, () => this._next());
        });
    }

    _finish() {
        if (!this.steps) return;

        this.steps = null;
        this._auto?.kill();

        gsap.to(this.view, {
            alpha: 0, duration: 0.6,
            onComplete: () => {
                this.view.visible = false;
                this._clear();
                this._resolve?.();
            },
        });
    }

    _fadeOutContent(then) {
        if (!this.content.children.length) {
            then();
            return;
        }

        this.tweens.push(gsap.to(this.content, {
            alpha: 0, duration: 0.4,
            onComplete: () => {
                this._clearContent();
                this.content.alpha = 1;
                then();
            },
        }));
    }

    // ══ CÁC KHUNG ════════════════════════════════════════════════════════════

    _backdrop(key, variant) {
        const layout = LAYOUT[key];
        const sprite = new Sprite(assetByPath(layout.bg));
        const base = 1 / (layout.artScale ?? 1);
        sprite.anchor.set(0.5);
        sprite.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);
        sprite.tint = variant === 0 ? 0x9a8a78 : 0x7a8496;
        sprite.alpha = 0.6;
        sprite.filters = [new BlurFilter({ strength: 3 })];

        // Ken Burns: mỗi khung trôi một hướng khác nhau.
        const from = variant === 0 ? { s: 1.06, x: -30 } : { s: 1.16, x: 30 };
        const to = variant === 0 ? { s: 1.14, x: 30 } : { s: 1.08, x: -30 };
        sprite.scale.set(from.s * base);
        sprite.x += from.x;

        this.tweens.push(
            gsap.to(sprite.scale, { x: to.s * base, y: to.s * base, duration: FRAME_SECONDS + 1, ease: "none" }),
            gsap.to(sprite, { x: DESIGN_WIDTH / 2 + to.x, duration: FRAME_SECONDS + 1, ease: "none" }),
        );

        return sprite;
    }

    _frame(key, text, variant) {
        const vignette = new Graphics()
            .rect(0, DESIGN_HEIGHT - 230, DESIGN_WIDTH, 230).fill({ color: 0x000000, alpha: 0.55 });

        const t = label(text, {
            fontFamily: UI.fontTitle, fontSize: 30, fontStyle: "italic", fill: UI.paper,
            align: "center", wordWrap: true, wordWrapWidth: 1040, lineHeight: 42,
            dropShadow: { color: 0x000000, blur: 8, distance: 0, alpha: 1 },
        });
        t.anchor.set(0.5);
        t.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 135);

        const counter = label(`${variant + 1} / 3`, { fontFamily: UI.fontBody, fontSize: 14, fill: UI.gold });
        counter.position.set(28, DESIGN_HEIGHT - 48);

        this.content.addChild(this._backdrop(key, variant), vignette, t, counter);
        this.tweens.push(gsap.fromTo(t, { alpha: 0, y: t.y + 16 }, { alpha: 1, y: t.y, duration: 1.2 }));
    }

    /**
     * Khung chữ: "19 · 12 · 1946 — Toàn quốc kháng chiến" → ngày to, tên dưới.
     *
     * @param {string} card
     * @param {import("../../data/chapters").Chapter | null} next
     */
    _caption(card, next) {
        const [head, tail] = card.split(" — ");

        const big = title(head, { fontSize: tail ? 58 : 50, fill: UI.goldLight, align: "center" });
        big.anchor.set(0.5);
        big.position.set(DESIGN_WIDTH / 2, 280);

        const rule = new Graphics()
            .moveTo(DESIGN_WIDTH / 2 - 80, 340).lineTo(DESIGN_WIDTH / 2 + 80, 340)
            .stroke({ color: UI.gold, width: 2 });

        this.content.addChild(big, rule);

        if (tail) {
            const name = label(tail, {
                fontFamily: UI.fontTitle, fontSize: 30, fontStyle: "italic", fill: UI.paper, align: "center",
            });
            name.anchor.set(0.5, 0);
            name.position.set(DESIGN_WIDTH / 2, 366);
            this.content.addChild(name);
            this.tweens.push(gsap.fromTo(name, { alpha: 0 }, { alpha: 1, duration: 1.2, delay: 0.8 }));
        }

        if (next) {
            const place = label(next.place, { fontFamily: UI.fontBody, fontSize: 17, fill: 0xcfc3ad });
            place.anchor.set(0.5, 0);
            place.position.set(DESIGN_WIDTH / 2, 420);
            this.content.addChild(place);
            this.tweens.push(gsap.fromTo(place, { alpha: 0 }, { alpha: 1, duration: 1, delay: 1.4 }));
        }

        const hint = label("Chạm để tiếp tục", { fontFamily: UI.fontBody, fontSize: 14, fill: UI.gold });
        hint.anchor.set(0.5);
        hint.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 60);
        this.content.addChild(hint);

        this.tweens.push(
            gsap.fromTo(big, { alpha: 0 }, { alpha: 1, duration: 1.4 }),
            gsap.to(hint, { alpha: 0.3, duration: 0.9, yoyo: true, repeat: -1 }),
        );
    }

    /** Lời kết + câu hỏi cá nhân (chỉ lưu máy này, không đổi kết thúc). */
    _ending() {
        const lines = label(EPILOGUE.lines.join("\n"), {
            fontFamily: UI.fontTitle, fontSize: 25, fontStyle: "italic", fill: UI.paper,
            align: "center", wordWrap: true, wordWrapWidth: 980, lineHeight: 36,
        });
        lines.anchor.set(0.5, 0);
        lines.position.set(DESIGN_WIDTH / 2, 150);

        const q = title(EPILOGUE.question, { fontSize: 32, fill: UI.goldLight, align: "center" });
        q.anchor.set(0.5);
        q.position.set(DESIGN_WIDTH / 2, lines.y + lines.height + 70);

        this.content.addChild(lines, q);

        // Chọn một đáp án thì lưu, không chấm điểm, không xếp hạng.
        this._locked = true;
        const answer = label("", { fontFamily: UI.fontTitle, fontSize: 20, fontStyle: "italic", fill: UI.paper });
        answer.anchor.set(0.5);
        answer.position.set(DESIGN_WIDTH / 2, q.y + 150);

        const opts = EPILOGUE.options;
        const bw = 260;
        const x0 = (DESIGN_WIDTH - (opts.length * bw + (opts.length - 1) * 20)) / 2;
        opts.forEach((text, i) => {
            const b = button(text, () => {
                this.scene.progress.setNote(text);
                answer.text = `Cảm ơn bạn. Điều bạn chọn — “${text}” — đã được lưu trên thiết bị này.`;
                this._locked = false;
            }, { width: bw, height: 50, fontSize: 18, variant: "ink" });
            b.position.set(x0 + i * (bw + 20), q.y + 50);
            this.content.addChild(b);
        });

        const done = label("Chạm để về màn hình chính", { fontFamily: UI.fontBody, fontSize: 14, fill: UI.gold });
        done.anchor.set(0.5);
        done.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 60);

        this.content.addChild(answer, done);
        this.tweens.push(
            gsap.fromTo(lines, { alpha: 0 }, { alpha: 1, duration: 2 }),
            gsap.fromTo(q, { alpha: 0 }, { alpha: 1, duration: 1.4, delay: 1.6 }),
        );

        // Không bắt buộc trả lời — sau vài giây chạm nền vẫn đi tiếp được.
        this.tweens.push(gsap.delayedCall(4, () => {
            this._locked = false;
        }));
    }

    _clearContent() {
        for (const t of this.tweens) t.kill();
        this.tweens.length = 0;

        for (const child of this.content.removeChildren()) child.destroy({ children: true });
    }

    _clear() {
        this._locked = false;
        this._clearContent();
        this.skip?.destroy({ children: true });
        this.skip = null;
    }

    update() {
    }

    resize() {
    }

    dispose() {
        this._clear();
        this.view.destroy({ children: true });
    }
}
