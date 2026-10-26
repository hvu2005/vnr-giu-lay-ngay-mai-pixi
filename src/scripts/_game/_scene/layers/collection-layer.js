import { gsap } from "gsap";
import { Container, Graphics, Rectangle, Sprite } from "pixi.js";

import { CHAPTERS, CLAIM_LABEL, SOURCES } from "../../data/chapters";
import LAYOUT from "../../data/layout.generated.json";
import { DESIGN_HEIGHT, DESIGN_WIDTH, UI } from "../../data/scene-config";
import { assetByPath } from "../../_shared/asset-path";
import { play, SFX } from "../../_shared/sfx";
import { softTexture } from "../../_shared/textures";
import { chamfer, drawSlot, framePanel, label, ornamentRule, roundButton, title, waxSeal } from "../../_shared/ui";

const PANEL_W = 1120;
const PANEL_H = 640;

const TAB_Y = 84;
const TAB_H = 54;

const GRID_X = 28;
const GRID_Y = 156;
const TILE = 124;
const TILE_GAP = 12;
const COLS = 4;

const DETAIL_X = GRID_X + COLS * (TILE + TILE_GAP) + 16;
const DETAIL_W = PANEL_W - DETAIL_X - 28;
const DETAIL_H = PANEL_H - GRID_Y - 28;
const DETAIL_IMAGE = 230;

/** Khung ảnh tư liệu ở đầu panel chi tiết (vật đã tìm). */
const PHOTO_PAD = 16;
const PHOTO_H = 200;
const MEDAL_R = 34;
/** Nội dung dưới ảnh dài hơn khung → cuộn bằng con lăn. */
const SCROLL_TOP = PHOTO_PAD + PHOTO_H + 30;
const SCROLL_BOTTOM_PAD = 12;

/** Màu bóng đen của vật chưa tìm — tối hẳn nhưng vẫn nổi trên ô nền nâu. */
const SILHOUETTE = 0x0d0906;

/**
 * Bộ sưu tập kỷ vật — mọi vật của cả 10 chương ở một chỗ.
 *
 *   ┌ BỘ SƯU TẬP KỶ VẬT                     Đã sưu tầm 23/62   ✕ ┐
 *   │ [1911 4/6] [1911 6/6] [1912 …] …                    (tab)    │
 *   │ ┌────┐┌────┐┌────┐┌────┐   ┌───────────────────────────────┐ │
 *   │ │màu ││ ▓▓ ││màu ││ ▓▓ │   │ ảnh lớn  · tên · mô tả · nguồn │ │
 *   │ └────┘└────┘└────┘└────┘   │ (vật chưa tìm: bóng đen + gợi ý)│ │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Port từ hcm-di-tim-con-duong. Khác ở chỗ game này CHƯA có ảnh tư liệu thật
 * (hcm dùng ảnh public domain từ Wikimedia, có ghi công): khung ảnh ở đầu panel
 * hiện chính khung cảnh trong game, ghi rõ "hình minh hoạ, không phải ảnh tư
 * liệu" — đúng quy tắc ba lớp nội dung của high concept. Chi tiết lấy từ gói
 * nội dung: `meaning` (ý nghĩa với sự kiện) + `archive` của cảnh + nguồn.
 *
 * Vật đã tìm hiện sprite màu (bấm xem lại mô tả). Vật chưa tìm hiện BÓNG ĐEN
 * của chính sprite đó — đúng dáng vật (đoàn người, xe đạp thồ…) nên bóng đen
 * là một gợi ý.
 *
 * Tự hiển thị chi tiết thay vì mở `CardLayer`: bộ sưu tập mở được từ trang
 * đầu, mà trang đầu nằm TRÊN layer thẻ.
 */
export class CollectionLayer {
    /**
     * @param {import("../game-scene").GameScene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.view = new Container();
        this.view.visible = false;

        this.panel = new Container({ eventMode: "static" });
        this.grid = new Container();
        this.detail = new Container();
        this.tabs = new Container();

        /** Chương đang xem trong bộ sưu tập. */
        this.chapterKey = CHAPTERS[0].key;
        /** @type {string | null} */
        this.selectedId = null;

        this.tweens = [];
    }

    init() {
        this.dim = new Graphics().rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT).fill({ color: 0x000000, alpha: 0.75 });
        this.dim.eventMode = "static";
        this.dim.on("pointertap", () => this.close());

        this.panel.position.set((DESIGN_WIDTH - PANEL_W) / 2, (DESIGN_HEIGHT - PANEL_H) / 2);

        this.view.addChild(this.dim, this.panel);
        this.scene.stage.ui.addChild(this.view);
    }

    get isOpen() {
        return this.view.visible;
    }

    /** @param {string} [chapterKey] mở thẳng tab của chương này */
    open(chapterKey) {
        if (this.isOpen) return;

        if (this.scene.card?.isOpen) this.scene.card.close();
        if (this.scene.switcher?.isOpen) this.scene.switcher.close();
        if (this.scene.props) this.scene.props.enabled = false;
        this.scene.hud?.hideTooltip();

        this.chapterKey = chapterKey ?? this._defaultChapter();
        this.selectedId = null;

        this.view.visible = true;
        this.view.alpha = 0;
        this._build();
        const y = (DESIGN_HEIGHT - PANEL_H) / 2;
        gsap.to(this.view, { alpha: 1, duration: 0.22, ease: "sine.out" });
        gsap.fromTo(this.panel, { y: y + 18 }, { y, duration: 0.28, ease: "back.out(1.1)" });
        play(SFX.OPEN);
    }

    close() {
        if (!this.isOpen) return;

        this._killTweens();
        play(SFX.CLOSE);

        gsap.to(this.view, {
            alpha: 0,
            duration: 0.18,
            ease: "sine.in",
            onComplete: () => {
                this.view.visible = false;
                // Chỉ trả quyền bấm vật khi đang ở trong một chương, không có thẻ nào mở.
                if (this.scene.props && this.scene.chapterKey && !this.scene.card?.isOpen) {
                    this.scene.props.enabled = true;
                }
            },
        });
    }

    toggle(chapterKey) {
        if (this.isOpen) this.close();
        else this.open(chapterKey);
    }

    /** Chương đang chơi; ngoài trang đầu thì chương mở khoá xa nhất. */
    _defaultChapter() {
        if (this.scene.chapterKey) return this.scene.chapterKey;
        const last = Math.min(this.scene.progress.unlocked, CHAPTERS.length) - 1;

        return CHAPTERS[last].key;
    }

    // ══ DỰNG ═════════════════════════════════════════════════════════════════

    _build() {
        this._killTweens();
        for (const child of this.panel.removeChildren()) child.destroy({ children: true });

        this.grid = new Container();
        this.detail = new Container();
        this.tabs = new Container();

        const bg = framePanel(PANEL_W, PANEL_H);

        const heading = title("BỘ SƯU TẬP KỶ VẬT", { fontSize: 24, fill: UI.goldLight, letterSpacing: 2 });
        heading.position.set(40, 18);

        const sub = label("Những chi tiết đã khám phá trên hành trình 1945 — 1975. Bóng đen là chi tiết còn chờ được tìm.", {
            fontFamily: UI.fontBody, fontSize: 13, fill: 0xc8b59a, fontStyle: "italic",
        });
        sub.position.set(42, 52);

        const { done, total } = this._totals();
        const totalText = label(`Đã sưu tầm  ${done} / ${total}`, {
            fontFamily: UI.fontTitle, fontSize: 18, fontWeight: "bold", fill: UI.goldLight,
        });
        totalText.anchor.set(1, 0);
        totalText.position.set(PANEL_W - 44, 24);

        // Nút đóng như đồng xu đóng lên góc khung — cùng chỗ với thẻ tư liệu.
        const closeBtn = roundButton("✕", () => this.close(), 44);
        closeBtn.position.set(PANEL_W - 30, -14);

        const rule = ornamentRule(PANEL_W - 80, UI.gold, 0.5);
        rule.position.set(40, 76);

        this.panel.addChild(bg, heading, sub, totalText, rule, this.tabs, this.grid, this.detail, closeBtn);

        this._buildTabs();
        this._buildGrid();
        this._buildDetail();
    }

    _buildTabs() {
        for (const child of this.tabs.removeChildren()) child.destroy({ children: true });

        const n = CHAPTERS.length;
        const gap = 6;
        const w = (PANEL_W - 56 - gap * (n - 1)) / n;

        CHAPTERS.forEach((chapter, i) => {
            const active = chapter.key === this.chapterKey;
            const { done, total } = this._chapterCount(chapter);
            const complete = done === total;

            const tab = new Container({ eventMode: "static", cursor: "pointer" });
            tab.position.set(28 + i * (w + gap), TAB_Y);

            const g = new Graphics();
            const draw = (hover) => {
                g.clear();
                drawSlot(g, w, TAB_H, {
                    fill: active ? 0x4a2e1a : hover ? 0x34200f : 0x0f0805,
                    fillAlpha: active ? 0.95 : 0.6,
                    border: active || hover ? UI.goldLight : UI.gold,
                    width: active ? 2 : 1,
                    borderAlpha: active ? 1 : hover ? 0.9 : 0.45,
                    c: 7,
                });
            };
            draw(false);

            const year = label(`${i + 1} · ${chapter.year}`, {
                fontFamily: UI.fontTitle, fontSize: 15, fontWeight: "bold",
                fill: active ? UI.goldLight : UI.gold,
            });
            year.anchor.set(0.5, 0);
            year.position.set(w / 2, 8);

            const count = label(complete ? `✓ ${done}/${total}` : `${done}/${total}`, {
                fontFamily: UI.fontBody, fontSize: 13,
                fill: complete ? 0x8ef58e : done ? UI.paper : 0x8a7a66,
            });
            count.anchor.set(0.5, 0);
            count.position.set(w / 2, 30);

            tab.addChild(g, year, count);
            tab.on("pointerover", () => draw(true));
            tab.on("pointerout", () => draw(false));
            tab.on("pointertap", (e) => {
                e.stopPropagation();
                if (active) return;
                play(SFX.HOVER);
                this.chapterKey = chapter.key;
                this.selectedId = null;
                this._buildTabs();
                this._buildGrid();
                this._buildDetail();
            });

            this.tabs.addChild(tab);
        });
    }

    _buildGrid() {
        for (const child of this.grid.removeChildren()) child.destroy({ children: true });

        const chapter = this._chapter();
        const progress = this.scene.progress;

        const place = label(`${chapter.title} · ${chapter.date}`, {
            fontFamily: UI.fontTitle, fontSize: 15, fontStyle: "italic", fill: UI.paper,
            wordWrap: true, wordWrapWidth: COLS * (TILE + TILE_GAP) - TILE_GAP,
        });
        place.position.set(GRID_X, GRID_Y - 2);
        this.grid.addChild(place);

        const top = GRID_Y + Math.max(26, place.height + 8);

        this._items(chapter).forEach((item, i) => {
            const found = progress.isFound(chapter.key, item.id);
            const selected = item.id === this.selectedId;

            const tile = new Container({ eventMode: "static", cursor: "pointer" });
            tile.position.set(GRID_X + (i % COLS) * (TILE + TILE_GAP), top + Math.floor(i / COLS) * (TILE + TILE_GAP));

            const frame = new Graphics();
            const draw = (hover) => {
                frame.clear();
                drawSlot(frame, TILE, TILE, {
                    fill: found ? 0x3a2516 : 0x5a4630,
                    fillAlpha: found ? 0.95 : 0.55,
                    border: selected || hover ? UI.goldLight : UI.gold,
                    width: selected ? 2.5 : 1.2,
                    borderAlpha: selected || hover ? 1 : 0.6,
                    c: 10,
                });
            };
            draw(false);

            const sprite = this._itemSprite(chapter.key, item, found, TILE - 18);
            sprite.position.set(TILE / 2, TILE / 2 - (found ? 0 : 4));

            tile.addChild(frame, sprite);

            if (found) {
                const check = waxSeal(TILE - 14, 14, 11);
                tile.addChild(check);
            } else {
                const q = label("?", { fontFamily: UI.fontTitle, fontSize: 18, fontWeight: "bold", fill: UI.gold });
                q.anchor.set(0.5);
                q.position.set(TILE - 14, 14);
                q.alpha = 0.7;
                tile.addChild(q);
            }

            if (item.kind === "hidden") {
                const tag = label("THÊM", {
                    fontFamily: UI.fontBody, fontSize: 10, fontWeight: "bold", letterSpacing: 1, fill: 0x9fd8c6,
                });
                tag.position.set(8, TILE - 18);
                tile.addChild(tag);
            }

            tile.on("pointerover", () => draw(true));
            tile.on("pointerout", () => draw(false));
            tile.on("pointertap", (e) => {
                e.stopPropagation();
                play(SFX.HOVER);
                this.selectedId = item.id;
                this._buildGrid();
                this._buildDetail();
            });

            this.grid.addChild(tile);

            if (selected && found) {
                this.tweens.push(gsap.fromTo(sprite.scale,
                    { x: sprite.scale.x * 1.12, y: sprite.scale.y * 1.12 },
                    { x: sprite.scale.x, y: sprite.scale.y, duration: 0.35, ease: "back.out(2)" }));
            }
        });
    }

    _buildDetail() {
        for (const child of this.detail.removeChildren()) child.destroy({ children: true });

        const chapter = this._chapter();
        const items = this._items(chapter);
        const item = items.find((i) => i.id === this.selectedId);

        const box = drawSlot(new Graphics(), DETAIL_W, DETAIL_H, { fill: 0x0e0704, fillAlpha: 0.7, borderAlpha: 0.6, c: 12 });
        this.detail.position.set(DETAIL_X, GRID_Y);
        this.detail.addChild(box);

        if (!item) {
            const { done, total } = this._chapterCount(chapter);
            const hint = label(`Chọn một ô để xem kỷ vật.\n\nChương này: ${done}/${total} vật đã tìm.`, {
                fontFamily: UI.fontBody, fontSize: 16, fill: 0xc8b59a, fontStyle: "italic", align: "center",
                lineHeight: 24,
            });
            hint.anchor.set(0.5);
            hint.position.set(DETAIL_W / 2, DETAIL_H / 2);
            this.detail.addChild(hint);
            return;
        }

        if (this.scene.progress.isFound(chapter.key, item.id)) {
            this._buildFoundDetail(chapter, item);
            return;
        }

        // Chưa tìm: chỉ bóng đen + gợi ý — không lộ ảnh thật hay nội dung.
        const glow = new Sprite(softTexture());
        glow.anchor.set(0.5);
        glow.tint = 0x8a7a66;
        glow.alpha = 0.3;
        glow.width = glow.height = DETAIL_IMAGE * 1.3;
        glow.position.set(DETAIL_W / 2, 24 + DETAIL_IMAGE / 2);

        const image = this._itemSprite(chapter.key, item, false, DETAIL_IMAGE);
        image.position.set(DETAIL_W / 2, 24 + DETAIL_IMAGE / 2);

        this.detail.addChild(glow, image);

        const x = 28;
        const w = DETAIL_W - 56;
        let y = 24 + DETAIL_IMAGE + 18;

        const badge = this._badge(item);
        badge.position.set(x, y);
        y += 22;

        const name = title("Chưa tìm thấy", { fontSize: 22, fill: 0xbfae94 });
        name.position.set(x, y);
        y += name.height + 8;

        const where = label(
            `Chi tiết này nằm đâu đó trong cảnh “${chapter.title}” (${chapter.year}).`
            + (item.kind === "hidden" ? "\nĐây là chi tiết thêm — không bắt buộc, nhưng đáng để tìm." : ""),
            {
                fontFamily: UI.fontBody, fontSize: 15, fill: 0xc8b59a, fontStyle: "italic",
                wordWrap: true, wordWrapWidth: w, lineHeight: 22,
            },
        );
        where.position.set(x, y);
        this.detail.addChild(badge, name, where);
    }

    /**
     * Vật đã tìm:
     *
     *   ┌───────────────────────────────┐
     *   │ [ẢNH TƯ LIỆU]  ảnh thật        │  ← ảnh riêng của vật, thiếu thì ảnh
     *   │ (◉ ảnh thẻ)                    │    bối cảnh của chương, thiếu nữa thì
     *   └───────────────────────────────┘    ảnh thẻ trong game
     *   chú thích ảnh · tác giả · giấy phép
     *   ┌ VẬT BẮT BUỘC · tên · mô tả ────┐
     *   │ CHI TIẾT …   BỐI CẢNH …  Nguồn │  ← cuộn bằng con lăn
     *   └───────────────────────────────┘
     */
    _buildFoundDetail(chapter, item) {
        const photoW = DETAIL_W - PHOTO_PAD * 2;

        // ── Ảnh: khung cảnh trong game (chưa có ảnh tư liệu thật) ──
        // Ảnh dán trên bìa album: viền giấy ngà quanh ảnh.
        const frame = new Graphics()
            .rect(PHOTO_PAD - 5, PHOTO_PAD - 5, photoW + 10, PHOTO_H + 10).fill({ color: 0xe9dbbb })
            .rect(PHOTO_PAD, PHOTO_PAD, photoW, PHOTO_H).fill({ color: 0x120c07 });
        this.detail.addChild(frame);

        const photoBox = new Container();
        const photoMask = new Graphics().rect(PHOTO_PAD, PHOTO_PAD, photoW, PHOTO_H).fill(0xffffff);
        photoBox.mask = photoMask;
        this.detail.addChild(photoBox, photoMask);

        // Phóng vào quanh vật trong cảnh: người chơi nhận ra đúng chỗ đã tìm thấy.
        const layout = LAYOUT[chapter.key];
        const info = layout.props[item.id];
        const art = layout.artScale ?? 1;
        const zoom = Math.max(photoW / (layout.width * art), PHOTO_H / (layout.height * art)) * 1.6;
        const scene = new Sprite(assetByPath(layout.bg));
        scene.scale.set(zoom);
        const cx = (info.x + info.w / 2) * art * zoom;
        const cy = (info.y + info.h / 2) * art * zoom;
        scene.position.set(
            Math.min(PHOTO_PAD, Math.max(PHOTO_PAD + photoW - scene.width, DETAIL_W / 2 - cx)),
            Math.min(PHOTO_PAD, Math.max(PHOTO_PAD + PHOTO_H - scene.height, PHOTO_PAD + PHOTO_H / 2 - cy)),
        );
        const prop = new Sprite(assetByPath(info.file));
        prop.scale.set(zoom);
        prop.position.set(scene.x + info.x * art * zoom, scene.y + info.y * art * zoom);
        photoBox.addChild(scene, prop);

        const tag = label("KHUNG CẢNH TRONG GAME", {
            fontFamily: UI.fontBody, fontSize: 10, fontWeight: "bold", letterSpacing: 1.5, fill: UI.ink,
        });
        const tagBg = chamfer(new Graphics(), 0, 0, tag.width + 14, tag.height + 6, 3).fill({ color: UI.gold, alpha: 0.92 });
        tag.position.set(7, 3);
        const tagBox = new Container();
        tagBox.addChild(tagBg, tag);
        tagBox.position.set(PHOTO_PAD + 10, PHOTO_PAD + 10);
        this.detail.addChild(tagBox);

        // Bốn góc dán ảnh kiểu album cũ.
        const border = new Graphics();
        const corner = (x, y, sx, sy) => border.poly([x, y, x + 22 * sx, y, x, y + 22 * sy]).fill({ color: 0x2a1a10, alpha: 0.92 });
        corner(PHOTO_PAD - 5, PHOTO_PAD - 5, 1, 1);
        corner(PHOTO_PAD + photoW + 5, PHOTO_PAD - 5, -1, 1);
        corner(PHOTO_PAD - 5, PHOTO_PAD + PHOTO_H + 5, 1, -1);
        corner(PHOTO_PAD + photoW + 5, PHOTO_PAD + PHOTO_H + 5, -1, -1);
        this.detail.addChild(border);

        // Sprite vật làm huy hiệu ở góc.
        const medal = new Container();
        const ring = new Graphics().circle(0, 0, MEDAL_R + 3).fill({ color: 0x241810 })
            .circle(0, 0, MEDAL_R + 3).stroke({ color: UI.goldLight, width: 2 });
        const medalArt = this._itemSprite(chapter.key, item, true, MEDAL_R * 2.3);
        const medalMask = new Graphics().circle(0, 0, MEDAL_R).fill(0xffffff);
        medalArt.mask = medalMask;
        medal.addChild(ring, medalArt, medalMask);
        medal.position.set(PHOTO_PAD + photoW - MEDAL_R - 10, PHOTO_PAD + PHOTO_H - MEDAL_R - 10);
        this.detail.addChild(medal);

        const cap = label(`${chapter.title} · ${chapter.date} — hình minh hoạ trong game, không phải ảnh tư liệu.`, {
            fontFamily: UI.fontBody, fontSize: 10.5, fontStyle: "italic", fill: 0xa8957a,
            wordWrap: true, wordWrapWidth: photoW, lineHeight: 13,
        });
        cap.position.set(PHOTO_PAD, PHOTO_PAD + PHOTO_H + 9);
        this.detail.addChild(cap);

        // ── Nội dung cuộn ──
        const top = PHOTO_PAD + PHOTO_H + 14 + Math.max(cap.height, SCROLL_TOP - PHOTO_PAD - PHOTO_H - 14);
        const viewH = DETAIL_H - top - SCROLL_BOTTOM_PAD;
        const x = 24;
        const w = DETAIL_W - 48 - 10;

        const content = new Container();
        let y = 0;
        const add = (node, gap = 8) => {
            node.position.set(x, y);
            content.addChild(node);
            y += node.height + gap;
        };

        add(this._badge(item), 6);
        add(title(item.name, { fontSize: 22, fill: UI.goldLight, wordWrap: true, wordWrapWidth: w, lineHeight: 28 }), 6);
        add(label(item.desc, {
            fontFamily: UI.fontBody, fontSize: 14, fontStyle: "italic", fill: 0xd9c7a6,
            wordWrap: true, wordWrapWidth: w, lineHeight: 20,
        }), 14);

        const section = (heading, text) => {
            if (!text) return;
            add(label(heading, {
                fontFamily: UI.fontBody, fontSize: 11, fontWeight: "bold", letterSpacing: 2, fill: UI.gold,
            }), 4);
            add(label(text, {
                fontFamily: UI.fontBody, fontSize: 14.5, fill: UI.paper, wordWrap: true, wordWrapWidth: w, lineHeight: 21,
            }), 14);
        };
        section("Ý NGHĨA VỚI SỰ KIỆN", item.meaning);
        section("BỐI CẢNH", chapter.archive);

        if (item.src?.length) {
            add(label(`Nguồn: ${item.src.map((s) => (SOURCES[s] ? `${SOURCES[s].title} — ${SOURCES[s].publisher}` : s)).join(" · ")}`, {
                fontFamily: UI.fontBody, fontSize: 11, fontStyle: "italic", fill: 0xa8957a,
                wordWrap: true, wordWrapWidth: w, lineHeight: 15,
            }), 0);
        }

        const viewport = new Container({ eventMode: "static" });
        viewport.position.set(0, top);
        viewport.hitArea = new Rectangle(0, 0, DETAIL_W, viewH);
        const mask = new Graphics().rect(0, 0, DETAIL_W, viewH).fill(0xffffff);
        content.mask = mask;
        viewport.addChild(content, mask);
        this.detail.addChild(viewport);

        // Đo bằng `y` cộng dồn, không bằng `content.height`: có mask rồi thì
        // bounds bị cắt theo mask, cao bao nhiêu cũng chỉ ra ≤ viewH.
        const overflow = Math.max(0, y - viewH + 8);
        if (overflow <= 0) return;

        const trackH = viewH - 8;
        const thumbH = Math.max(28, trackH * (viewH / (viewH + overflow)));
        const track = new Graphics().roundRect(DETAIL_W - 14, 4, 4, trackH, 2).fill({ color: UI.gold, alpha: 0.15 });
        const thumb = new Graphics().roundRect(0, 0, 4, thumbH, 2).fill({ color: UI.gold, alpha: 0.7 });
        thumb.position.set(DETAIL_W - 14, 4);
        viewport.addChild(track, thumb);

        let scroll = 0;
        const apply = () => {
            content.y = -scroll;
            thumb.y = 4 + (trackH - thumbH) * (scroll / overflow);
        };
        viewport.on("wheel", (e) => {
            e.stopPropagation();
            scroll = Math.min(overflow, Math.max(0, scroll + e.deltaY * 0.5));
            apply();
        });

        // Kéo bằng chuột/ngón tay — màn hình cảm ứng không có con lăn.
        let dragFrom = null;
        viewport.on("pointerdown", (e) => { dragFrom = { y: e.global.y, scroll }; });
        viewport.on("pointermove", (e) => {
            if (!dragFrom) return;
            scroll = Math.min(overflow, Math.max(0, dragFrom.scroll + (dragFrom.y - e.global.y)));
            apply();
        });
        const end = () => { dragFrom = null; };
        viewport.on("pointerup", end);
        viewport.on("pointerupoutside", end);
    }

    _badge(item) {
        const kind = item.kind === "required" ? "CHI TIẾT CHÍNH" : "CHI TIẾT THÊM";
        return label(`${kind}  ·  ${CLAIM_LABEL[item.claim] ?? "Tư liệu"}`, {
            fontFamily: UI.fontBody, fontSize: 12, fontWeight: "bold", letterSpacing: 2,
            fill: item.kind === "required" ? 0xe08a7a : 0x9fd8c6,
        });
    }

    /** Sprite vật cắt từ cảnh: đã tìm → màu; chưa tìm → bóng đen theo đúng dáng. */
    _itemSprite(chapterKey, item, found, size) {
        const sprite = new Sprite(assetByPath(LAYOUT[chapterKey].props[item.id].file));
        const k = size / Math.max(sprite.texture.width, sprite.texture.height);
        sprite.anchor.set(0.5);
        sprite.scale.set(k);

        if (!found) {
            sprite.tint = SILHOUETTE;
            sprite.alpha = 0.92;
        }

        return sprite;
    }

    // ══ SỐ LIỆU ══════════════════════════════════════════════════════════════

    _chapter() {
        return CHAPTERS.find((c) => c.key === this.chapterKey) ?? CHAPTERS[0];
    }

    /** Vật có ảnh trong layout — vật thiếu sprite/thẻ không đưa vào bộ sưu tập. */
    _items(chapter) {
        const layout = LAYOUT[chapter.key];
        // Vật bắt buộc trước, vật ẩn sau — giống thứ tự đọc của thanh dưới HUD.
        return chapter.items
            .filter((i) => layout?.props[i.id])
            .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "required" ? -1 : 1));
    }

    _chapterCount(chapter) {
        const items = this._items(chapter);
        const done = items.filter((i) => this.scene.progress.isFound(chapter.key, i.id)).length;

        return { done, total: items.length };
    }

    _totals() {
        let done = 0;
        let total = 0;
        for (const chapter of CHAPTERS) {
            const c = this._chapterCount(chapter);
            done += c.done;
            total += c.total;
        }

        return { done, total };
    }

    _killTweens() {
        for (const t of this.tweens) t.kill();
        this.tweens.length = 0;
    }

    update() {
    }

    resize() {
        this.panel.position.x = (DESIGN_WIDTH - PANEL_W) / 2;
    }

    dispose() {
        this._killTweens();
        this.view.destroy({ children: true });
    }
}
