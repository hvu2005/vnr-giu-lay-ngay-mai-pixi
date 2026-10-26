/**
 * Tiếng động TỔNG HỢP bằng WebAudio — bộ bàn giao chưa có file âm thanh nào.
 *
 * Vài nốt sine/triangle có bao âm là đủ cho phản hồi point & click (trỏ vào,
 * tìm được, qua màn) mà không thêm một byte nào vào bundle. Khi có âm thanh
 * thật thì thay phần thân của `play()` bằng Howler như `sound-manager.js` của
 * project mẫu — nơi gọi không đổi.
 *
 * `AudioContext` chỉ được dựng sau cú chạm đầu tiên: trình duyệt treo context
 * dựng trước tương tác, và tiếng phát lúc đó mất luôn chứ không xếp hàng.
 */

/** @type {AudioContext | null} */
let ctx = null;
let muted = false;

export const SFX = {
    HOVER: "hover",
    FOUND: "found",
    OPEN: "open",
    CLOSE: "close",
    COMPLETE: "complete",
    HINT: "hint",
};

/** Mỗi tiếng = danh sách nốt [tần số Hz, bắt đầu s, dài s, âm lượng, dạng sóng]. */
const PATCHES = {
    hover: [[1320, 0, 0.05, 0.025, "sine"]],
    open: [[520, 0, 0.12, 0.06, "triangle"], [780, 0.05, 0.14, 0.05, "triangle"]],
    close: [[640, 0, 0.1, 0.05, "triangle"], [430, 0.05, 0.12, 0.04, "triangle"]],
    found: [[784, 0, 0.35, 0.08, "sine"], [1175, 0.09, 0.45, 0.07, "sine"], [1568, 0.18, 0.6, 0.05, "sine"]],
    hint: [[988, 0, 0.3, 0.05, "sine"], [1319, 0.12, 0.4, 0.04, "sine"]],
    complete: [
        [523, 0, 0.5, 0.07, "triangle"], [659, 0.14, 0.5, 0.07, "triangle"],
        [784, 0.28, 0.5, 0.07, "triangle"], [1047, 0.42, 1.1, 0.08, "triangle"],
    ],
};

/** Gọi trong handler của cú chạm đầu tiên. */
export function unlockAudio() {
    if (ctx) {
        if (ctx.state === "suspended") ctx.resume();
        return;
    }

    try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
        ctx = null;
    }
}

/** @param {boolean} value */
export function setMuted(value) {
    muted = value;
}

export function isMuted() {
    return muted;
}

/** @param {string} name một giá trị trong `SFX` */
export function play(name) {
    if (!ctx || muted) return;

    const notes = PATCHES[name];
    if (!notes) return;

    const now = ctx.currentTime;

    for (const [freq, start, dur, vol, wave] of notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = wave;
        osc.frequency.value = freq;

        // Bao âm: vào nhanh, tắt theo hàm mũ — không có nó thì mỗi nốt kết
        // thúc bằng một tiếng "tách".
        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.exponentialRampToValueAtTime(vol, now + start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

        osc.connect(gain).connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + dur + 0.05);
    }
}
