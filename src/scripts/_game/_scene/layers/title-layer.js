import { gsap } from "gsap";
import { BlurFilter, Container, FillGradient, Graphics, Sprite } from "pixi.js";

import { CHAPTERS, META, PROLOGUE } from "../../data/chapters";
import LAYOUT from "../../data/layout.generated.json";
import { DESIGN_HEIGHT, DESIGN_WIDTH, UI } from "../../data/scene-config";
import { assetByPath, hasAsset } from "../../_shared/asset-path";
import { button, framePanel, label, lacquerPanel, ornamentRule, title } from "../../_shared/ui";

const LINE_Y = 478;
const LINE_X0 = 130;
const LINE_X1 = DESIGN_WIDTH - 130;

/** Ảnh bìa riêng (Gemini, xem `art/prompts/cover.md`), thả vào `drop-assets-in-me/cover/`. */
const COVER_PATHS = ["cover/bg.webp", "cover/bg.png", "cover/bg.jpg"];

/**
 * Màn hình chính + trục 10 cảnh 1945 → 1975 — dựng theo bìa của
 * hcm-di-tim-con-duong:
 *
 *          ── TRÒ CHƠI TÌM VẬT · LỊCH SỬ VIỆT NAM ──
 *                    GIỮ LẤY NGÀY MAI
 *        ●────●────●────●  (trục thời gian)  ────●
 *                 [ Bắt đầu hành trình ]
 *                 [ 🏺 Bộ sưu tập kỷ vật ]
 *
 * Mốc đã mở sáng vàng, mốc chưa mở là chấm mờ — "Timeline chỉ hiện hai đầu
 * 1945 và 1975; khoảng giữa còn trống" lúc mới vào. Như hcm, mọi mốc đều bấm
 * được để vào thẳng cảnh (trỏ vào hiện ảnh xem trước).
 *
 * Lần đầu bấm "Bắt đầu hành trình" thì phát lời mở (prologue) ba câu của
 * người dẫn trước khi vào S01.
 */
export class TitleLayer {
    /**
     * @param {import("../game-scene").GameScene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.view = new Container({ eventMode: "static" });
        this.view.visible = false;
        this.timeline = new Container();
        this.prologue = new Container({ eventMode: "static" });
        this._time = 0;
    }

    init() {
        const coverPath = COVER_PATHS.find((p) => hasAsset(p));
        const bg = new Sprite(assetByPath(coverPath ?? LAYOUT.s01.bg));
        const k = Math.max(DESIGN_WIDTH / bg.texture.width, DESIGN_HEIGHT / bg.texture.height) * 1.06;
        bg.anchor.set(0.5);
        bg.scale.set(k);
        bg.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);
        if (coverPath) {
            bg.tint = 0xd8ccb8;
        } else {
            bg.tint = 0x8a7a66;
            bg.filters = [new BlurFilter({ strength: 4 })];
        }

        // Tối dần ở mép trên (chỗ tên game) và mép dưới (trục thời gian, nút).
        const fade = (stops) => new FillGradient({
            type: "linear", start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, textureSpace: "local",
            colorStops: stops.map(([offset, alpha]) => ({ offset, color: `rgba(14,9,5,${alpha})` })),
        });
        const side = new FillGradient({
            type: "linear", start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, textureSpace: "local",
            colorStops: [
                { offset: 0, color: "rgba(14,9,5,0.7)" },
                { offset: 0.22, color: "rgba(14,9,5,0)" },
                { offset: 0.78, color: "rgba(14,9,5,0)" },
                { offset: 1, color: "rgba(14,9,5,0.7)" },
            ],
        });
        const shade = new Graphics()
            .rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT).fill({ color: 0x120c08, alpha: coverPath ? 0.12 : 0.3 })
            .rect(0, 0, DESIGN_WIDTH, 380).fill(fade([[0, 0.8], [0.55, 0.4], [1, 0]]))
            .rect(0, 380, DESIGN_WIDTH, DESIGN_HEIGHT - 380).fill(fade([[0, 0], [0.4, 0.6], [1, 0.92]]))
            .rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT).fill(side);

        this.dust = this._makeDust();

        const cx = DESIGN_WIDTH / 2;

        const eyebrow = label("TRÒ CHƠI TÌM VẬT  ·  LỊCH SỬ VIỆT NAM", {
            fontFamily: UI.fontBody, fontSize: 14, fontWeight: "bold", letterSpacing: 5, fill: UI.gold,
        });
        eyebrow.anchor.set(0.5);
        eyebrow.position.set(cx, 64);
        const eyebrowLines = new Graphics()
            .moveTo(cx - eyebrow.width / 2 - 90, 64).lineTo(cx - eyebrow.width / 2 - 18, 64)
            .moveTo(cx + eyebrow.width / 2 + 18, 64).lineTo(cx + eyebrow.width / 2 + 90, 64)
            .stroke({ color: UI.gold, width: 1, alpha: 0.7 });

        const heading = title(META.title.toUpperCase(), {
            fontSize: 86, letterSpacing: 6,
            fill: new FillGradient({
                type: "linear", start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, textureSpace: "local",
                colorStops: [
                    { offset: 0, color: "#fff6cf" },
                    { offset: 0.5, color: "#ffd86a" },
                    { offset: 1, color: "#c98a2b" },
                ],
            }),
            stroke: { color: 0x2b1a0b, width: 3 },
            dropShadow: { color: 0x000000, blur: 14, distance: 4, alpha: 0.9 },
        });
        heading.anchor.set(0.5);
        heading.position.set(cx, 140);

        const tagline = label(META.tagline, {
            fontFamily: UI.fontTitle, fontSize: 22, fontStyle: "italic", fill: UI.paper,
            dropShadow: { color: 0x000000, blur: 6, distance: 0, alpha: 0.9 },
        });
        tagline.anchor.set(0.5);
        tagline.position.set(cx, 212);

        this.bg = bg;
        this.previewBox = new Container();
        this.previewBox.visible = false;
        // Nền phóng to và trôi qua lại nên rộng hơn khung thiết kế — cắt đúng
        // khung, kẻo màn rộng hơn 16:9 lộ mép ảnh hai bên.
        const clip = new Graphics().rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT).fill(0xffffff);
        const backdrop = new Container();
        backdrop.addChild(bg, shade, this.dust);
        backdrop.mask = clip;

        this.view.addChild(backdrop, clip, eyebrowLines, eyebrow, heading, tagline,
            this.timeline, this.previewBox, this.prologue);
        this.scene.stage.ui.addChild(this.view);
    }

    /** Bụi vàng bay lơ lửng — như hạt bụi trong nắng của một kho lưu trữ cũ. */
    _makeDust() {
        const box = new Container();
        this._motes = [];
        for (let i = 0; i < 46; i++) {
            const r = 0.8 + Math.random() * 2.2;
            const g = new Graphics().circle(0, 0, r).fill({ color: 0xffe2a0 });
            g.position.set(Math.random() * DESIGN_WIDTH, Math.random() * DESIGN_HEIGHT);
            const mote = { g, vy: -(4 + Math.random() * 10), phase: Math.random() * Math.PI * 2, base: 0.15 + Math.random() * 0.45 };
            g.alpha = mote.base;
            this._motes.push(mote);
            box.addChild(g);
        }

        return box;
    }

    show() {
        this._build();
        this.prologue.visible = false;

        this.view.visible = true;
        this.view.alpha = 0;
        gsap.to(this.view, { alpha: 1, duration: 0.6 });
    }

    _build() {
        for (const child of this.timeline.removeChildren()) child.destroy({ children: true });

        const progress = this.scene.progress;
        const n = CHAPTERS.length;
        const step = (LINE_X1 - LINE_X0) / (n - 1);
        const lastOpen = Math.min(progress.unlocked, n) - 1;

        const line = new Graphics()
            .moveTo(LINE_X0, LINE_Y).lineTo(LINE_X1, LINE_Y).stroke({ color: UI.gold, width: 2, alpha: 0.35 })
            .moveTo(LINE_X0, LINE_Y).lineTo(LINE_X0 + step * lastOpen, LINE_Y).stroke({ color: UI.goldLight, width: 4 });
        this.timeline.addChild(line);

        CHAPTERS.forEach((chapter, i) => {
            const open = progress.isUnlocked(i);
            const node = new Container();
            node.position.set(LINE_X0 + step * i, LINE_Y);

            const dot = new Graphics();
            if (open) {
                dot.circle(0, 0, 16).fill({ color: UI.goldLight, alpha: 0.25 });
                dot.circle(0, 0, 10).fill(UI.gold).stroke({ color: UI.goldLight, width: 2 });
            } else {
                dot.circle(0, 0, 7).fill({ color: 0x6b5a45, alpha: 0.8 });
            }

            const year = label(chapter.year, {
                fontFamily: UI.fontTitle, fontSize: 18, fontWeight: "bold",
                fill: open ? UI.goldLight : 0x8a7a66,
            });
            year.anchor.set(0.5);
            year.y = i % 2 ? 36 : -36;

            const name = label(chapter.title, {
                fontFamily: UI.fontBody, fontSize: 12, fill: open ? UI.paper : 0x7a6a56,
                align: "center", wordWrap: true, wordWrapWidth: 124,
            });
            name.anchor.set(0.5, i % 2 ? 0 : 1);
            name.y = i % 2 ? 50 : -50;

            node.addChild(dot, year, name);

            // Như hcm: chọn thẳng bất kỳ cảnh nào từ màn chính.
            node.eventMode = "static";
            node.cursor = "pointer";
            node.hitArea = { contains: (x, y) => x * x + y * y < 60 * 60 };
            node.on("pointerover", () => {
                node.scale.set(1.15);
                this._showPreview(chapter, LINE_X0 + step * i, LINE_Y + (i % 2 ? 120 : -140));
            });
            node.on("pointerout", () => {
                node.scale.set(1);
                this._hidePreview();
            });
            node.on("pointertap", (e) => {
                e.stopPropagation();
                this._hidePreview();
                this.scene.startChapter(chapter.key);
            });

            this.timeline.addChild(node);
        });

        const fresh = progress.unlocked === 1 && !Object.keys(progress.found).length;
        const resume = CHAPTERS[lastOpen];
        const text = fresh ? "Bắt đầu hành trình" : progress.finished ? "Xem lại hành trình" : `Tiếp tục · ${resume.year}`;
        const start = button(text, () => (fresh ? this._playPrologue() : this.scene.startChapter(resume.key)),
            { width: 300, height: 58, fontSize: 22 });
        start.position.set((DESIGN_WIDTH - 300) / 2, 590);
        this.timeline.addChild(start);

        const collection = button("🏺  Bộ sưu tập kỷ vật", () => this.scene.openCollection(),
            { width: 240, height: 42, fontSize: 17, variant: "ink" });
        collection.position.set((DESIGN_WIDTH - 240) / 2, 662);
        this.timeline.addChild(collection);

        // Xoá tiến trình cần HAI lần bấm — một lần bấm nhầm không được làm
        // mất cả hành trình ("Xóa tiến độ trên thiết bị này?").
        if (!fresh) {
            let armed = false;
            const reset = label("Chơi lại từ đầu", { fontFamily: UI.fontBody, fontSize: 14, fill: 0xbfae94 });
            reset.anchor.set(0.5);
            reset.position.set(DESIGN_WIDTH / 2, 730);
            reset.eventMode = "static";
            reset.cursor = "pointer";
            reset.on("pointertap", (e) => {
                e.stopPropagation();
                if (!armed) {
                    armed = true;
                    reset.text = "Xoá tiến độ trên thiết bị này? Bấm lần nữa — hành trình sẽ về đầu.";
                    reset.style.fill = 0xff9b8a;
                    return;
                }
                progress.reset();
                this._build();
            });
            this.timeline.addChild(reset);
        }
    }

    _showPreview(chapter, x, y) {
        for (const child of this.previewBox.removeChildren()) child.destroy({ children: true });

        const w = 180;
        const h = 120;
        const bg = lacquerPanel(w, h, { chamfer: 10 });
        bg.position.set(-w / 2, -h / 2);
        this.previewBox.addChild(bg);

        const bgPath = LAYOUT[chapter.key]?.bg;
        if (bgPath) {
            const spr = new Sprite(assetByPath(bgPath));
            spr.width = 156;
            spr.height = 88;
            spr.anchor.set(0.5);
            spr.position.set(0, -9);
            const border = new Graphics().rect(-78, -53, 156, 88).stroke({ color: UI.gold, width: 1.5 });
            this.previewBox.addChild(spr, border);
        }

        const caption = label(chapter.date, {
            fontFamily: UI.fontTitle, fontSize: 13, fontWeight: "bold", fill: UI.goldLight, align: "center",
        });
        caption.anchor.set(0.5);
        caption.position.set(0, 47);
        this.previewBox.addChild(caption);

        this.previewBox.position.set(Math.min(DESIGN_WIDTH - w / 2 - 10, Math.max(w / 2 + 10, x)), y);
        this.previewBox.visible = true;
    }

    _hidePreview() {
        this.previewBox.visible = false;
    }

    /** Lời mở ba câu trên tấm sơn mài, rồi vào S01. */
    _playPrologue() {
        const p = this.prologue;
        for (const c of p.removeChildren()) c.destroy({ children: true });

        const dark = new Graphics().rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT).fill({ color: 0x07050a, alpha: 0.82 });
        const w = 1040;
        const h = 470;
        const panel = framePanel(w, h, 0.96);
        panel.position.set((DESIGN_WIDTH - w) / 2, 130);
        p.addChild(dark, panel);

        const rule = ornamentRule(260, UI.gold, 0.8);
        rule.position.set(DESIGN_WIDTH / 2 - 130, 182);
        p.addChild(rule);

        PROLOGUE.lines.forEach((line, i) => {
            const t = label(line, {
                fontFamily: UI.fontTitle, fontSize: 27, fontStyle: "italic", fill: UI.paper,
                align: "center", wordWrap: true, wordWrapWidth: 900, lineHeight: 38,
            });
            t.anchor.set(0.5);
            t.position.set(DESIGN_WIDTH / 2, 250 + i * 95);
            t.alpha = 0;
            p.addChild(t);
            gsap.to(t, { alpha: 1, duration: 1.4, delay: 0.4 + i * 2.2 });
        });

        const go = button(PROLOGUE.button, () => this.scene.startChapter(CHAPTERS[0].key), { width: 260, height: 56, fontSize: 21 });
        go.position.set((DESIGN_WIDTH - 260) / 2, 520);
        go.alpha = 0;
        p.addChild(go);
        gsap.to(go, { alpha: 1, duration: 0.8, delay: 0.4 + PROLOGUE.lines.length * 2.2 });

        p.visible = true;
        gsap.fromTo(p, { alpha: 0 }, { alpha: 1, duration: 0.6 });
    }

    /** @param {number} dt */
    update(dt) {
        if (!this.view.visible) return;

        this._time += dt;
        // Nền trôi rất chậm — bìa cũng "thở" như mọi khung cảnh.
        this.bg.x = DESIGN_WIDTH / 2 + Math.sin(this._time * 0.12) * 14;
        this.bg.y = DESIGN_HEIGHT / 2 + Math.cos(this._time * 0.09) * 6;

        for (const m of this._motes) {
            m.g.y += m.vy * dt;
            m.g.x += Math.sin(this._time * 0.6 + m.phase) * 6 * dt;
            m.g.alpha = m.base * (0.6 + 0.4 * Math.sin(this._time * 1.3 + m.phase));
            if (m.g.y < -6) {
                m.g.y = DESIGN_HEIGHT + 6;
                m.g.x = Math.random() * DESIGN_WIDTH;
            }
        }
    }

    resize() {
    }

    dispose() {
        this.view.destroy({ children: true });
    }
}
