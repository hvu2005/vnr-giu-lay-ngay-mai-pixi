/**
 * Hằng số bố cục và phong cách của game.
 *
 * Quy ước toạ độ: MỌI con số `x`/`y` trong `data/` là PIXEL THIẾT KẾ 1376×768
 * — cùng hệ với `art/scenes.json` và `layout.generated.json`. Ảnh thật xuất ở
 * `artScale` (1.5×) cho nét trên màn PC; `prop-layer.js` thu sprite lại đúng
 * tỉ lệ đó, nên không file dữ liệu nào phải biết ảnh to bao nhiêu.
 * `stage-view.js` lo việc co giãn cả khung vào màn hình.
 */

/**
 * Khung thiết kế = cỡ ảnh Gemini 16:9 (2752×1536) chia đôi. Không phải cỡ cửa
 * sổ: engine quy đổi cỡ cửa sổ về không gian logic (fit chiều cao khi màn
 * ngang), rồi `stage-view.js` đặt khung 1376×768 vào giữa theo kiểu "contain".
 */
export const DESIGN_WIDTH = 1376;
export const DESIGN_HEIGHT = 768;

/**
 * Thứ tự vẽ của các layer — pixi vẽ theo thứ tự `addChild`, nên
 * `game-scene.js` sắp registry theo bảng này thay vì dựa vào vị trí dòng code.
 */
export const ORDER = {
    background: 0,
    props: 10,
    ambient: 20,
    hud: 100,
    card: 200,
    minigame: 250,
    switcher: 260,
    cutscene: 300,
    title: 400,
    // Bộ sưu tập mở được cả từ màn chính → phải nằm trên nó.
    collection: 450,
};

/**
 * Viền vàng phát sáng quanh vật ĐÃ KHÁM PHÁ (giữ luôn) và vật đang được gợi ý
 * — trỏ chuột vào vật chưa tìm thì không sáng (như bản mới của hcm).
 *
 * Hai lớp: `OutlineFilter` vẽ nét mảnh sắc cạnh bám sát biên alpha, rồi
 * `GlowFilter` loang quầng mềm ra ngoài nét đó. Chỉ một trong hai thì hoặc
 * trông như nét bút (thiếu sáng), hoặc như sương mù (thiếu biên).
 *
 * Độ dày tính bằng pixel TEXTURE — texture to gấp `artScale` lần khung thiết
 * kế, nên số ở đây lớn hơn project tham khảo (2.5 / 14) cùng tỉ lệ đó.
 */
export const HOVER_GLOW = {
    outlineColor: 0xffe58a,
    outlineThickness: 3.5,

    glowColor: 0xffc933,
    /** Bán kính quầng, px của texture. */
    glowDistance: 20,
    glowStrengthMin: 1.6,
    glowStrengthMax: 3.2,
    /** Nhịp "thở" của quầng sáng, giây/chu kỳ. */
    pulsePeriod: 1.1,
};

/** Bảng màu giao diện — tông giấy cũ / mực nâu / đỏ cờ, giống project tham khảo. */
export const UI = {
    // Cambria đứng trước: Georgia THIẾU chữ tiếng Việt dựng sẵn (ắ, ầ…), trình
    // duyệt ghép dấu rời nên "Bắt đầu" hiện thành "Bă´t đâ`u". Cambria và Times
    // New Roman có đủ bộ glyph tiếng Việt trên Windows.
    fontTitle: "Cambria, \"Times New Roman\", \"Noto Serif\", serif",
    fontBody: "\"Segoe UI\", Tahoma, Arial, sans-serif",

    paper: 0xf2e4c4,
    paperDark: 0xd9c49a,
    ink: 0x2b1d12,
    inkSoft: 0x5b4632,
    gold: 0xd9a441,
    goldLight: 0xffe58a,
    red: 0x9e2b25,
    green: 0x2f5d50,
    shadow: 0x000000,
};

/** Gợi ý: làm sáng một vật chưa tìm trong vài giây, rồi phải chờ hồi. */
export const HINT = {
    duration: 2.6,
    cooldown: 8,
    /**
     * Đứng yên quá lâu thì nút "?" nhấp nháy mời bấm — tài liệu UX: "Sau một
     * khoảng đứng yên … chỉ hiện lời mời mở Gợi ý", KHÔNG tự làm sáng vật.
     */
    idleInvite: 25,
};
