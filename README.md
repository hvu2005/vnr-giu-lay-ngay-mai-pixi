# Giữ lấy ngày mai — PixiJS (bản PC)

Game point & click giáo dục lịch sử 1945–1975: 10 cảnh sự kiện (Ba Đình → Dinh Độc
Lập), mỗi cảnh 5 chi tiết chính + 1 chi tiết thêm, 3 mini-game, 10 cutscene. Nội dung
đọc thẳng từ `src/docs/content-pack.json` (gói nội dung bản 2.1).

Kiến trúc, art style và giao diện theo `D:/Pixi/hcm-di-tim-con-duong` (bản đã pull mới:
UI giấy hồ sơ / sơn mài / đồng thau, bộ sưu tập kỷ vật, bảng chuyển cảnh, trỏ chuột
không lộ vật). `src/engine/` giữ nguyên, game nằm ở `src/scripts/_game/`.

## Chạy

```
npm install
npm run build                 # dev server + watch
node tools/build-once.mjs     # build một lần ra dist/ (~7.3 MB, 1 file JS)
node tools/serve.mjs 8131     # soi dist/ — http://127.0.0.1:8131/
```

URL: `?chapter=s06` vào thẳng cảnh 6 · `?edit` kéo thả vật, phím **P** in toạ độ.
Phím tắt: **C** bộ sưu tập · **S / Tab** chuyển cảnh · **[ ]** cảnh trước / sau.

## Luồng

Màn chính → lời mở → cảnh N (lời mở + mục tiêu) → khám phá 5 chi tiết chính
(+ mini-game ở S03 / S08 / S10) → đoạn thoại chốt 3 lượt → **Tiếp tục hành trình** →
cutscene (2 khung + khung chữ) → cảnh N+1 … CS10 → lời kết + câu hỏi "Bạn muốn gìn giữ
điều gì cho ngày mai?" (chỉ lưu máy này).

## Lối chơi

| Cơ chế | Dạy bằng gì | Lúc nào |
|---|---|---|
| Tìm vật trong cảnh | Khung lời mở + mục tiêu khi vào cảnh | Đầu mỗi cảnh |
| Vật chưa tìm không sáng khi trỏ (như hcm) | Thanh dưới hiện bóng đen 5 chi tiết chính | Luôn |
| Vật đã tìm | Viền vàng giữ luôn trong cảnh + dấu xi trên thanh | Sau khi đóng thẻ |
| Gợi ý 2 cấp | **?**: lần 1 nói vùng (câu `hint` của gói), lần 2 làm vật sáng một nhịp | Khi bấm; đứng yên 25 s nút **?** "thở" mời bấm |
| Mini-game | Nút "Bắt đầu hoạt động" trên thẻ chi tiết loại `minigame` | Có "Xem gợi ý" / "Tự sắp giúp tôi" — trợ giúp vẫn tính qua |
| Tư liệu / Timeline / Bộ sưu tập | Nút 📜 / ⏳ / 🏺 góc phải | Bất kỳ lúc nào |

Thẻ tư liệu ghi nhãn ba lớp nội dung (Tư liệu / Dàn dựng minh hoạ / Hư cấu). Cảnh S07
(có đoạn tưởng niệm Đồng Lộc ở CS07) không phát nhạc mừng khi xong.

## Asset — sinh bằng Gemini trong Chrome

Ảnh 10 cảnh làm lại theo **brief hình ảnh 2.1** (`src/docs/04-brief-hinh-anh.md`,
`visual-briefs.json`): mỗi cảnh một khoảnh khắc, một camera, một trục không gian. Prompt
sinh bằng `node tools/build-prompts.mjs` → `art/prompts/prompts.json` (khối style giữ nét
vẽ cũ + prompt master của docs nguyên văn + khung `visualBoxPercent` của 6 vật + danh sách
xoá cho clean/bare). Ghi chú từng cảnh, lần sinh hỏng và lý do ở `art/prompts/scenes.md`;
bìa ở `art/prompts/cover.md`. Mỗi cảnh ba ảnh cùng một cuộc chat Gemini (Pro), cùng khung hình:

| Ảnh | Nội dung | Dùng làm |
|---|---|---|
| `sNN_master` | đủ 6 vật | nguồn pixel của vật **chuyển động** (người, cờ) |
| `sNN_clean` | Gemini xoá vật chuyển động, vẽ lại nền phía sau | **nền** của cảnh |
| `sNN_bare` | xoá nốt vật đứng yên | mặt nạ của vật đứng yên |

`python tools/prepare-assets.py [sNN…]` cắt vật theo `art/scenes.json`:
- `diff` — mặt nạ = master ≠ clean (người, cờ). Bóng đổ tách thành `shadow_*.webp`
  (đứng yên, không viền vàng). Cảnh tối thêm `refine` (GrabCut theo hạt giống diff).
- `bare` — mặt nạ = clean ≠ bare, pixel lấy từ nền → sprite trùng khít nền.
- `src: "bare2"` — mặt nạ lấy từ một ảnh bare phụ `sNN_bare2.png` (Gemini xoá riêng vật
  khó xoá chung một lượt: cột đèn mảnh S02, hào đất S03, lối mòn S05).
- `poly` / `polys` — giới hạn mặt nạ diff/bare khi Gemini vẽ lại cả đám đông/người nền
  phía sau (S01 Bác, micro, bục; S04 đoàn VN; S09 bảng tên, máy quay); ở mode `poly` là
  vùng cắt luôn (cửa hầm, cửa ra hẻm S07, cửa sảnh S10). `cut` + `actors` tách bóng xe thồ S03.
- `grab` / `rect` — dự phòng.
- Ảnh xuất 1.5× (2064×1152) cho nét trên màn PC; toạ độ dữ liệu vẫn 1376×768.
- `art/debug/sNN_cut.jpg` vẽ viền mọi mặt nạ để soi; script cảnh báo khi hai vật giao nhau.

`tools/recv-server.mjs`: máy chủ nhận ảnh — tab Gemini đẩy ảnh full-size (data-url)
qua một cửa sổ `127.0.0.1:8765` (nút tải của Gemini không ghi được file trong phiên tự động:
Chrome chặn lượt tải thứ hai không có cử chỉ chuột). Cách lấy PNG gốc 2752×1536: bọc
`window.fetch` của trang Gemini, bấm nút "Tải hình ảnh có kích thước đầy đủ", bắt response
`image/png` rồi gửi data-url sang cửa sổ nhận. Cửa sổ nhận phải mở bằng một cú bấm thật
(popup mở bằng script bị chặn); các tab Gemini khác chuyển ảnh qua `BroadcastChannel`.

## Bố cục & chồng vật

Prompt yêu cầu các vật tách rời để cắt sạch. Vật **được** che nhau nếu hợp lý về không
gian (cột cổng Dinh Độc Lập che một phần xe tăng 843…): game vẽ theo chiều sâu — chân
vật thấp hơn trên màn = gần hơn = vẽ sau và được dò chuột trước. Vật gắn trên vật khác
(cờ trên nóc hầm / nóc Dinh) khai `z` trong `data/ambience.js`.

## Animation (`data/ambience.js`)

Chỉ vật đã được xoá khỏi nền mới chuyển động: người **thở**, cờ **bay** (shader sóng vải,
`pole` = phía cột cờ, `yMax` = phần vải). Nền: khói, sương, bụi nắng, chim, quầng đèn chập
chờn, mặt nước gợn.

## Cấu trúc

| File | Việc |
|---|---|
| `data/chapters.js` | đổi hình content-pack cho layer (không viết nội dung mới) |
| `data/ambience.js` | idle vật, hiệu ứng nền từng cảnh |
| `sim/progress.js` | luật qua cảnh, mini-game, Timeline, lưu localStorage |
| `_scene/game-scene.js` | điều phối luồng, phím tắt |
| `layers/prop-layer.js` | vật, dò chuột theo alpha, viền vàng, gợi ý |
| `layers/hud-layer.js` | bảng tên cảnh, thanh 5 chi tiết, gợi ý, đoạn thoại chốt |
| `layers/card-layer.js` | thẻ tư liệu, Archive, Timeline |
| `layers/minigame-layer.js` | 3 mini-game (sắp thứ tự / ghép chú thích) |
| `layers/collection-layer.js` | bộ sưu tập kỷ vật (port hcm) |
| `layers/scene-switcher-layer.js` | bảng chuyển cảnh (port hcm) |
| `layers/title-layer.js` | màn chính + bìa + lời mở |
| `layers/cutscene-layer.js` | cutscene, lời kết |
| `_shared/ui.js` | bộ UI của hcm (giấy hồ sơ, sơn mài, nút đồng thau) |

## Chưa có / khác tài liệu

- Cutscene chưa có 20 khung tranh riêng: dùng nền cảnh vừa xong và cảnh kế (Ken Burns).
- Bộ sưu tập chưa có ảnh tư liệu thật (hcm dùng ảnh public domain): hiện khung cảnh
  trong game, ghi rõ "hình minh hoạ, không phải ảnh tư liệu".
- Âm thanh: SFX tổng hợp WebAudio như hcm, chưa có nhạc/voice.
- Cài đặt (tốc độ chữ, cỡ chữ…) chưa làm.
