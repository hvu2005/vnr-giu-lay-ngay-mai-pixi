import { gsap } from "gsap";
import { Container, Graphics, Sprite } from "pixi.js";

import { CHAPTERS } from "../../data/chapters";
import LAYOUT from "../../data/layout.generated.json";
import { DESIGN_HEIGHT, DESIGN_WIDTH, UI } from "../../data/scene-config";
import { assetByPath } from "../../_shared/asset-path";
import { play, SFX } from "../../_shared/sfx";
import { button, chamfer, framePanel, label, ornamentRule, roundButton, title } from "../../_shared/ui";

const PANEL_W = 980;
const PANEL_H = 550;
const THUMB_W = 96;
const THUMB_H = 54;
const CARD_W = 446;
const CARD_H = 68;

/**
 * Port nguyên từ hcm-di-tim-con-duong (phím S / Tab mở, [ / ] cảnh trước/sau).
 *
 * Layer bảng chuyển cảnh nhanh:
 * - Cho phép người chơi chuyển sang bất kỳ cảnh nào mà không cần hoàn thành cảnh hiện tại.
 * - Mỗi mục chuyển cảnh có mini img ở đầu làm preview.
 */
export class SceneSwitcherLayer {
    /**
     * @param {import("../game-scene").GameScene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.view = new Container();
        this.view.visible = false;

        this.panel = new Container({ eventMode: "static" });
        this.tweens = [];
    }

    init() {
        // Lớp nền tối che phủ toàn màn hình
        this.dim = new Graphics().rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT).fill({ color: 0x000000, alpha: 0.72 });
        this.dim.eventMode = "static";
        this.dim.cursor = "pointer";
        this.dim.on("pointertap", () => this.close());

        this.panel.position.set((DESIGN_WIDTH - PANEL_W) / 2, (DESIGN_HEIGHT - PANEL_H) / 2);

        this.view.addChild(this.dim, this.panel);
        this.scene.stage.ui.addChild(this.view);
    }

    get isOpen() {
        return this.view.visible;
    }

    open() {
        if (this.view.visible) return;

        // Đóng card tư liệu nếu đang mở
        if (this.scene.card?.isOpen) {
            this.scene.card.close();
        }

        this.scene.props.enabled = false;
        this._build();

        this.view.visible = true;
        this.view.alpha = 0;
        this.panel.y = (DESIGN_HEIGHT - PANEL_H) / 2 + 18;

        gsap.to(this.view, { alpha: 1, duration: 0.22, ease: "sine.out" });
        gsap.to(this.panel, { y: (DESIGN_HEIGHT - PANEL_H) / 2, duration: 0.28, ease: "back.out(1.1)" });
    }

    close() {
        if (!this.view.visible) return;

        for (const t of this.tweens) t.kill();
        this.tweens.length = 0;

        gsap.to(this.view, {
            alpha: 0,
            duration: 0.18,
            ease: "sine.in",
            onComplete: () => {
                this.view.visible = false;
                this.scene.props.enabled = true;
            },
        });
    }

    toggle() {
        if (this.isOpen) this.close();
        else this.open();
    }

    _build() {
        for (const child of this.panel.removeChildren()) child.destroy({ children: true });
        for (const t of this.tweens) t.kill();
        this.tweens.length = 0;

        // Nền bảng chính: sơn mài viền đồng có hoa góc.
        this.panel.addChild(framePanel(PANEL_W, PANEL_H));

        // Header
        const headerTitle = title("CHUYỂN CẢNH NHANH  ·  1945 — 1975", {
            fontSize: 22,
            fill: UI.goldLight,
            letterSpacing: 1.5,
        });
        headerTitle.position.set(40, 18);

        const sub = label("Chọn cảnh bất kỳ để chuyển đến ngay lập tức (không cần hoàn thành cảnh trước)", {
            fontFamily: UI.fontBody,
            fontSize: 13,
            fill: 0xc8b59a,
            fontStyle: "italic",
        });
        sub.position.set(42, 48);

        const closeBtn = roundButton("✕", () => this.close(), 44);
        closeBtn.position.set(PANEL_W - 30, -14);

        const divider = ornamentRule(PANEL_W - 80, UI.gold, 0.5);
        divider.position.set(40, 73);

        this.panel.addChild(headerTitle, sub, divider);
        this._closeBtn = closeBtn;

        // Danh sách 10 cảnh (2 cột x 5 hàng)
        const currentKey = this.scene.chapterKey;
        const colX = [28, 506];

        CHAPTERS.forEach((chapter, index) => {
            const col = index < 5 ? 0 : 1;
            const row = index % 5;
            const x = colX[col];
            const y = 84 + row * 76;

            const card = this._createSceneCard(chapter, index, currentKey);
            card.position.set(x, y);
            this.panel.addChild(card);
        });

        // Footer toolbar
        const currIndex = CHAPTERS.findIndex((c) => c.key === currentKey);

        const prevBtn = button("◀ Cảnh trước", () => {
            this.scene.prevChapter();
            this.close();
        }, { width: 145, height: 38, fontSize: 15, variant: "ink" });
        prevBtn.position.set(28, PANEL_H - 52);

        const nextBtn = button("Cảnh sau ▶", () => {
            this.scene.nextChapter();
            this.close();
        }, { width: 145, height: 38, fontSize: 15, variant: "ink" });
        nextBtn.position.set(PANEL_W - 28 - 145, PANEL_H - 52);

        const infoText = label(currIndex >= 0 ? `Đang ở Cảnh ${currIndex + 1}/10: ${CHAPTERS[currIndex].title}` : "", {
            fontFamily: UI.fontTitle,
            fontSize: 14,
            fill: UI.goldLight,
            fontStyle: "italic",
        });
        infoText.anchor.set(0.5);
        infoText.position.set(PANEL_W / 2, PANEL_H - 33);

        this.panel.addChild(prevBtn, nextBtn, infoText, this._closeBtn);
    }

    /**
     * Tạo mỗi phần scene chuyển có mini img ở đầu:
     * [ MINI IMG ] Cảnh N (Năm) - Địa điểm  [Trạng thái / ➔]
     */
    _createSceneCard(chapter, index, currentKey) {
        const card = new Container({ eventMode: "static", cursor: "pointer" });
        const isCurrent = chapter.key === currentKey;
        const isDone = this.scene.progress?.isReady(chapter.key);

        // Khung thẻ
        const bg = new Graphics();
        const drawBg = (state) => {
            bg.clear();
            const hover = state === "hover";
            const fill = isCurrent
                ? (hover ? 0x483420 : 0x342416)
                : (hover ? 0x36281a : 0x221810);
            const border = isCurrent
                ? UI.goldLight
                : (hover ? UI.goldLight : UI.gold);
            const borderWidth = isCurrent ? 2 : (hover ? 1.8 : 1);
            const borderAlpha = isCurrent ? 1 : (hover ? 0.95 : 0.4);

            chamfer(bg, 0, 0, CARD_W, CARD_H, 8).fill({ color: fill, alpha: 0.98 });
            chamfer(bg, 0, 0, CARD_W, CARD_H, 8).stroke({ color: border, width: borderWidth, alpha: borderAlpha });
            chamfer(bg, 3, 3, CARD_W - 6, CARD_H - 6, 6).stroke({ color: UI.gold, width: 0.8, alpha: borderAlpha * 0.3 });
        };
        drawBg("idle");

        // MINI IMAGE Ở ĐẦU CỦA MỖI PHẦN SCENE CHUYỂN
        const thumbContainer = new Container();
        thumbContainer.position.set(7, 7);

        try {
            const bgPath = LAYOUT[chapter.key]?.bg;
            if (bgPath) {
                const texture = assetByPath(bgPath);
                const sprite = new Sprite(texture);
                sprite.width = THUMB_W;
                sprite.height = THUMB_H;

                const mask = new Graphics().roundRect(0, 0, THUMB_W, THUMB_H, 6).fill(0xffffff);
                sprite.mask = mask;

                const thumbBorder = new Graphics()
                    .roundRect(0, 0, THUMB_W, THUMB_H, 6)
                    .stroke({ color: isCurrent ? UI.goldLight : UI.gold, width: 1.5, alpha: isCurrent ? 1 : 0.75 });

                thumbContainer.addChild(sprite, mask, thumbBorder);
            }
        } catch (e) {
            console.warn(`[scene-switcher] không tải được thumbnail cảnh ${chapter.key}:`, e);
        }

        // THÔNG TIN SCENE
        const titleText = label(`Cảnh ${index + 1} (${chapter.year})`, {
            fontFamily: UI.fontTitle,
            fontSize: 15,
            fontWeight: "bold",
            fill: isCurrent ? UI.goldLight : UI.gold,
        });
        titleText.position.set(112, 12);

        const placeText = label(`${chapter.title} · ${chapter.date}`, {
            fontFamily: UI.fontBody,
            fontSize: 13,
            fill: isCurrent ? 0xfff0d6 : 0xd8c8b0,
            wordWrap: true,
            wordWrapWidth: 245,
        });
        placeText.position.set(112, 34);

        // Badge trạng thái
        let badge = null;
        if (isCurrent) {
            badge = label("● Đang xem", {
                fontFamily: UI.fontBody,
                fontSize: 11,
                fontWeight: "bold",
                fill: 0x8ef58e,
            });
            badge.anchor.set(1, 0.5);
            badge.position.set(CARD_W - 14, 22);
        } else if (isDone) {
            badge = label("✓ Đã xong", {
                fontFamily: UI.fontBody,
                fontSize: 11,
                fill: UI.goldLight,
            });
            badge.anchor.set(1, 0.5);
            badge.position.set(CARD_W - 14, 22);
        }

        // Mũi tên chuyển
        const arrow = label("➔", {
            fontFamily: UI.fontTitle,
            fontSize: 16,
            fill: isCurrent ? UI.goldLight : UI.gold,
        });
        arrow.anchor.set(1, 0.5);
        arrow.position.set(CARD_W - 14, 46);
        arrow.alpha = isCurrent ? 1 : 0.45;

        card.addChild(bg, thumbContainer, titleText, placeText, arrow);
        if (badge) card.addChild(badge);

        // Tương tác chuột
        card.on("pointerover", () => {
            drawBg("hover");
            arrow.alpha = 1;
            arrow.x = CARD_W - 10;
        });

        card.on("pointerout", () => {
            drawBg("idle");
            arrow.alpha = isCurrent ? 1 : 0.45;
            arrow.x = CARD_W - 14;
        });

        card.on("pointertap", (e) => {
            e.stopPropagation();
            play(SFX.CLICK);
            this.close();
            if (chapter.key !== currentKey) {
                this.scene.startChapter(chapter.key);
            }
        });

        return card;
    }

    leave() {
        this.close();
    }

    update(dt) {
    }

    resize() {
        this.panel.position.set((DESIGN_WIDTH - PANEL_W) / 2, (DESIGN_HEIGHT - PANEL_H) / 2);
    }

    dispose() {
        for (const t of this.tweens) t.kill();
        this.view.destroy({ children: true });
    }
}
