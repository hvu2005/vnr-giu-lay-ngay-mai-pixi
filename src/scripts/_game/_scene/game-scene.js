import { gsap } from "gsap";
import { Graphics, Text } from "pixi.js";

import { Scene, loadAssets } from "../../../engine";
import { PixiObject } from "../../../engine/adapters/pixi/extensions/pixi-object";

import { CHAPTERS, chapterByKey, MINIGAMES, TIMELINE } from "../data/chapters";
import { DESIGN_HEIGHT, DESIGN_WIDTH, ORDER, UI } from "../data/scene-config";
import { play, SFX, unlockAudio } from "../_shared/sfx";
import { Progress } from "../sim/progress";
import { StageView } from "./stage-view";

import { AmbientLayer } from "./layers/ambient-layer";
import { BackgroundLayer } from "./layers/background-layer";
import { CardLayer } from "./layers/card-layer";
import { CollectionLayer } from "./layers/collection-layer";
import { CutsceneLayer } from "./layers/cutscene-layer";
import { HudLayer } from "./layers/hud-layer";
import { MinigameLayer } from "./layers/minigame-layer";
import { PropLayer } from "./layers/prop-layer";
import { SceneSwitcherLayer } from "./layers/scene-switcher-layer";
import { TitleLayer } from "./layers/title-layer";

/**
 * Scene duy nhất của game — điều phối luồng (chuỗi trạng thái chuẩn của
 * tài liệu sản xuất):
 *
 *   màn chính ──(lời mở)──► cảnh N ── khám phá 5 chi tiết chính ─┐
 *                             │  ▲   (+ mini-game ở S03/S08/S10) │
 *                             ▼  │                               ▼
 *                         thẻ tư liệu / Archive          đoạn thoại chốt
 *                                                                ▼
 *                                              nút Tiếp tục ──► cutscene ──► cảnh N+1
 *                                                                     … CS10 ──► lời kết
 *
 * ── LAYER ───────────────────────────────────────────────────────────────────
 *
 * Như project tham khảo: mỗi layer lo một mảng hình, khai `order` rồi SẮP THEO
 * NÓ (pixi vẽ theo thứ tự `addChild`). Layer gắn với cảnh có thêm cặp
 * `enter(key)` / `leave()` — dựng khi vào cảnh, dọn khi rời.
 *
 * ── LUẬT CHƠI Ở ĐÂU ─────────────────────────────────────────────────────────
 *
 * Trạng thái (vật đã khám phá, mini-game, cảnh đã mở) nằm ở `sim/progress.js`,
 * không biết gì về pixi. Scene chỉ nối: layer báo "người chơi bấm vật X" →
 * scene hỏi `progress` → bảo HUD / thẻ vẽ lại.
 *
 * @typedef {{
 *   init(): Promise<void> | void,
 *   update(dt: number): void,
 *   resize(): void,
 *   dispose(): void,
 *   enter?(key: string): void,
 *   leave?(): void,
 * }} Layer
 */
export class GameScene extends Scene {
    /**
     * @override
     */
    async startScene() {
        this.stage = new StageView();

        this.root = new PixiObject(this);
        this.root.addChild(this.stage.root);
        this.pixi.add(this.root);

        // Chữ "đang tải" dựng TRƯỚC `loadAssets()`: vài MB ảnh nhúng base64 mất
        // một hai giây để giải mã, không có gì trên màn thì tưởng game treo.
        const loading = new Text({
            text: "Đang tải…",
            style: { fontFamily: UI.fontTitle, fontSize: 28, fill: UI.goldLight, fontStyle: "italic" },
        });
        loading.anchor.set(0.5);
        loading.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);
        this.stage.ui.addChild(loading);
        this.onResize(this.width, this.height);

        await loadAssets((p) => {
            loading.text = `Đang tải… ${Math.round(p * 100)}%`;
        });

        loading.destroy();

        this.progress = new Progress();

        this.background = new BackgroundLayer(this);
        this.props = new PropLayer(this);
        this.ambient = new AmbientLayer(this);
        this.hud = new HudLayer(this);
        this.card = new CardLayer(this);
        this.minigame = new MinigameLayer(this);
        this.cutscene = new CutsceneLayer(this);
        this.title = new TitleLayer(this);
        this.switcher = new SceneSwitcherLayer(this);
        this.collection = new CollectionLayer(this);

        /** @type {Array<{ order: number, layer: Layer }>} */
        const registry = [
            { order: ORDER.background, layer: this.background },
            { order: ORDER.props, layer: this.props },
            { order: ORDER.ambient, layer: this.ambient },
            { order: ORDER.hud, layer: this.hud },
            { order: ORDER.card, layer: this.card },
            { order: ORDER.minigame, layer: this.minigame },
            { order: ORDER.cutscene, layer: this.cutscene },
            { order: ORDER.title, layer: this.title },
            { order: ORDER.switcher, layer: this.switcher },
            { order: ORDER.collection, layer: this.collection },
        ];

        /** @type {Layer[]} */
        this.layers = registry
            .sort((a, b) => a.order - b.order)
            .map((entry) => entry.layer);

        for (const layer of this.layers) {
            await layer.init();
        }

        /** Màn đen phủ trên cùng cho chuyển cảnh. */
        this.fader = new Graphics().rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT).fill(0x000000);
        this.fader.alpha = 0;
        this.fader.eventMode = "none";
        this.stage.ui.addChild(this.fader);

        // WebAudio chỉ mở được trong handler của một cú chạm thật.
        this.pixi.stage.on("pointerdown", () => unlockAudio());

        // Phím tắt như hcm: C bộ sưu tập, S / Tab bảng chuyển cảnh, [ lùi, ] tiến.
        window.addEventListener("keydown", (e) => {
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
            if (e.code === "KeyC") {
                this.toggleCollection();
            } else if (e.key === "Tab" || e.code === "KeyS") {
                e.preventDefault();
                this.toggleSceneSwitcher();
            } else if (e.code === "BracketLeft") {
                this.prevChapter();
            } else if (e.code === "BracketRight") {
                this.nextChapter();
            }
        });

        /** @type {string | null} */
        this.chapterKey = null;

        this.onResize(this.width, this.height);

        this.addUpdate((dt) => {
            // Frame đầu tiên của `bootstrap` có thể cho `dt` âm — mọi layer đều
            // cho rằng thời gian chỉ tiến, nên lọc ở đây.
            const step = dt > 0 ? dt : 0;

            for (const layer of this.layers) {
                layer.update(step);
            }
        });

        window.__game = { scene: this, progress: this.progress };

        // Deep link cho người làm nội dung: `?chapter=s06` vào thẳng cảnh 6.
        const direct = new URLSearchParams(location.search).get("chapter");

        if (direct && CHAPTERS.some((c) => c.key === direct)) {
            this.startChapter(direct);
        } else {
            this.title.show();
        }
    }

    // ══ LUỒNG ════════════════════════════════════════════════════════════════

    /** @param {string} key */
    async startChapter(key) {
        if (this._busy) return;
        this._busy = true;

        this.props.enabled = false;
        await this._fade(1);

        this._leaveChapter();
        this.title.view.visible = false;

        this.chapterKey = key;

        try {
            for (const layer of this.layers) layer.enter?.(key);
        } catch (error) {
            // Lỗi trong một `enter()` mà không bắt thì màn đen đứng im mãi
            // (promise bị nuốt), không có gì trong console để lần ra.
            console.error(`[game] không dựng được cảnh ${key}:`, error);
        }

        await this._fade(0);

        this.props.enabled = true;
        this._busy = false;
    }

    async showTitle() {
        if (this._busy) return;
        this._busy = true;

        this.props.enabled = false;
        this.card.view.visible = false;
        await this._fade(1);

        this._leaveChapter();
        this.title.show();

        await this._fade(0);
        this._busy = false;
    }

    _leaveChapter() {
        if (!this.chapterKey) return;

        for (const layer of this.layers) layer.leave?.();
        this.chapterKey = null;
    }

    /**
     * Người chơi bấm vào vật (trong cảnh hoặc ô đã khám phá ở thanh dưới).
     *
     * Vật chỉ được ĐÁNH DẤU khi đóng thẻ — "Lần đầu xem hết nội dung và đóng
     * popup sẽ đánh dấu object đã khám phá. Click lại luôn mở lại nội dung".
     *
     * @param {string} itemId
     */
    openItem(itemId) {
        const key = this.chapterKey;
        if (!key || this.card.isOpen || this.minigame.isOpen || this.hud.dialogue) return;

        const chapter = chapterByKey(key);
        const item = chapter.items.find((i) => i.id === itemId);
        if (!item) return;

        const isNew = !this.progress.isFound(key, itemId);
        let toMinigame = false;

        this.props.enabled = false;
        this.props._setHover(null);

        this.card.onClose = () => {
            const result = this.progress.markFound(key, itemId);
            this.hud.refresh();
            if (result.isNew) {
                this.hud.celebrate(itemId);
                this.hud.pulseCollection();
            }
            this.props.enabled = true;

            if (toMinigame) this.openMinigame(chapter.minigameId);
            else this._afterProgress(result.justReady);
        };

        this.card.openItem(key, item, {
            isNew,
            onArchive: () => this.card.openArchive(chapter),
            onMinigame: chapter.minigameId ? () => {
                toMinigame = true;
                this.card.close();
            } : undefined,
        });
    }

    /** @param {string} minigameId */
    async openMinigame(minigameId) {
        const mg = MINIGAMES[minigameId];
        if (!mg) return;

        const before = this.progress.isReady(this.chapterKey);
        this.props.enabled = false;

        const result = await this.minigame.open(mg);
        if (result) this.progress.setMinigame(minigameId, result);

        this.props.enabled = true;
        this._afterProgress(!before && this.progress.isReady(this.chapterKey));
    }

    /**
     * Sau mỗi bước tiến: đủ điều kiện lần đầu → đoạn thoại chốt; đủ 5 chi
     * tiết mà còn thiếu mini-game → nhắc.
     *
     * @param {boolean} justReady
     */
    async _afterProgress(justReady) {
        const key = this.chapterKey;
        const chapter = chapterByKey(key);

        if (justReady) {
            this.props.enabled = false;
            // Cảnh tưởng niệm không phát nhạc mừng (tiêu chí nghiệm thu nội dung).
            if (key !== "s07") play(SFX.COMPLETE);
            await this.hud.playDialogue(chapter.dialogue, chapter.closing);
            this.progress.markClosing(key);
            this.hud.showContinue(true);
            this.props.enabled = true;
            return;
        }

        const req = this.progress.count(key, "required");
        if (req.done >= req.total && chapter.minigameId && !this.progress.minigameDone(chapter.minigameId)) {
            this.hud.remindMinigame(chapter.minigameId);
        }
    }

    openArchive() {
        if (!this.chapterKey || this.card.isOpen) return;

        this.props.enabled = false;
        this.props._setHover(null);
        this.card.onClose = () => {
            this.props.enabled = true;
        };
        this.card.openArchive(chapterByKey(this.chapterKey));
    }

    openTimeline() {
        if (this.card.isOpen) return;

        this.props.enabled = false;
        this.props._setHover(null);
        this.card.onClose = () => {
            this.props.enabled = !!this.chapterKey;
        };
        this.card.openTimeline(TIMELINE, new Set(this.progress.timeline().map((t) => t.id)));
    }

    // ══ BỘ SƯU TẬP / CHUYỂN CẢNH (port từ hcm) ═══════════════════════════════

    /** Bộ sưu tập kỷ vật — mở từ HUD, màn chính hoặc phím C. */
    openCollection() {
        if (this._busy) return;
        this.collection.open();
    }

    toggleCollection() {
        if (this._busy || this.cutscene.view.visible || this.minigame.isOpen) return;
        this.collection.toggle();
    }

    toggleSceneSwitcher() {
        if (this._busy || this.cutscene.view.visible || this.minigame.isOpen) return;
        // Bộ sưu tập nằm trên bảng chuyển cảnh — đóng nó trước, kẻo bảng mở ngầm bên dưới.
        if (this.collection.isOpen) this.collection.close();
        this.switcher.toggle();
    }

    nextChapter() {
        if (this._busy || !this.chapterKey) return;
        const index = CHAPTERS.findIndex((c) => c.key === this.chapterKey);
        this.startChapter(CHAPTERS[(index + 1) % CHAPTERS.length].key);
    }

    prevChapter() {
        if (this._busy || !this.chapterKey) return;
        const index = CHAPTERS.findIndex((c) => c.key === this.chapterKey);
        this.startChapter(CHAPTERS[(index - 1 + CHAPTERS.length) % CHAPTERS.length].key);
    }

    /**
     * Nút "Tiếp tục hành trình" — cutscene rồi sang cảnh kế. Cảnh đã qua từ
     * trước (người chơi quay lại xem): sang thẳng cảnh kế, cutscene đã xem rồi.
     */
    async finishChapter() {
        if (this._busy || !this.chapterKey) return;

        if (this.progress.isPassed(this.chapterKey)) {
            const index = CHAPTERS.findIndex((c) => c.key === this.chapterKey);
            const next = CHAPTERS[index + 1];
            if (next) this.startChapter(next.key);
            else this.showTitle();
            return;
        }

        this._busy = true;
        this.props.enabled = false;

        const chapter = chapterByKey(this.chapterKey);
        const next = this.progress.complete(chapter.key);

        await this.cutscene.play(chapter, next ? chapterByKey(next) : null);

        this._busy = false;

        if (next) {
            this.startChapter(next);
        } else {
            this.showTitle();
        }
    }

    /** Có thao tác của người chơi — HUD tính thời gian đứng yên từ đây. */
    noteActivity() {
        this.hud.noteActivity();
    }

    /**
     * @param {number} to 1 = đen hẳn, 0 = trong suốt
     * @returns {Promise<void>}
     */
    _fade(to) {
        return new Promise((resolve) => {
            gsap.to(this.fader, { alpha: to, duration: 0.45, ease: "sine.inOut", onComplete: resolve });
        });
    }

    /** Trạng thái gọn cho `tools/shot.mjs` / debug console. */
    debugState() {
        const key = this.chapterKey;
        return {
            chapter: key,
            found: key ? this.progress.found[key] ?? [] : [],
            ready: key ? this.progress.isReady(key) : false,
            unlocked: this.progress.unlocked,
            minigames: this.progress.minigames,
        };
    }

    // ══ KÍCH THƯỚC ═══════════════════════════════════════════════════════════

    /**
     * @override
     * @param {number} width
     * @param {number} height
     */
    onResize(width, height) {
        this.stage?.resize(width, height);

        // Engine dựng canvas theo cỡ LOGIC rồi kéo giãn bằng CSS, nên trên màn
        // to hơn khung thiết kế chữ và viền vàng bị mờ. Nâng độ phân giải của
        // backbuffer lên đúng tỉ lệ kéo giãn (tối đa 2) — toạ độ logic không
        // đổi, chỉ số pixel thật tăng lên.
        const stretch = window.innerHeight / height;
        const resolution = Math.min(2, Math.max(1, stretch * (window.devicePixelRatio || 1)));

        this.pixi.renderer.resize(width, height, resolution);

        for (const layer of this.layers ?? []) layer.resize();
    }
}
