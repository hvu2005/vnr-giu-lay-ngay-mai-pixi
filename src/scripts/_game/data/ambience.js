/**
 * "Sự sống" của từng khung cảnh: idle của vật thể / nhân vật, và hiệu ứng nền
 * (khói, sương, bụi trong nắng, quầng đèn, mặt nước gợn).
 *
 * Toạ độ là PIXEL THIẾT KẾ 1376×768 (xem `scene-config.js`). Khoá `props` là
 * `key` của object trong content-pack (`O1`…`H1`).
 *
 * ── IDLE CỦA VẬT THỂ ────────────────────────────────────────────────────────
 *
 * `props[id]` / `actors[k]` = `{ type, amp?, period?, phase?, anchor? }`:
 *
 *   breathe  người thở — co giãn trục dọc quanh bàn chân          amp: tỉ lệ
 *   bob      nhấp nhô lên xuống                                   amp: px
 *   sway     đung đưa quanh `anchor`                              amp: radian
 *   flutter  giấy bị gió lật phật                                 amp: radian
 *   wave     vải treo gợn — xô lệch quanh mép trên                amp: skew
 *   flicker  chập chờn độ sáng                                    amp: 0..1
 *   (mọi kiểu) `z` — ép thứ tự vẽ; mặc định theo chân vật (thấp hơn = gần hơn)
 *   flag     lá cờ bay — sóng vải trong shader (`ripple-filter`),
 *            `pole: "left" | "right"` = phía có cột cờ,
 *            `yMax` = phần vải tính theo chiều cao sprite (cán cờ đứng yên)
 *
 * Chỉ vật đã được Gemini XOÁ khỏi ảnh clean mới được chuyển động (người, cờ):
 * dưới chúng là nền thật. Vật đứng yên (chiến lũy, hầm, cổng…) nằm đè đúng lên
 * chính mình trong nền — cho chúng nhúc nhích là lộ "bóng ma" phía sau.
 *
 * Nhóm người quanh một cái bàn (S08) không thở: sprite ôm cả mặt bàn, co giãn
 * là bàn cũng phập phồng.
 *
 * ── HIỆU ỨNG NỀN ────────────────────────────────────────────────────────────
 *
 *   emitters  hệ hạt — xem `_shared/particles.js` cho từng `type`
 *   halos     quầng đèn cộng sáng, `flicker` = độ chập chờn 0..1
 *   ripples   vùng ảnh nền bị làm gợn: `water` (nước)
 */

const WARM = 0xffc766;

/** @type {Record<string, any>} */
export const AMBIENCE = {
    // ── S01 Ba Đình — nắng chiều từ trái, cờ bay, đám đông chờ đợi ──────────
    s01: {
        props: {
            O1: { type: "flag", pole: "right", yMax: 0.31, amp: 9, freq: 10, speed: 4.2 },
            O4: { type: "breathe", amp: 0.008, period: 3.4 },
            O2: { type: "breathe", amp: 0.007, period: 4.2 },
        },
        actors: [
            { type: "breathe", amp: 0.01, period: 3.1, phase: 1.2 },
        ],
        emitters: [
            { type: "dust", rect: [300, 60, 1100, 600], count: 26, color: 0xfff0c0 },
            { type: "birds", rect: [520, 30, 1000, 170], count: 3 },
        ],
        halos: [
            { x: 120, y: 120, r: 320, color: 0xfff2c8, alpha: 0.18, flicker: 0.03 },
        ],
    },

    // ── S02 Đêm 19/12/1946 — phố tắt đèn, ánh dầu trong nhà, lửa xa ─────────
    s02: {
        props: {
            O2: { type: "breathe", amp: 0.01, period: 3.0 },
            O4: { type: "breathe", amp: 0.01, period: 3.6, phase: 1 },
            O5: { type: "breathe", amp: 0.008, period: 3.3, phase: 2 },
        },
        emitters: [
            { type: "smoke", x: 230, y: 236, rate: 2.5, color: 0x4a3a36, drift: 10, size: 44, alpha: 0.35 },
            { type: "dust", rect: [520, 300, 900, 520], count: 12, color: 0xffd48a },
        ],
        halos: [
            { x: 225, y: 240, r: 150, color: 0xff8a3a, alpha: 0.22, flicker: 0.25 },
            { x: 603, y: 385, r: 70, color: WARM, alpha: 0.45, flicker: 0.18 },
            { x: 845, y: 410, r: 90, color: WARM, alpha: 0.5, flicker: 0.18 },
            { x: 48, y: 350, r: 40, color: WARM, alpha: 0.4, flicker: 0.2 },
        ],
    },

    // ── S03 Điện Biên Phủ — sương sớm, cờ trên nóc hầm ─────────────────────
    s03: {
        props: {
            // Cờ cắm TRÊN nóc hầm: chân cờ cao hơn chân hầm nhưng phải vẽ trên.
            O2: { type: "flag", pole: "right", yMax: 0.72, amp: 7, freq: 9, speed: 4, z: 1000 },
            O5: { type: "breathe", amp: 0.009, period: 3.4 },
        },
        emitters: [
            { type: "smoke", x: 1300, y: 330, rate: 1.6, color: 0x7d7470, drift: -14, size: 40, alpha: 0.3 },
            { type: "smoke", x: 760, y: 300, rate: 1.0, color: 0x8a817a, drift: -10, size: 34, alpha: 0.22 },
            { type: "fog", rect: [-200, 180, 1576, 330], count: 6, color: 0xd8e0e8, alpha: 0.2 },
            { type: "birds", rect: [200, 40, 700, 160], count: 3 },
        ],
        halos: [
            { x: 110, y: 50, r: 260, color: 0xfff6dc, alpha: 0.2, flicker: 0.03 },
        ],
    },

    // ── S04 Giơnevơ — ánh cửa sổ trái, đèn chùm ─────────────────────────────
    s04: {
        props: {
            O2: { type: "breathe", amp: 0.006, period: 4 },
        },
        emitters: [
            { type: "dust", rect: [40, 40, 520, 520], count: 30, color: 0xfff6e0 },
        ],
        halos: [
            { x: 478, y: 80, r: 90, color: WARM, alpha: 0.35, flicker: 0.04 },
            { x: 700, y: 60, r: 120, color: WARM, alpha: 0.35, flicker: 0.04 },
            { x: 1190, y: 25, r: 80, color: WARM, alpha: 0.3, flicker: 0.04 },
            { x: 112, y: 200, r: 30, color: WARM, alpha: 0.4, flicker: 0.1 },
            { x: 310, y: 222, r: 28, color: WARM, alpha: 0.4, flicker: 0.1 },
            { x: 603, y: 228, r: 26, color: WARM, alpha: 0.4, flicker: 0.1 },
            { x: 792, y: 220, r: 26, color: WARM, alpha: 0.4, flicker: 0.1 },
            { x: 1028, y: 205, r: 28, color: WARM, alpha: 0.4, flicker: 0.1 },
        ],
    },

    // ── S05 Trường Sơn — tia nắng xuyên tán rừng ────────────────────────────
    s05: {
        props: {
            O2: { type: "breathe", amp: 0.01, period: 3.2 },
        },
        emitters: [
            { type: "dust", rect: [60, 0, 560, 480], count: 34, color: 0xfff2b0 },
            { type: "fog", rect: [-200, 330, 1576, 520], count: 6, color: 0xc8d4c0, alpha: 0.16 },
            { type: "fireflies", rect: [560, 200, 1000, 520], count: 8 },
        ],
        halos: [
            { x: 140, y: 60, r: 260, color: 0xfff6c8, alpha: 0.22, flicker: 0.04 },
        ],
    },

    // ── S06 Bến Tre — nắng qua tán dừa, kênh nước ───────────────────────────
    s06: {
        props: {
            O2: { type: "breathe", amp: 0.009, period: 3.1 },
            O5: { type: "breathe", amp: 0.008, period: 3.7, phase: 1.4 },
        },
        emitters: [
            { type: "dust", rect: [300, 150, 1100, 600], count: 20, color: 0xfff0b0 },
            { type: "birds", rect: [300, 20, 900, 140], count: 4 },
        ],
        ripples: [
            { mode: "water", rect: [80, 270, 440, 318], amp: 1.6, freq: 40, speed: 1.8 },
            { mode: "water", rect: [1000, 196, 1225, 300], amp: 1.6, freq: 40, speed: 1.6 },
        ],
    },

    // ── S07 Mậu Thân — đèn ấm trong phòng, hầm tối ──────────────────────────
    s07: {
        props: {
            O3: { type: "breathe", amp: 0.008, period: 3.5 },
        },
        emitters: [
            { type: "dust", rect: [430, 120, 760, 420], count: 14, color: 0xffe0a0 },
        ],
        halos: [
            { x: 556, y: 182, r: 170, color: WARM, alpha: 0.28, flicker: 0.06 },
            { x: 556, y: 182, r: 50, color: 0xffe8b0, alpha: 0.5, flicker: 0.08 },
        ],
    },

    // ── S08 Hồ Hữu Tiệp — sáng xám, xác B52 dưới hồ ─────────────────────────
    s08: {
        props: {
            O4: { type: "breathe", amp: 0.009, period: 3.4 },
        },
        emitters: [
            { type: "smoke", x: 1150, y: 330, rate: 1.4, color: 0x5d5a58, drift: -12, size: 44, alpha: 0.3 },
            { type: "fog", rect: [-200, 230, 1576, 360], count: 6, color: 0xdfe3e6, alpha: 0.16 },
        ],
        ripples: [
            { mode: "water", rect: [600, 318, 1376, 470], amp: 1.8, freq: 36, speed: 1.4 },
        ],
    },

    // ── S09 Paris — nắng đông nhạt qua cửa trái, đèn chùm ───────────────────
    s09: {
        props: {
            O2: { type: "breathe", amp: 0.006, period: 4.2 },
        },
        emitters: [
            { type: "dust", rect: [150, 60, 640, 520], count: 30, color: 0xfff6e0 },
        ],
        halos: [
            { x: 1030, y: 70, r: 160, color: WARM, alpha: 0.3, flicker: 0.04 },
            { x: 1020, y: 170, r: 80, color: WARM, alpha: 0.3, flicker: 0.05 },
            { x: 130, y: 50, r: 60, color: WARM, alpha: 0.4, flicker: 0.1 },
            { x: 430, y: 140, r: 45, color: WARM, alpha: 0.35, flicker: 0.1 },
            { x: 570, y: 175, r: 40, color: WARM, alpha: 0.35, flicker: 0.1 },
            { x: 893, y: 210, r: 38, color: WARM, alpha: 0.35, flicker: 0.1 },
            { x: 1172, y: 205, r: 38, color: WARM, alpha: 0.35, flicker: 0.1 },
            // Đèn bàn rọi xuống tập giấy và cây bút.
            { x: 1130, y: 640, r: 150, color: 0xfff2c8, alpha: 0.22, flicker: 0.03 },
        ],
    },

    // ── S10 Dinh Độc Lập — nắng trưa, cờ trên nóc Dinh ──────────────────────
    s10: {
        props: {
            // Cờ trên nóc: chân cờ cao hơn chân toà nhà nhưng phải vẽ trên.
            O3: { type: "flag", pole: "left", yMax: 0.62, amp: 6, freq: 9, speed: 4.4, z: 1000 },
        },
        emitters: [
            { type: "dust", rect: [200, 150, 1200, 650], count: 22, color: 0xfff6d0 },
            { type: "birds", rect: [150, 30, 700, 160], count: 4 },
        ],
        halos: [
            { x: 80, y: 60, r: 300, color: 0xfff8e0, alpha: 0.16, flicker: 0.03 },
        ],
    },
};
