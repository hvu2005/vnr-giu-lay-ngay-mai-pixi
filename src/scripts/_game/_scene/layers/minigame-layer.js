import { gsap } from "gsap";
import { Container, Graphics } from "pixi.js";

import { DESIGN_HEIGHT, DESIGN_WIDTH, UI } from "../../data/scene-config";
import { play, SFX } from "../../_shared/sfx";
import { button, label, paperPanel, title } from "../../_shared/ui";

/**
 * Ba mini-game của gói nội dung — chơi HOÀN TOÀN bằng click, không đồng hồ,
 * không điểm phạt (`accessibleInput`, `wrongAnswerPenalty: false`):
 *
 *   · "order" (MG01 chuỗi tiếp tế, MG03 nối Timeline): một hàng thẻ. Chọn một
 *     thẻ rồi chọn thẻ khác → hai thẻ đổi chỗ. "Kiểm tra" báo đúng/sai nhẹ.
 *   · "match" (MG02 giữ thành phố): chọn một chú thích rồi chọn bức tranh
 *     (khung mô tả) hợp với nó.
 *
 * Luôn có "Xem gợi ý" và "Tự sắp giúp tôi" — trợ giúp vẫn tính là qua
 * (`skipOutcome: "assisted"`), không tạo ngõ cụt.
 *
 * Kết quả trả qua Promise: "completed" | "assisted" | null (đóng giữa chừng).
 */
export class MinigameLayer {
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
        const dim = new Graphics().rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT).fill({ color: 0x000000, alpha: 0.7 });
        this.view.addChild(dim, this.content);
        this.scene.stage.ui.addChild(this.view);
    }

    get isOpen() {
        return this.view.visible;
    }

    /**
     * @param {any} mg mục trong `content-pack.minigames`
     * @returns {Promise<"completed" | "assisted" | null>}
     */
    open(mg) {
        this._clear();
        this.mg = mg;
        this.assisted = false;
        this.view.visible = true;
        gsap.fromTo(this.view, { alpha: 0 }, { alpha: 1, duration: 0.3 });

        const w = 1180;
        const h = 640;
        const panel = new Container();
        panel.position.set((DESIGN_WIDTH - w) / 2, (DESIGN_HEIGHT - h) / 2);
        panel.addChild(paperPanel(w, h));

        const head = title(mg.title, { fontSize: 30, fill: UI.ink });
        head.position.set(48, 30);
        const intro = label(mg.intro, {
            fontFamily: UI.fontBody, fontSize: 17, fill: UI.inkSoft, wordWrap: true, wordWrapWidth: w - 96, lineHeight: 24,
        });
        intro.position.set(48, 76);

        this.feedback = label("", {
            fontFamily: UI.fontTitle, fontSize: 19, fontStyle: "italic", fill: UI.inkSoft,
            wordWrap: true, wordWrapWidth: w - 96, align: "center", lineHeight: 26,
        });
        this.feedback.anchor.set(0.5, 0);
        this.feedback.position.set(w / 2, h - 150);

        this.board = new Container();
        this.board.position.set(0, 130);

        panel.addChild(head, intro, this.board, this.feedback);

        // ── Nút ──────────────────────────────────────────────────────────────
        const bar = new Container();
        const check = button("Kiểm tra", () => this._check(), { width: 170, height: 46, fontSize: 18 });
        const hint = button("Xem gợi ý", () => this._say(mg.hint), { width: 170, height: 46, fontSize: 18, variant: "ink" });
        const auto = button("Tự sắp giúp tôi", () => this._solve(), { width: 210, height: 46, fontSize: 18, variant: "ink" });
        const close = button("Để sau", () => this._finish(null), { width: 130, height: 46, fontSize: 17, variant: "ink" });
        [check, hint, auto, close].reduce((x, b) => {
            b.position.set(x, 0);
            bar.addChild(b);
            return x + b.buttonWidth + 16;
        }, 0);
        bar.position.set((w - bar.width) / 2, h - 76);
        panel.addChild(bar);
        this.checkButton = check;

        this.content.addChild(panel);
        this.panelW = w;

        if (mg.correctOrder) this._buildOrder(mg);
        else this._buildMatch(mg);

        play(SFX.OPEN);

        return new Promise((resolve) => {
            this._resolve = resolve;
        });
    }

    // ══ SẮP THỨ TỰ ═══════════════════════════════════════════════════════════

    _buildOrder(mg) {
        this.mode = "order";
        this.order = mg.initialOrder.slice();
        this.selected = -1;
        this._drawOrder();
    }

    _drawOrder() {
        for (const c of this.board.removeChildren()) c.destroy({ children: true });

        const n = this.order.length;
        const gap = 18;
        const cw = Math.min(250, (this.panelW - 96 - gap * (n - 1)) / n);
        const ch = n > 4 ? 190 : 210;
        const x0 = (this.panelW - (cw * n + gap * (n - 1))) / 2;

        // Mũi tên nối các ô — đọc được "trước → sau" mà không cần chữ.
        const arrows = new Graphics();
        for (let i = 0; i < n - 1; i++) {
            const ax = x0 + (i + 1) * (cw + gap) - gap / 2;
            arrows.moveTo(ax - 6, 40 + ch / 2 - 8).lineTo(ax + 2, 40 + ch / 2).lineTo(ax - 6, 40 + ch / 2 + 8)
                .stroke({ color: UI.gold, width: 3 });
        }
        this.board.addChild(arrows);

        this.order.forEach((id, i) => {
            const card = this.mg.cards.find((c) => c.id === id);
            const slot = label(`${i + 1}`, { fontFamily: UI.fontTitle, fontSize: 16, fontWeight: "bold", fill: UI.gold });
            slot.anchor.set(0.5);
            slot.position.set(x0 + i * (cw + gap) + cw / 2, 20);
            this.board.addChild(slot);

            const node = this._card(cw, ch, card.date ?? "", card.label, card.detail ?? "", i === this.selected);
            node.position.set(x0 + i * (cw + gap), 40);
            node.on("pointertap", (e) => {
                e.stopPropagation();
                this._pickOrder(i);
            });
            this.board.addChild(node);
        });
    }

    _pickOrder(i) {
        if (this.selected < 0) {
            this.selected = i;
            play(SFX.HOVER);
        } else if (this.selected === i) {
            this.selected = -1;
        } else {
            const o = this.order;
            [o[this.selected], o[i]] = [o[i], o[this.selected]];
            this.selected = -1;
            play(SFX.OPEN);
        }
        this._drawOrder();
    }

    // ══ GHÉP CHÚ THÍCH ═══════════════════════════════════════════════════════

    _buildMatch(mg) {
        this.mode = "match";
        /** @type {Record<string, string>} panelId → cardId */
        this.placed = {};
        this.selected = null;
        this._drawMatch();
    }

    _drawMatch() {
        for (const c of this.board.removeChildren()) c.destroy({ children: true });

        const panels = this.mg.panels;
        const n = panels.length;
        const gap = 18;
        const cw = (this.panelW - 96 - gap * (n - 1)) / n;
        const x0 = 48;

        panels.forEach((p, i) => {
            const cardId = this.placed[p.id];
            const card = this.mg.cards.find((c) => c.id === cardId);
            const node = this._card(cw, 200, `Tranh ${i + 1}`, card ? card.label : "Chọn chú thích rồi chọn tranh này",
                p.description, false, !card);
            node.position.set(x0 + i * (cw + gap), 0);
            node.on("pointertap", (e) => {
                e.stopPropagation();
                if (!this.selected) {
                    // Bấm tranh đã có chú thích mà chưa chọn gì → gỡ chú thích ra.
                    if (this.placed[p.id]) delete this.placed[p.id];
                } else {
                    for (const k of Object.keys(this.placed)) if (this.placed[k] === this.selected) delete this.placed[k];
                    this.placed[p.id] = this.selected;
                    this.selected = null;
                    play(SFX.OPEN);
                }
                this._drawMatch();
            });
            this.board.addChild(node);
        });

        // Hàng chú thích chưa dùng.
        const free = this.mg.cards.filter((c) => !Object.values(this.placed).includes(c.id));
        const lw = 240;
        const lx0 = (this.panelW - (free.length * (lw + gap) - gap)) / 2;
        free.forEach((c, i) => {
            const chip = this._chip(c.label, lw, c.id === this.selected);
            chip.position.set(lx0 + i * (lw + gap), 236);
            chip.on("pointertap", (e) => {
                e.stopPropagation();
                this.selected = this.selected === c.id ? null : c.id;
                play(SFX.HOVER);
                this._drawMatch();
            });
            this.board.addChild(chip);
        });
    }

    // ══ KIỂM TRA / TRỢ GIÚP ═════════════════════════════════════════════════

    _isCorrect() {
        if (this.mode === "order") return this.order.every((id, i) => id === this.mg.correctOrder[i]);
        return this.mg.cards.every((c) => this.placed[c.target] === c.id);
    }

    _check() {
        if (this._isCorrect()) {
            this._win();
            return;
        }
        // Sai thì nói nhẹ, không phạt, không rung màn — game giáo dục, người
        // chơi thử lại bao nhiêu lần cũng được.
        this._say(this.mg.wrongFeedback);
        play(SFX.CLOSE);
    }

    _solve() {
        this.assisted = true;
        if (this.mode === "order") {
            this.order = this.mg.correctOrder.slice();
            this.selected = -1;
            this._drawOrder();
        } else {
            this.placed = Object.fromEntries(this.mg.cards.map((c) => [c.target, c.id]));
            this.selected = null;
            this._drawMatch();
        }
        this._win();
    }

    _win() {
        play(SFX.COMPLETE);
        this._say(`${this.mg.successFeedback}\n${this.mg.explanation}`);
        this.checkButton.visible = false;

        const done = button("Tiếp tục  ➜", () => this._finish(this.assisted ? "assisted" : "completed"), { width: 200, height: 46, fontSize: 18 });
        done.position.set((this.panelW - 200) / 2, this.feedback.y + 70);
        this.feedback.parent.addChild(done);
        this.tweens.push(gsap.fromTo(done.scale, { x: 0.8, y: 0.8 }, { x: 1, y: 1, duration: 0.4, ease: "back.out(2)" }));
    }

    _say(text) {
        this.feedback.text = text;
        this.tweens.push(gsap.fromTo(this.feedback, { alpha: 0 }, { alpha: 1, duration: 0.35 }));
    }

    _finish(result) {
        gsap.to(this.view, {
            alpha: 0, duration: 0.3,
            onComplete: () => {
                this.view.visible = false;
                this._clear();
                const r = this._resolve;
                this._resolve = null;
                r?.(result);
            },
        });
    }

    // ══ KHỐI VẼ ══════════════════════════════════════════════════════════════

    _card(w, h, top, main, sub, selected, placeholder = false) {
        const c = new Container({ eventMode: "static" });
        c.cursor = "pointer";
        const g = new Graphics()
            .roundRect(3, 5, w, h, 12).fill({ color: 0x000000, alpha: 0.2 })
            .roundRect(0, 0, w, h, 12).fill(selected ? 0xfff2c8 : 0xfbf3df)
            .roundRect(0, 0, w, h, 12).stroke({ color: selected ? UI.red : UI.gold, width: selected ? 4 : 2 });
        const t = label(top, { fontFamily: UI.fontTitle, fontSize: 15, fontWeight: "bold", fill: UI.red });
        t.position.set(14, 12);
        const m = label(main, {
            fontFamily: UI.fontTitle, fontSize: placeholder ? 15 : 19, fontWeight: placeholder ? "normal" : "bold",
            fontStyle: placeholder ? "italic" : "normal", fill: placeholder ? 0x9a8668 : UI.ink,
            wordWrap: true, wordWrapWidth: w - 28, lineHeight: 24,
        });
        m.position.set(14, 38);
        const s = label(sub, {
            fontFamily: UI.fontBody, fontSize: 13, fill: UI.inkSoft, wordWrap: true, wordWrapWidth: w - 28, lineHeight: 18,
        });
        s.position.set(14, Math.max(96, m.y + m.height + 10));
        c.addChild(g, t, m, s);
        c.on("pointerover", () => g.tint = 0xfff6e0);
        c.on("pointerout", () => g.tint = 0xffffff);
        return c;
    }

    _chip(text, w, selected) {
        const c = new Container({ eventMode: "static" });
        c.cursor = "pointer";
        const g = new Graphics()
            .roundRect(0, 0, w, 48, 24).fill(selected ? UI.gold : 0x2b1d12)
            .roundRect(0, 0, w, 48, 24).stroke({ color: UI.gold, width: 2 });
        const t = label(text, {
            fontFamily: UI.fontTitle, fontSize: 16, fontWeight: "bold", fill: selected ? UI.ink : UI.paper,
            align: "center", wordWrap: true, wordWrapWidth: w - 24,
        });
        t.anchor.set(0.5);
        t.position.set(w / 2, 24);
        c.addChild(g, t);
        return c;
    }

    _clear() {
        for (const t of this.tweens) t.kill();
        this.tweens.length = 0;
        for (const c of this.content.removeChildren()) c.destroy({ children: true });
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
