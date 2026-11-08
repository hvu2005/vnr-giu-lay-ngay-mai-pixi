import { gsap } from "gsap";
import { Container, Graphics } from "pixi.js";

import { CLAIM_LABEL, SOURCES } from "../../data/chapters";
import { DESIGN_HEIGHT, DESIGN_WIDTH, UI } from "../../data/scene-config";
import { itemPhoto } from "../../_shared/scene-crop";
import { play, SFX } from "../../_shared/sfx";
import { button, label, ornamentRule, paperPanel, roundButton, title } from "../../_shared/ui";

const W = 980;
const H = 520;
const IMAGE = 360;
/** Cạnh ảnh khung cảnh trong cột ảnh — chừa viền ngà và con dấu bên dưới. */
const PHOTO = 330;

/**
 * Thẻ tư liệu — phần GIÁO DỤC của mỗi cú bấm.
 *
 *   ┌───────────────────────────────────────────────────┐
 *   │  ┌─────────┐   VẬT CHÍNH · Tư liệu              ✕ │
 *   │  │  ảnh    │   Tên vật                            │
 *   │  │ cắt từ  │   Nội dung popup (≤ 40 từ)            │
 *   │  │  cảnh   │   Ý nghĩa với sự kiện…                │
 *   │  └─────────┘   Nguồn: Bảo tàng Hồ Chí Minh …       │
 *   │                [Đọc thêm tư liệu] / [Mở hoạt động] │
 *   └───────────────────────────────────────────────────┘
 *
 * Ảnh là KHUNG CẢNH vuông quanh vật, dựng từ chính cảnh trong game
 * (`_shared/scene-crop.js`, không vẽ riêng một bản Gemini như project tham
 * khảo): vật trong thẻ giống hệt vật người chơi vừa bấm, và luôn nguyên vẹn —
 * bản đầu dùng sprite cắt rời, lộ mép răng cưa / khúc cụt (góp ý 11/2026).
 *
 * Nhãn ba lớp nội dung (Tư liệu / Dàn dựng minh hoạ / Hư cấu) theo high
 * concept: "Nhãn Tư liệu chỉ xác nhận phần thông tin đi kèm; kiểu dáng vật vẽ
 * vẫn là minh họa".
 *
 * Cùng layer này hiển thị trang Archive của cảnh và Timeline.
 */
export class CardLayer {
    /**
     * @param {import("../game-scene").GameScene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.view = new Container();
        this.view.visible = false;

        /** @type {(() => void) | null} */
        this.onClose = null;

        /** Tween trên nội dung thẻ — giết trước khi huỷ nội dung. */
        this.tweens = [];
    }

    init() {
        // Lớp phủ tối chặn MỌI cú chạm xuống khung cảnh ("Khi hộp thoại mở, khóa
        // tương tác với cảnh phía sau"); chạm vào nó = đóng thẻ.
        this.dim = new Graphics().rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT).fill({ color: 0x000000, alpha: 0.6 });
        this.dim.eventMode = "static";
        this.dim.on("pointertap", () => this.close());

        this.panel = new Container({ eventMode: "static" });
        this.panel.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2 - 10);

        this.view.addChild(this.dim, this.panel);
        this.scene.stage.ui.addChild(this.view);
    }

    get isOpen() {
        return this.view.visible;
    }

    /**
     * @param {string} key
     * @param {import("../../data/chapters").ChapterItem} item
     * @param {{ isNew: boolean, onArchive?: () => void, onMinigame?: () => void }} opt
     */
    openItem(key, item, opt) {
        this._reset();

        const body = new Container();
        body.addChild(paperPanel(W, H));

        // ── Ảnh ──────────────────────────────────────────────────────────────
        // Khung cảnh vuông quanh vật, dán lên giấy như ảnh chụp có viền ngà —
        // không dùng sprite cắt rời: đứng một mình nó lộ mép răng cưa, mảng nền
        // dính theo, chỗ bị vật khác che thành khúc cụt (góp ý duyệt 11/2026).
        const ix = 36 + (IMAGE - PHOTO) / 2;
        const iy = (H - PHOTO) / 2 - 10;
        const frame = new Graphics()
            .rect(ix - 6, iy - 2, PHOTO + 16, PHOTO + 16).fill({ color: 0x2a1a10, alpha: 0.22 })
            .rect(ix - 9, iy - 9, PHOTO + 18, PHOTO + 18).fill({ color: 0xefe3c6 })
            .rect(ix - 9, iy - 9, PHOTO + 18, PHOTO + 18).stroke({ color: 0x8a6236, width: 1, alpha: 0.6 })
            .rect(ix - 1, iy - 1, PHOTO + 2, PHOTO + 2).fill({ color: 0x120c07 });
        const photo = itemPhoto(key, item.id, PHOTO, PHOTO).view;
        photo.position.set(ix, iy);

        body.addChild(frame, photo);

        // ── Chữ ──────────────────────────────────────────────────────────────
        const x = 36 + IMAGE + 40;
        const textW = W - x - 50;

        const kind = item.kind === "required" ? "CHI TIẾT CHÍNH" : "CHI TIẾT THÊM";
        const badge = label(`${kind}  ·  ${CLAIM_LABEL[item.claim] ?? "Tư liệu"}`, {
            fontFamily: UI.fontBody, fontSize: 13, fontWeight: "bold", letterSpacing: 2,
            fill: item.kind === "required" ? UI.red : UI.green,
        });
        badge.position.set(x, 44);

        const name = title(item.name, {
            fontSize: 30, fill: UI.ink, wordWrap: true, wordWrapWidth: textW, lineHeight: 36,
        });
        name.position.set(x, 66);

        const ruleY = name.y + name.height + 12;
        const rule = ornamentRule(150, 0x8a6236, 0.85);
        rule.position.set(x + 3, ruleY);

        const desc = label(item.desc, {
            fontFamily: UI.fontBody, fontSize: 19, fill: UI.ink,
            wordWrap: true, wordWrapWidth: textW, lineHeight: 28,
        });
        desc.position.set(x, ruleY + 14);

        // Không hiện `meaning` ("Vì sao đáng chú ý"): đó là ý đồ của người thiết
        // kế để diễn giải / thuyết trình, người chơi tự nhận ra — góp ý duyệt 11/2026.
        body.addChild(badge, name, rule, desc);

        let bottom = H - 34;

        // ── Nút theo loại vật (archive / minigame) ────────────────────────────
        const action = item.type === "archive" && opt.onArchive
            ? button("Đọc thêm tư liệu", () => opt.onArchive(), { width: 220, height: 44, fontSize: 17, variant: "ink" })
            : item.type === "minigame" && opt.onMinigame
                ? button("Bắt đầu hoạt động  ➜", () => opt.onMinigame(), { width: 250, height: 46, fontSize: 18 })
                : null;

        if (action) {
            action.position.set(x, bottom - action.buttonHeight);
            bottom -= action.buttonHeight + 12;
            body.addChild(action);
        }

        if (item.src?.length) {
            const src = label(`Nguồn: ${item.src.map((s) => SOURCES[s]?.publisher ?? s).join(" · ")}`, {
                fontFamily: UI.fontBody, fontSize: 13, fontStyle: "italic", fill: 0x7a6650,
                wordWrap: true, wordWrapWidth: textW, lineHeight: 18,
            });
            src.position.set(x, bottom - src.height);
            body.addChild(src);
        }

        if (opt.isNew) {
            const stamp = this._stamp("ĐÃ GHI VÀO HỒ SƠ");
            stamp.position.set(36 + IMAGE / 2, H - 40);
            body.addChild(stamp);
            this.tweens.push(
                gsap.fromTo(stamp.scale, { x: 2.2, y: 2.2 }, { x: 1, y: 1, duration: 0.45, ease: "back.out(2)", delay: 0.25 }),
                gsap.fromTo(stamp, { alpha: 0 }, { alpha: 1, duration: 0.2, delay: 0.25 }),
            );
        }

        this._show(body, W, H);
        play(opt.isNew ? SFX.FOUND : SFX.OPEN);
    }

    /**
     * Trang Archive của cảnh: đoạn tư liệu đầy đủ + danh sách nguồn có tên.
     *
     * @param {import("../../data/chapters").Chapter} chapter
     */
    openArchive(chapter) {
        this._reset();

        const w = 900;
        const body = new Container();

        const heading = title(chapter.archiveTitle, { fontSize: 30, fill: UI.ink });
        const sub = label(`${chapter.title} · ${chapter.date} · ${chapter.place}`, {
            fontFamily: UI.fontTitle, fontSize: 17, fontStyle: "italic", fill: UI.inkSoft,
            wordWrap: true, wordWrapWidth: w - 100,
        });

        const text = label(chapter.archive, {
            fontFamily: UI.fontBody, fontSize: 18, fill: UI.ink,
            wordWrap: true, wordWrapWidth: w - 100, lineHeight: 29,
        });

        const legend = label(chapter.sources.map((s) => {
            const src = SOURCES[s];
            return src ? `• ${src.title} — ${src.publisher}` : `• ${s}`;
        }).join("\n"), {
            fontFamily: UI.fontBody, fontSize: 13, fontStyle: "italic", fill: 0x7a6650, lineHeight: 19,
            wordWrap: true, wordWrapWidth: w - 100,
        });

        const note = label("Nội dung có tham khảo nguồn lịch sử; không gian, NPC và hội thoại được dàn dựng theo chú thích.", {
            fontFamily: UI.fontBody, fontSize: 12, fill: 0x9a8668, wordWrap: true, wordWrapWidth: w - 100,
        });

        heading.position.set(50, 40);
        sub.position.set(50, 82);
        const rule = ornamentRule(180, 0x8a6236, 0.85);
        rule.position.set(53, sub.y + sub.height + 12);
        text.position.set(50, rule.y + 16);
        legend.position.set(50, text.y + text.height + 18);
        note.position.set(50, legend.y + legend.height + 12);

        const h = note.y + note.height + 36;
        body.addChild(paperPanel(w, h), heading, sub, rule, text, legend, note);

        this._show(body, w, h);
        play(SFX.OPEN);
    }

    /**
     * Timeline 1945–1975: mốc đã mở hiện đủ, mốc chưa mở chỉ là chấm mờ —
     * "Timeline chỉ hiện hai đầu 1945 và 1975; khoảng giữa còn trống" lúc đầu.
     *
     * @param {Array<{ id: string, date: string, title: string, text: string }>} all
     * @param {Set<string>} open
     */
    openTimeline(all, open) {
        this._reset();

        const w = 1180;
        const colW = (w - 120) / 2;
        const rows = Math.ceil(all.length / 2);
        const rowH = 58;
        const body = new Container();

        const heading = title("Timeline 1945 — 1975", { fontSize: 30, fill: UI.ink });
        heading.position.set(50, 32);
        body.addChild(heading);

        all.forEach((t, i) => {
            const col = i < rows ? 0 : 1;
            const row = i % rows;
            const x = 50 + col * (colW + 20);
            const y = 90 + row * rowH;
            const isOpen = open.has(t.id);

            const dot = new Graphics().circle(x + 8, y + 12, isOpen ? 7 : 5)
                .fill(isOpen ? UI.gold : 0xbfae94);
            body.addChild(dot);

            const date = label(isOpen ? t.date : "· · ·", {
                fontFamily: UI.fontTitle, fontSize: 15, fontWeight: "bold", fill: isOpen ? UI.red : 0xa89880,
            });
            date.position.set(x + 24, y);
            body.addChild(date);

            if (isOpen) {
                const line = label(`${t.title} — ${t.text}`, {
                    fontFamily: UI.fontBody, fontSize: 14, fill: UI.ink,
                    wordWrap: true, wordWrapWidth: colW - 30, lineHeight: 18,
                });
                line.position.set(x + 24, y + 20);
                body.addChild(line);
            }
        });

        const h = 90 + rows * rowH + 30;
        body.addChildAt(paperPanel(w, h), 0);

        this._show(body, w, h);
        play(SFX.OPEN);
    }

    close() {
        if (!this.isOpen || this._closing) return;
        this._closing = true;

        play(SFX.CLOSE);

        gsap.to(this.panel, {
            alpha: 0, duration: 0.18,
            onComplete: () => {
                this._closing = false;
                this.view.visible = false;
                this._reset();

                const cb = this.onClose;
                this.onClose = null;
                cb?.();
            },
        });
        gsap.to(this.dim, { alpha: 0, duration: 0.18 });
    }

    _show(body, w, h) {
        body.position.set(-w / 2, -h / 2);

        const close = roundButton("✕", () => this.close(), 44);
        close.position.set(w / 2 - 34, -h / 2 - 10);

        this.panel.addChild(body, close);

        this.view.visible = true;
        this.dim.alpha = 0;
        gsap.to(this.dim, { alpha: 1, duration: 0.25 });
        gsap.fromTo(this.panel, { alpha: 0 }, { alpha: 1, duration: 0.2 });
        gsap.fromTo(this.panel.scale, { x: 0.86, y: 0.86 }, { x: 1, y: 1, duration: 0.35, ease: "back.out(1.8)" });
    }

    _stamp(text) {
        const c = new Container();
        const t = label(text, { fontFamily: UI.fontTitle, fontSize: 16, fontWeight: "bold", fill: UI.red, letterSpacing: 2 });
        t.anchor.set(0.5);

        // Con dấu mực đỏ khung đôi — mực không ăn đều nên hơi trong.
        const w = t.width + 34;
        const g = new Graphics()
            .rect(-w / 2, -20, w, 40).stroke({ color: UI.red, width: 2.6 })
            .rect(-w / 2 + 4, -16, w - 8, 32).stroke({ color: UI.red, width: 1 });
        g.alpha = 0.85;
        t.alpha = 0.9;

        c.addChild(g, t);
        c.rotation = -0.06;

        return c;
    }

    _reset() {
        gsap.killTweensOf(this.panel);
        gsap.killTweensOf(this.panel.scale);

        for (const t of this.tweens) t.kill();
        this.tweens.length = 0;

        for (const child of this.panel.removeChildren()) child.destroy({ children: true });

        this.panel.alpha = 1;
    }

    update() {
    }

    resize() {
    }

    dispose() {
        this._reset();
        this.view.destroy({ children: true });
    }
}
