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
            // Ảnh 11/2026: vải cờ chiếm ~60% trên của sprite (cán dài xuống tay
            // người cầm). Đầu và bàn tay người cầm cờ đứng TRƯỚC vải/cán nhưng
            // actor luôn vẽ dưới vật → sprite cờ đã khoét hình người (`cut`
            // trong scenes.json), người lộ qua lỗ.
            O1: { type: "flag", pole: "right", yMax: 0.6, amp: 9, freq: 10, speed: 4.2 },
            O4: { type: "breathe", amp: 0.008, period: 3.4 },
            O2: { type: "breathe", amp: 0.007, period: 4.2 },
        },
        actors: [
            { type: "breathe", amp: 0.006, period: 3.1, phase: 1.2 },
        ],
        emitters: [
            { type: "dust", rect: [300, 60, 1100, 600], count: 26, color: 0xfff0c0 },
            { type: "birds", rect: [520, 30, 1000, 170], count: 3 },
        ],
        halos: [
            { x: 120, y: 120, r: 320, color: 0xfff2c8, alpha: 0.18, flicker: 0.03 },
        ],
    },

    // ── S02 Đêm 19/12/1946 — phố tắt điện, đèn dầu hiên trái là nguồn ấm ────
    // Brief 2.1: đèn điện đều tắt, không lấy lửa nổ làm nguồn sáng toàn cảnh →
    // bỏ quầng lửa xa của bản cũ, chỉ còn đèn dầu hiên trái.
    s02: {
        props: {
            // Tự vệ đứng TRƯỚC chiến lũy (phía camera) nhưng chân cao hơn chân
            // chiến lũy (724 < 727) → ép vẽ sau, không thì bàn tủ đè lên người.
            O2: { type: "breathe", amp: 0.01, period: 3.0, z: 730 },
            O4: { type: "breathe", amp: 0.01, period: 3.6, phase: 1 },
            O5: { type: "breathe", amp: 0.008, period: 3.3, phase: 2 },
        },
        emitters: [
            { type: "dust", rect: [250, 200, 480, 420], count: 10, color: 0xffd48a },
        ],
        halos: [
            { x: 340, y: 262, r: 80, color: WARM, alpha: 0.5, flicker: 0.18 },
            { x: 380, y: 330, r: 150, color: WARM, alpha: 0.18, flicker: 0.12 },
        ],
    },

    // ── S03 Điện Biên Phủ — cuối chiều, cờ trên nóc hầm ────────────────────
    // Brief 2.1: nắng cuối chiều từ trên phải, KHÔNG sương sớm → bỏ lớp sương,
    // khói bốc từ các cột khói ở chân trời của ảnh.
    s03: {
        props: {
            // Cờ cắm TRÊN nóc hầm: chân cờ cao hơn chân hầm nhưng phải vẽ trên.
            // Ảnh 11/2026: hai chiến sĩ đứng trên nóc giữ cờ, cán bên trái, vải
            // bay sang phải chiếm ~38% trên của sprite (dưới là người, đứng yên).
            O2: { type: "flag", pole: "left", yMax: 0.38, amp: 6, freq: 9, speed: 4, z: 1000 },
            O5: { type: "breathe", amp: 0.009, period: 3.4 },
        },
        emitters: [
            // Gốc các cột khói vẽ sẵn trong ảnh 11/2026.
            { type: "smoke", x: 790, y: 265, rate: 1.4, color: 0x7d7470, drift: 12, size: 36, alpha: 0.25 },
            { type: "smoke", x: 420, y: 265, rate: 1.0, color: 0x8a817a, drift: 10, size: 30, alpha: 0.2 },
            { type: "smoke", x: 1300, y: 610, rate: 1.0, color: 0x8a817a, drift: 10, size: 30, alpha: 0.2 },
            { type: "birds", rect: [200, 40, 700, 160], count: 3 },
        ],
        halos: [
            { x: 1250, y: 40, r: 300, color: 0xffe6b0, alpha: 0.16, flicker: 0.03 },
        ],
    },

    // ── S04 Giơnevơ — ánh ban ngày qua cửa sổ trái ──────────────────────────
    // Ảnh 2.1 không có đèn chùm → chỉ còn quầng cửa sổ và bụi trong vệt nắng.
    s04: {
        props: {
            // Sprite đoàn VN ôm cả dải mép bàn giữa thân và chân (cho liền một
            // khối trên thẻ tư liệu) → thở rất nhẹ để mép bàn không phập phồng.
            O2: { type: "breathe", amp: 0.003, period: 4 },
        },
        emitters: [
            { type: "dust", rect: [40, 40, 520, 520], count: 30, color: 0xfff6e0 },
        ],
        halos: [
            { x: 120, y: 160, r: 280, color: 0xfff6e0, alpha: 0.12, flicker: 0.02 },
        ],
    },

    // ── S05 Trường Sơn — tia nắng sáng xuyên tán rừng ───────────────────────
    s05: {
        props: {
            O2: { type: "breathe", amp: 0.01, period: 3.2 },
        },
        emitters: [
            { type: "dust", rect: [60, 0, 560, 480], count: 34, color: 0xfff2b0 },
            { type: "fog", rect: [-200, 330, 1576, 520], count: 6, color: 0xc8d4c0, alpha: 0.16 },
        ],
        halos: [
            { x: 140, y: 60, r: 260, color: 0xfff6c8, alpha: 0.22, flicker: 0.04 },
        ],
    },

    // ── S06 Bến Tre — nắng sáng qua tán dừa từ trên phải ────────────────────
    // Ảnh 2.1 không có kênh nước trong khung → bỏ hai vùng mặt nước gợn.
    s06: {
        props: {
            O2: { type: "breathe", amp: 0.009, period: 3.1 },
            O5: { type: "breathe", amp: 0.008, period: 3.7, phase: 1.4 },
        },
        emitters: [
            { type: "dust", rect: [300, 150, 1100, 600], count: 20, color: 0xfff0b0 },
            { type: "birds", rect: [300, 20, 900, 140], count: 4 },
        ],
    },

    // ── S07 Mậu Thân — đèn treo ấm giữa phòng, hầm tối ─────────────────────
    s07: {
        props: {
            O3: { type: "breathe", amp: 0.008, period: 3.5 },
        },
        emitters: [
            { type: "dust", rect: [470, 90, 760, 400], count: 14, color: 0xffe0a0 },
        ],
        halos: [
            { x: 585, y: 105, r: 170, color: WARM, alpha: 0.28, flicker: 0.06 },
            { x: 585, y: 100, r: 45, color: 0xffe8b0, alpha: 0.5, flicker: 0.08 },
        ],
    },

    // ── S08 Hồ Hữu Tiệp — sáng xám, xác máy bay nằm yên trên hồ ────────────
    // Brief 2.1: không khói dày che xác → một làn khói mỏng; trong hầm có ánh
    // ấm rất yếu.
    s08: {
        props: {
            O4: { type: "breathe", amp: 0.009, period: 3.4 },
        },
        emitters: [
            { type: "smoke", x: 1080, y: 260, rate: 1.0, color: 0x5d5a58, drift: -10, size: 38, alpha: 0.22 },
            { type: "fog", rect: [-200, 230, 1576, 360], count: 6, color: 0xdfe3e6, alpha: 0.16 },
        ],
        halos: [
            { x: 395, y: 600, r: 70, color: WARM, alpha: 0.25, flicker: 0.12 },
        ],
        ripples: [
            { mode: "water", rect: [440, 330, 1240, 520], amp: 1.8, freq: 36, speed: 1.4 },
        ],
    },

    // ── S09 Paris — ánh phòng đều, đèn chùm và đèn tường ───────────────────
    s09: {
        props: {
            O2: { type: "breathe", amp: 0.006, period: 4.2 },
        },
        emitters: [
            { type: "dust", rect: [100, 40, 520, 520], count: 30, color: 0xfff6e0 },
        ],
        halos: [
            { x: 860, y: 25, r: 140, color: WARM, alpha: 0.28, flicker: 0.04 },
            { x: 785, y: 90, r: 70, color: WARM, alpha: 0.28, flicker: 0.05 },
            { x: 270, y: 40, r: 50, color: WARM, alpha: 0.38, flicker: 0.1 },
            { x: 430, y: 95, r: 40, color: WARM, alpha: 0.35, flicker: 0.1 },
            { x: 705, y: 115, r: 35, color: WARM, alpha: 0.35, flicker: 0.1 },
            { x: 930, y: 115, r: 35, color: WARM, alpha: 0.35, flicker: 0.1 },
            { x: 1340, y: 55, r: 50, color: WARM, alpha: 0.38, flicker: 0.1 },
        ],
    },

    // ── S10 Dinh Độc Lập — nắng trưa, cờ trên nóc Dinh ──────────────────────
    s10: {
        props: {
            // Cờ trên nóc: chân cờ cao hơn chân toà nhà nhưng phải vẽ trên.
            O3: { type: "flag", pole: "left", yMax: 0.42, amp: 6, freq: 9, speed: 4.4, z: 1000 },
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
