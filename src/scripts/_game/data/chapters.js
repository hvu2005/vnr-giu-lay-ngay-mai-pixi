import PACK from "../../../docs/content-pack.json";

/**
 * NỘI DUNG — đọc THẲNG từ `src/docs/content-pack.json` (gói nội dung bản 2.0).
 *
 * Project tham khảo chép tay nội dung sang JS rồi ghi chú "sửa tài liệu trước";
 * ở đây gói nội dung đã là JSON nên game import luôn: một nguồn duy nhất, sửa
 * câu chữ trong gói là game đổi theo, không có bản sao nào lệch nhau.
 *
 * File này chỉ ĐỔI HÌNH dữ liệu cho các layer dùng (tên trường ngắn, khoá cảnh
 * `s01`… trùng thư mục asset), không viết thêm nội dung.
 *
 * ── KHOÁ CỦA VẬT THỂ ────────────────────────────────────────────────────────
 *
 * `item.id` là `key` của object trong gói (`O1`…`O5`, `H1`) — trùng khoá trong
 * `art/scenes.json` và `layout.generated.json` (sprite `prop_O1.webp`…).
 */

/**
 * @typedef {{
 *   id: string,
 *   fullId: string,
 *   kind: "required" | "hidden",
 *   type: "inspect" | "dialogue" | "archive" | "minigame",
 *   name: string,
 *   desc: string,
 *   meaning: string,
 *   src: string[],
 *   hint: string,
 *   claim: string,
 *   note: string,
 * }} ChapterItem
 *
 * @typedef {{
 *   frames: Array<[string, string]>,
 *   card: string,
 *   id: string,
 * }} Cutscene
 *
 * @typedef {{
 *   key: string, id: string, part: string,
 *   title: string, date: string, year: string, place: string,
 *   opening: string, objective: string, insight: string, question: string,
 *   archiveTitle: string, archive: string, closing: string,
 *   dialogue: Array<[string, string]>,
 *   sources: string[],
 *   minigameId: string | null,
 *   items: ChapterItem[],
 *   cutscene: Cutscene,
 * }} Chapter
 */

export const META = PACK.meta;
export const PROLOGUE = PACK.prologue;
export const EPILOGUE = PACK.epilogue;
export const TIMELINE = PACK.timeline;
export const PARTS = PACK.chapters;

/** @type {Record<string, { id: string, title: string, publisher: string, url: string }>} */
export const SOURCES = Object.fromEntries(PACK.sources.map((s) => [s.id, s]));

/** @type {Record<string, any>} */
export const MINIGAMES = Object.fromEntries(PACK.minigames.map((m) => [m.id, m]));

/** Nhãn ba lớp nội dung — mục "Ba lớp nội dung" của high concept. */
export const CLAIM_LABEL = {
    historical: "Tư liệu",
    illustrative: "Dàn dựng minh hoạ",
    fiction: "Hư cấu",
};

/** @type {Chapter[]} */
export const CHAPTERS = PACK.scenes
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
        key: s.id.toLowerCase(),
        id: s.id,
        part: s.chapter,
        title: s.title,
        date: s.date,
        // Năm cho trục thời gian / tab bộ sưu tập — ngày trong gói có dạng
        // "2/9/1945", "Đêm 19/12/1946", "Tết Mậu Thân 1968"… nên lấy năm cuối.
        year: (s.date.match(/19\d\d/g) ?? [""]).pop(),
        place: s.place,
        opening: s.opening,
        objective: s.objective,
        insight: s.insight,
        question: s.question,
        archiveTitle: s.archiveTitle,
        archive: s.archive,
        closing: s.closing,
        dialogue: s.dialogue,
        sources: s.sources,
        minigameId: s.completion.minigameId,
        items: s.objects.map((o) => ({
            id: o.key,
            fullId: o.id,
            kind: o.hidden ? "hidden" : "required",
            type: o.kind,
            name: o.name,
            desc: o.text,
            meaning: o.meaning,
            src: o.sourceIds ?? [],
            hint: o.hint,
            claim: o.claimStatus,
            note: o.readingNote,
        })),
        cutscene: s.cutscene,
    }));

/** @param {string} key */
export function chapterByKey(key) {
    return CHAPTERS.find((c) => c.key === key);
}

/** @param {string} partId */
export function partById(partId) {
    return PARTS.find((p) => p.id === partId);
}
