import { gsap } from "gsap";
import { Container, Graphics, Sprite } from "pixi.js";

import { chapterByKey, MINIGAMES } from "../../data/chapters";
import LAYOUT from "../../data/layout.generated.json";
import { DESIGN_HEIGHT, DESIGN_WIDTH, HINT, UI } from "../../data/scene-config";
import { assetByPath } from "../../_shared/asset-path";
import { isMuted, setMuted } from "../../_shared/sfx";
import { button, chamfer, drawSlot, framePanel, inkPanel, label, ornamentRule, roundButton, title, waxSeal } from "../../_shared/ui";

const SLOT = 64;
const SLOT_GAP = 10;

/**
 * Giao diện trong lúc chơi, toạ độ pixel thiết kế:
 *
 *   ┌ bảng tên cảnh ────────┐             [🏺] [📜] [⏳] [?] [♪] [☰]
 *   │ Tuyên ngôn Độc lập…   │
 *   └ 2/9/1945 · Ba Đình ───┘
 *
 *          (khung mở đầu cảnh: lời mở + mục tiêu — tự ẩn)
 *
 *            ┌ ■ ■ ■ ■ ■ ◆ Đã khám phá 2/5 ┐      [Tiếp tục hành trình ➜]
 *
 * Phong cách theo bản cập nhật của hcm-di-tim-con-duong: bảng sơn mài viền
 * đồng, ô vát góc, dấu xi đỏ cho vật đã khám phá. Vật ẨN không đếm trên HUD —
 * là phần thưởng bất ngờ, chỉ hiện trong Bộ sưu tập kỷ vật.
 *
 * Thanh dưới là 5 CHI TIẾT CHÍNH: ô chưa khám phá hiện bóng đen của vật (gợi ý
 * nhẹ về hình dáng), ô đã khám phá hiện màu và bấm được để đọc lại.
 *
 * Đoạn thoại chốt (3 lượt người dẫn) phát MỘT lần khi đủ điều kiện, rồi mới
 * hiện nút Tiếp tục — high concept: "nút Tiếp tục mở sau đoạn chốt".
 *
 * Mọi tấm nền của HUD bật `eventMode: "static"` — để chuột nằm trên HUD thì
 * `prop-layer` thấy `target !== stage` và không dò xuyên xuống khung cảnh.
 */
export class HudLayer {
    /**
     * @param {import("../game-scene").GameScene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.view = new Container();
        this.view.visible = false;

        /** Phần dựng lại mỗi cảnh. */
        this.content = new Container();

        /** @type {Map<string, { sprite: Sprite, check: Graphics }>} */
        this.slots = new Map();

        /**
         * Tween đang chạy trên nội dung của cảnh. Phải giết hết trước khi huỷ
         * nội dung: gsap vẫn ghi vào `scale` của một Container đã `destroy()`.
         *
         * @type {Array<gsap.core.Animation>}
         */
        this.tweens = [];

        this._idle = 0;
    }

    init() {
        this.scene.stage.ui.addChild(this.view);

        // ── Nút góc phải: dựng một lần, dùng cho mọi cảnh ───────────────────
        const bar = new Container();
        const buttons = [
            ["🏺", "Bộ sưu tập kỷ vật (C)", () => this.scene.openCollection()],
            ["📜", "Tư liệu của cảnh", () => this.scene.openArchive()],
            ["⏳", "Timeline", () => this.scene.openTimeline()],
            ["?", "Gợi ý", () => this._onHint()],
            ["♪", "Âm thanh", () => this._toggleSound()],
            ["☰", "Màn hình chính", () => this.scene.showTitle()],
        ];

        buttons.forEach(([glyph, tip, fn], i) => {
            const b = roundButton(glyph, fn, 48);
            b.x = i * 58;
            b.on("pointerover", () => this.showTooltip(tip, false, { x: bar.x + b.x + 24, y: bar.y + 92 }));
            b.on("pointerout", () => this.hideTooltip());
            bar.addChild(b);
            if (glyph === "🏺") this.collectionButton = b;
            if (glyph === "?") this.hintButton = b;
            if (glyph === "♪") this.soundButton = b;
        });

        bar.position.set(DESIGN_WIDTH - 58 * buttons.length - 12, 16);

        // ── Nhãn tên vật khi trỏ chuột ──────────────────────────────────────
        this.tooltip = new Container({ eventMode: "none" });
        this.tooltipBg = new Graphics();
        this.tooltipText = label("", { fontFamily: UI.fontTitle, fontSize: 18, fill: UI.goldLight, fontWeight: "bold" });
        this.tooltipText.anchor.set(0.5, 1);
        this.tooltip.addChild(this.tooltipBg, this.tooltipText);
        this.tooltip.visible = false;

        // ── Dải thông báo (gợi ý cấp 1, "còn hoạt động"…) ───────────────────
        this.toast = new Container({ eventMode: "none" });
        this.toastBg = new Graphics();
        this.toastText = label("", {
            fontFamily: UI.fontTitle, fontSize: 21, fontStyle: "italic", fill: UI.paper,
            align: "center", wordWrap: true, wordWrapWidth: 820,
        });
        this.toastText.anchor.set(0.5);
        this.toast.addChild(this.toastBg, this.toastText);
        this.toast.position.set(DESIGN_WIDTH / 2, 132);
        this.toast.alpha = 0;

        this.view.addChild(this.content, this.toast, bar, this.tooltip);
    }

    /** @param {string} key */
    enter(key) {
        const chapter = chapterByKey(key);
        this.chapterKey = key;
        this._idle = 0;

        this._buildPlaque(chapter);
        this._buildChecklist(chapter);
        this._buildIntro(chapter);

        this.continueButton = button("Tiếp tục hành trình  ➜", () => this.scene.finishChapter(), { width: 280 });
        this.continueButton.position.set(DESIGN_WIDTH - 280 - 24, DESIGN_HEIGHT - 52 - 22);
        this.continueButton.visible = false;
        this.content.addChild(this.continueButton);

        this.refresh();

        // Quay lại cảnh đã xong: không phát lại đoạn chốt, hiện nút ngay.
        if (this.scene.progress.isReady(key) && this.scene.progress.closingSeen.includes(key)) {
            this.showContinue(false);
        }

        this.view.visible = true;
    }

    leave() {
        this.hideTooltip();
        for (const t of this.tweens) t.kill();
        this.tweens.length = 0;
        this.slots.clear();
        this.dialogue = null;
        gsap.killTweensOf(this.toast);
        this.toast.alpha = 0;

        for (const child of this.content.removeChildren()) child.destroy({ children: true });

        this.view.visible = false;
    }

    _buildPlaque(chapter) {
        const plaque = new Container({ eventMode: "static" });
        const name = title(chapter.title, { fontSize: 22, fill: UI.goldLight });
        const date = label(`${chapter.date}  ·  ${chapter.place}`, {
            fontFamily: UI.fontTitle, fontSize: 16, fill: UI.paper, fontStyle: "italic",
        });

        const w = Math.max(name.width, date.width) + 40;
        plaque.addChild(inkPanel(w, 70));
        name.position.set(20, 10);
        date.position.set(20, 41);
        plaque.addChild(name, date);
        plaque.position.set(16, 16);

        this.content.addChild(plaque);
    }

    _buildChecklist(chapter) {
        const key = chapter.key;
        const required = chapter.items.filter((i) => i.kind === "required" && LAYOUT[key]?.props[i.id]);

        const bar = new Container({ eventMode: "static" });
        const counter = label("", { fontFamily: UI.fontTitle, fontSize: 16, fill: UI.paper, align: "center", lineHeight: 22 });
        const counterW = 120;

        const w = required.length * (SLOT + SLOT_GAP) - SLOT_GAP + 32 + counterW;
        bar.addChild(inkPanel(w, SLOT + 24, 16, 0.78));

        required.forEach((item, i) => {
            const slot = new Container({ eventMode: "static" });
            slot.position.set(16 + i * (SLOT + SLOT_GAP), 12);

            const frame = drawSlot(new Graphics(), SLOT, SLOT, { fill: 0x0c0604, fillAlpha: 0.55, c: 9 });

            const sprite = new Sprite(assetByPath(LAYOUT[key].props[item.id].file));
            const k = (SLOT - 10) / Math.max(sprite.texture.width, sprite.texture.height);
            sprite.anchor.set(0.5);
            sprite.scale.set(k);
            sprite.position.set(SLOT / 2, SLOT / 2);

            const check = waxSeal(SLOT - 7, 7, 10);

            slot.addChild(frame, sprite, check);

            slot.cursor = "pointer";
            slot.on("pointerover", () => {
                const found = this.scene.progress.isFound(key, item.id);
                const p = bar.toLocal(slot.getGlobalPosition());
                this.showTooltip(found ? item.name : "Chưa khám phá", found, {
                    x: bar.x + p.x + SLOT / 2,
                    y: bar.y - 6,
                });
            });
            slot.on("pointerout", () => this.hideTooltip());
            slot.on("pointertap", (e) => {
                e.stopPropagation();
                if (this.scene.progress.isFound(key, item.id)) this.scene.openItem(item.id);
            });

            bar.addChild(slot);
            this.slots.set(item.id, { sprite, check });
        });

        counter.anchor.set(0.5);
        counter.position.set(w - 10 - counterW / 2, (SLOT + 24) / 2);
        bar.addChild(counter);

        const sx = w - 6 - counterW;
        const sy = (SLOT + 24) / 2;
        const sep = new Graphics()
            .moveTo(sx, 18).lineTo(sx, SLOT + 6)
            .stroke({ color: UI.gold, width: 1, alpha: 0.6 })
            .poly([sx, sy - 5, sx + 4, sy, sx, sy + 5, sx - 4, sy]).fill(UI.gold);
        bar.addChild(sep);

        bar.position.set((DESIGN_WIDTH - w) / 2, DESIGN_HEIGHT - SLOT - 24 - 14);

        this.counter = counter;
        this.checklist = bar;
        this.content.addChild(bar);
    }

    _buildIntro(chapter) {
        const box = new Container({ eventMode: "none" });
        const w = 800;

        const heading = title(chapter.title, { fontSize: 32, fill: UI.goldLight, align: "center", wordWrap: true, wordWrapWidth: w - 60 });
        const date = label(`${chapter.date}  ·  ${chapter.place}`, { fontFamily: UI.fontTitle, fontSize: 20, fill: UI.paper, fontStyle: "italic" });
        const opening = label(chapter.opening, {
            fontFamily: UI.fontBody, fontSize: 18, fill: UI.paper, align: "center",
            wordWrap: true, wordWrapWidth: w - 80, lineHeight: 26,
        });
        const goal = label(`Mục tiêu: ${chapter.objective}`, {
            fontFamily: UI.fontBody, fontSize: 16, fill: UI.goldLight, align: "center",
            wordWrap: true, wordWrapWidth: w - 80, lineHeight: 23,
        });

        for (const t of [heading, date, opening, goal]) t.anchor.set(0.5, 0);

        heading.position.set(w / 2, 26);
        date.position.set(w / 2, heading.y + heading.height + 6);
        const rule = ornamentRule(220, UI.gold, 0.8);
        rule.position.set(w / 2 - 110, date.y + date.height + 12);
        opening.position.set(w / 2, rule.y + 14);
        goal.position.set(w / 2, opening.y + opening.height + 14);

        const h = goal.y + goal.height + 32;
        box.addChild(framePanel(w, h, 0.94), heading, date, rule, opening, goal);
        box.position.set((DESIGN_WIDTH - w) / 2, 140);
        box.alpha = 0;

        this.content.addChild(box);

        this.tweens.push(gsap.timeline()
            .to(box, { alpha: 1, duration: 0.8, delay: 0.3 })
            .to(box, { alpha: 0, duration: 0.8, delay: 6.5 }));
    }

    /** Cập nhật ô đã khám phá + bộ đếm. */
    refresh() {
        const key = this.chapterKey;
        const progress = this.scene.progress;

        for (const [id, slot] of this.slots) {
            const found = progress.isFound(key, id);
            slot.sprite.tint = found ? 0xffffff : 0x000000;
            slot.sprite.alpha = found ? 1 : 0.55;
            slot.check.visible = found;
        }

        // Không đếm vật ẩn trong cảnh — phần thưởng bất ngờ, chỉ hiện trong Bộ sưu tập.
        const req = progress.count(key, "required");
        this.counter.text = `Đã khám phá
${req.done}/${req.total}`;
    }

    /**
     * Ô vừa khám phá nảy lên một cái.
     *
     * @param {string} id
     */
    celebrate(id) {
        const slot = this.slots.get(id);
        if (!slot) return;

        this.tweens.push(gsap.fromTo(slot.sprite.scale, { x: slot.sprite.scale.x * 1.6, y: slot.sprite.scale.y * 1.6 },
            { x: slot.sprite.scale.x, y: slot.sprite.scale.y, duration: 0.6, ease: "back.out(3)" }));
    }

    /** Nút bộ sưu tập nảy lên — báo có kỷ vật mới được thêm vào. */
    pulseCollection() {
        const b = this.collectionButton;
        if (!b) return;

        gsap.killTweensOf(b.scale);
        b.scale.set(1);
        gsap.timeline()
            .to(b.scale, { x: 1.25, y: 1.25, duration: 0.18, ease: "sine.out", delay: 0.35 })
            .to(b.scale, { x: 1, y: 1, duration: 0.5, ease: "elastic.out(1.2, 0.4)" });
    }

    // ══ ĐOẠN CHỐT ════════════════════════════════════════════════════════════

    /**
     * Ba lượt thoại của người dẫn, chạm để sang lượt kế. Xong thì hiện nút
     * Tiếp tục và câu kết của cảnh.
     *
     * @param {Array<[string, string]>} lines
     * @param {string} closing
     * @returns {Promise<void>}
     */
    playDialogue(lines, closing) {
        return new Promise((resolve) => {
            const w = 900;
            const box = new Container({ eventMode: "static" });
            box.cursor = "pointer";
            box.position.set((DESIGN_WIDTH - w) / 2, DESIGN_HEIGHT - 300);

            const bg = framePanel(w, 150, 0.95);
            const who = title("", { fontSize: 18, fill: UI.gold });
            const text = label("", {
                fontFamily: UI.fontTitle, fontSize: 23, fill: UI.paper,
                wordWrap: true, wordWrapWidth: w - 80, lineHeight: 32,
            });
            const more = label("Chạm để tiếp  ›", { fontFamily: UI.fontBody, fontSize: 13, fill: UI.gold });
            who.position.set(36, 18);
            text.position.set(36, 48);
            more.anchor.set(1, 1);
            more.position.set(w - 24, 140);

            box.addChild(bg, who, text, more);
            this.content.addChild(box);
            this.dialogue = box;

            let i = -1;
            const next = () => {
                i++;
                if (i >= lines.length) {
                    this.tweens.push(gsap.to(box, {
                        alpha: 0, duration: 0.35,
                        onComplete: () => {
                            box.destroy({ children: true });
                            this.dialogue = null;
                            this.toastMessage(closing, 6);
                            resolve();
                        },
                    }));
                    return;
                }
                const [speaker, line] = lines[i];
                who.text = speaker;
                text.text = line;
                this.tweens.push(gsap.fromTo(text, { alpha: 0 }, { alpha: 1, duration: 0.5 }));
            };

            box.on("pointertap", (e) => {
                e.stopPropagation();
                next();
            });

            this.tweens.push(gsap.fromTo(box, { alpha: 0, y: box.y + 20 }, { alpha: 1, y: box.y, duration: 0.5 }));
            next();
        });
    }

    /** @param {boolean} animate */
    showContinue(animate) {
        const b = this.continueButton;
        b.visible = true;

        if (animate) {
            this.tweens.push(
                gsap.fromTo(b, { alpha: 0, y: b.y + 30 }, { alpha: 1, y: b.y, duration: 0.6, ease: "back.out(2)" }),
                gsap.to(b.scale, { x: 1.04, y: 1.04, duration: 0.7, yoyo: true, repeat: -1, ease: "sine.inOut" }),
            );
        }
    }

    /**
     * Đủ 5 chi tiết nhưng chưa làm mini-game của cảnh → nhắc tên hoạt động.
     *
     * @param {string} minigameId
     */
    remindMinigame(minigameId) {
        const mg = MINIGAMES[minigameId];
        if (mg) this.toastMessage(`Còn một hoạt động: “${mg.title}”. Mở lại chi tiết có biểu tượng hoạt động để bắt đầu.`, 5);
    }

    /**
     * @param {string} text
     * @param {number} [seconds]
     */
    toastMessage(text, seconds = 4) {
        this.toastText.text = text;
        const w = Math.min(880, this.toastText.width + 60);
        const h = this.toastText.height + 26;
        this.toastBg.clear();
        chamfer(this.toastBg, -w / 2, -h / 2, w, h, 10).fill({ color: 0x1d110b, alpha: 0.92 });
        chamfer(this.toastBg, -w / 2, -h / 2, w, h, 10).stroke({ color: UI.gold, width: 1.5 });
        chamfer(this.toastBg, -w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 7).stroke({ color: UI.gold, width: 0.8, alpha: 0.35 });

        gsap.killTweensOf(this.toast);
        gsap.timeline({ targets: this.toast })
            .to(this.toast, { alpha: 1, duration: 0.3 })
            .to(this.toast, { alpha: 0, duration: 0.5, delay: seconds });
    }

    // ══ NHÃN TÊN VẬT ═════════════════════════════════════════════════════════

    /**
     * @param {string} name
     * @param {boolean} found
     * @param {{ x: number, y: number }} at pixel thiết kế, mép dưới của nhãn
     */
    showTooltip(name, found, at) {
        this.tooltipText.text = found ? `✓  ${name}` : name;

        const w = this.tooltipText.width + 28;
        const h = this.tooltipText.height + 12;

        this.tooltipBg.clear();
        chamfer(this.tooltipBg, -w / 2, -h, w, h, 7).fill({ color: 0x1d110b, alpha: 0.94 });
        chamfer(this.tooltipBg, -w / 2, -h, w, h, 7).stroke({ color: UI.gold, width: 1.5 });
        chamfer(this.tooltipBg, -w / 2 + 3, -h + 3, w - 6, h - 6, 5).stroke({ color: UI.gold, width: 0.8, alpha: 0.35 });
        this.tooltipText.position.set(0, -6);

        this.tooltip.visible = true;
        this._tooltipW = w;
        this.moveTooltip(at);
    }

    /** @param {{ x: number, y: number }} at */
    moveTooltip(at) {
        const half = (this._tooltipW ?? 0) / 2 + 8;

        this.tooltip.position.set(
            Math.min(DESIGN_WIDTH - half, Math.max(half, at.x)),
            Math.max(50, at.y),
        );
    }

    hideTooltip() {
        this.tooltip.visible = false;
    }

    // ══ NÚT ══════════════════════════════════════════════════════════════════

    _onHint() {
        this._idle = 0;
        const res = this.scene.props.hint();

        if (!res) {
            // Đang hồi / hết vật → lắc nút cho biết là chưa được, thay vì im lặng.
            gsap.fromTo(this.hintButton, { x: this.hintButton.x - 6 },
                { x: this.hintButton.x, duration: 0.4, ease: "elastic.out(3, 0.3)" });
            return;
        }

        this.toastMessage(res.level === 1
            ? `${res.item.hint}  (Bấm ? lần nữa để chỉ vị trí.)`
            : `Đây rồi: ${res.item.name}.`, 4);
    }

    _toggleSound() {
        setMuted(!isMuted());
        this.soundButton.alpha = isMuted() ? 0.45 : 1;
    }

    /** Có thao tác của người chơi → reset đồng hồ đứng yên. */
    noteActivity() {
        this._idle = 0;
    }

    /** @param {number} dt */
    update(dt) {
        if (!this.view.visible || !this.hintButton || !this.scene.props) return;

        const cooling = this.scene.props.hintCooldown > 0;
        this._idle += dt;

        // Đứng yên lâu → nút ? "thở" mời bấm (không tự làm sáng vật nào).
        if (!cooling && this._idle > HINT.idleInvite && !this.scene.card.isOpen) {
            const s = 1 + 0.12 * Math.max(0, Math.sin(this._idle * 5));
            this.hintButton.scale.set(s);
        } else {
            this.hintButton.scale.set(1);
        }

        this.hintButton.alpha = cooling ? 0.5 : 1;
    }

    resize() {
    }

    dispose() {
        this.leave();
        this.view.destroy({ children: true });
    }
}
