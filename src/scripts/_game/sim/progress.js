import { CHAPTERS, TIMELINE } from "../data/chapters";

/**
 * Tiến trình người chơi — vật nào đã khám phá, mini-game nào đã xong, cảnh
 * nào đã mở, mốc Timeline nào đã thấy.
 *
 * Không biết gì về pixi: layer đọc trạng thái từ đây rồi tự vẽ, giống
 * `sim/game.js` của project mẫu. Luật qua cảnh nằm đúng một chỗ:
 *
 *   đủ 5 vật bắt buộc  +  mini-game của cảnh (nếu có) "xong" hoặc "đã được giúp"
 *   ──► đoạn thoại chốt ──► nút Tiếp tục
 *
 * (`rules` trong content-pack: `assistedCountsForProgress: true`,
 * `hiddenRequired: false` — dùng trợ giúp không bao giờ khoá tiến độ.)
 *
 * Lưu vào `localStorage`; mọi truy cập bọc try/catch: chế độ ẩn danh hoặc bị
 * chặn site data thì chạy như lần đầu chứ không vỡ game.
 */

const STORAGE_KEY = "giu-lay-ngay-mai/progress/v1";

export class Progress {
    constructor() {
        /** @type {Record<string, string[]>} cảnh → id vật đã khám phá */
        this.found = {};

        /** @type {Record<string, "completed" | "assisted">} */
        this.minigames = {};

        /** @type {string[]} cảnh đã nghe đoạn thoại chốt */
        this.closingSeen = [];

        /** Số cảnh đã mở khoá (cảnh đầu luôn mở). */
        this.unlocked = 1;

        /** Câu trả lời "Bạn muốn gìn giữ điều gì cho ngày mai?" — chỉ lưu máy này. */
        this.note = "";

        this._load();
    }

    /**
     * @param {string} key
     * @param {string} itemId
     */
    isFound(key, itemId) {
        return (this.found[key] ?? []).includes(itemId);
    }

    /**
     * Ghi nhận vật đã đọc xong (lúc ĐÓNG thẻ, không phải lúc mở — "Lần đầu xem
     * hết nội dung và đóng popup sẽ đánh dấu object đã khám phá").
     *
     * @param {string} key
     * @param {string} itemId
     * @returns {{ isNew: boolean, justReady: boolean }}
     *   `justReady` chỉ đúng ở ĐÚNG lần làm cảnh đủ điều kiện — để HUD phát đoạn
     *   thoại chốt một lần chứ không phát lại mỗi lần mở lại thẻ.
     */
    markFound(key, itemId) {
        const before = this.isReady(key);
        const list = this.found[key] ?? (this.found[key] = []);
        const isNew = !list.includes(itemId);

        if (isNew) {
            list.push(itemId);
            this._save();
        }

        return { isNew, justReady: this.isReady(key) && !before };
    }

    /**
     * @param {string} minigameId
     * @param {"completed" | "assisted"} outcome
     */
    setMinigame(minigameId, outcome) {
        // "completed" không bị hạ xuống "assisted" khi chơi lại rồi bấm giúp.
        if (this.minigames[minigameId] !== "completed") this.minigames[minigameId] = outcome;
        this._save();
    }

    /** @param {string} minigameId */
    minigameDone(minigameId) {
        return !!this.minigames[minigameId];
    }

    /**
     * @param {string} key
     * @param {"required" | "hidden"} kind
     */
    count(key, kind) {
        const chapter = CHAPTERS.find((c) => c.key === key);
        const items = chapter.items.filter((i) => i.kind === kind);
        const done = items.filter((i) => this.isFound(key, i.id)).length;

        return { done, total: items.length };
    }

    /** Đủ điều kiện mở đoạn chốt + nút Tiếp tục. @param {string} key */
    isReady(key) {
        const chapter = CHAPTERS.find((c) => c.key === key);
        const { done, total } = this.count(key, "required");

        if (done < total) return false;

        return !chapter.minigameId || this.minigameDone(chapter.minigameId);
    }

    /** @param {string} key */
    markClosing(key) {
        if (!this.closingSeen.includes(key)) {
            this.closingSeen.push(key);
            this._save();
        }
    }

    /**
     * Qua cảnh — mở khoá cảnh kế tiếp.
     *
     * @param {string} key
     * @returns {string | null} key cảnh kế, `null` nếu đã là cảnh cuối
     */
    complete(key) {
        const index = CHAPTERS.findIndex((c) => c.key === key);

        this.unlocked = Math.max(this.unlocked, Math.min(CHAPTERS.length + 1, index + 2));
        this._save();

        return CHAPTERS[index + 1]?.key ?? null;
    }

    /**
     * Cảnh đã QUA (cảnh sau nó đã mở) — quay lại cảnh này thì luôn đi tiếp được,
     * kể cả khi chưa đủ điều kiện: qua bằng bảng chuyển cảnh, hoặc bản lưu cũ
     * chưa ghi `closingSeen`. Cảnh cuối: đã xem hết hành trình.
     *
     * @param {string} key
     */
    isPassed(key) {
        const index = CHAPTERS.findIndex((c) => c.key === key);
        return index >= 0 && this.unlocked > index + 1;
    }

    /** @param {number} index */
    isUnlocked(index) {
        return index < this.unlocked;
    }

    /** Đã đi hết 10 cảnh (đã xem CS10). */
    get finished() {
        return this.unlocked > CHAPTERS.length;
    }

    /**
     * Mốc Timeline đã mở: mốc gắn với một cảnh mở khi đã VÀO cảnh đó, mốc gắn
     * với cutscene (`CS01`…) mở khi đã qua cảnh trước cutscene đó.
     *
     * @returns {typeof TIMELINE}
     */
    timeline() {
        return TIMELINE.filter((t) => {
            const unlock = String(t.unlock ?? "");
            const m = unlock.match(/^(S|CS)(\d+)/);
            if (!m) return true;

            const n = Number(m[2]);
            return m[1] === "S" ? n <= this.unlocked : n < this.unlocked;
        });
    }

    /** @param {string} text */
    setNote(text) {
        this.note = text;
        this._save();
    }

    reset() {
        this.found = {};
        this.minigames = {};
        this.closingSeen = [];
        this.unlocked = 1;
        this._save();
    }

    _load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;

            const data = JSON.parse(raw);
            this.found = data.found ?? {};
            this.minigames = data.minigames ?? {};
            this.closingSeen = data.closingSeen ?? [];
            this.note = data.note ?? "";
            this.unlocked = Math.max(1, Math.min(CHAPTERS.length + 1, data.unlocked ?? 1));
        } catch {
            // site data bị chặn / JSON hỏng — chơi như lần đầu
        }
    }

    _save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                found: this.found,
                minigames: this.minigames,
                closingSeen: this.closingSeen,
                unlocked: this.unlocked,
                note: this.note,
            }));
        } catch {
            // không lưu được thì thôi, phiên này vẫn chơi bình thường
        }
    }
}
