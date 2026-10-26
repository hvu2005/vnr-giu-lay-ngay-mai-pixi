import { runGame } from "./src/scripts/_game/await-me-in-main";

/**
 * GIỮ LẤY NGÀY MAI — point & click giáo dục, hành trình 1945–1975.
 *
 * Tham số URL hữu ích khi làm nội dung:
 *   ?chapter=s06   vào thẳng cảnh 6, bỏ qua màn hình chính
 *   ?edit          kéo thả vật thể để chỉnh bố cục, phím P in toạ độ
 */
(async () => {
    await runGame();
})();
