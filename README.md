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
| Vật đã tìm | Vòng khoanh cọ đỏ giữ luôn trong cảnh + dấu xi trên thanh | Sau khi đóng thẻ |
| Gợi ý 2 cấp | **?**: lần 1 nói vùng (câu `hint` của gói), lần 2 khoanh đỏ vật một nhịp | Khi bấm; đứng yên 25 s nút **?** "thở" mời bấm |
| Mini-game | Nút "Bắt đầu hoạt động" trên thẻ chi tiết loại `minigame` | Có "Xem gợi ý" / "Tự sắp giúp tôi" — trợ giúp vẫn tính qua |
| Tư liệu / Timeline / Bộ sưu tập | Nút 📜 / ⏳ / 🏺 góc phải | Bất kỳ lúc nào |

Quay lại cảnh ĐÃ QUA (cảnh sau đã mở — `Progress.isPassed`): nút "Tiếp tục hành trình" hiện
sẵn và sang thẳng cảnh kế, không phát lại cutscene. Trước đó nút chỉ hiện khi cảnh đủ điều
kiện + đã nghe đoạn chốt, nên cảnh qua bằng bảng chuyển cảnh / bản lưu cũ không có đường đi
tiếp — phải về màn hình chính (góp ý 11/2026).

Thẻ tư liệu ghi nhãn ba lớp nội dung (Tư liệu / Dàn dựng minh hoạ / Hư cấu). Trường
`meaning` của gói nội dung ("Vì sao đáng chú ý") KHÔNG hiện ở thẻ lẫn bộ sưu tập: đó là ý
đồ của người thiết kế để diễn giải / thuyết trình, người chơi tự nhận ra (góp ý 11/2026). Cảnh S07
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
- `snap` — kéo mép mặt nạ về nét mực (watershed) để viền vàng bám sát vật. **Chỉ mặc định
  cho vật đứng yên (`bare`)**. Vật chuyển động (`diff`) phải khai `snap` riêng: nền clean
  dưới chúng không có vật, snap cắt nhầm là thủng thật trong game. Bản đầu bật snap cho mọi
  vật đã: khoét lỗ tóc (người đưa thư, gia đình tản cư S02, cậu bé cầm mõ S06, lính S03 —
  tóc/mũ tối nằm trên nền tối bị coi là nét mực), làm đứt chân lính cầm cờ S03.
- `whole` — mặt nạ = nguyên đa giác (rồi snap) khi bare không xoá hết vật: chân giá bản đồ
  S04, chân máy quay S09 trước đó bị mất trên thẻ tư liệu / viền vàng.
- `close: [rộng, cao]` — nối lại vật mảnh bị diff đứt quãng (cột đèn S02, nhân dọc 40 px).
- `cut` trên nhân vật nền: nông dân cầm cờ S01 từng dính một khuôn mặt người dự lễ cạnh
  bàn tay — người thở thì cái đầu đó trôi theo tay. Đa giác Bác S01 cũng được thu sát nét
  áo, bỏ nắm tay + cờ + áo trắng của người phía sau.
- `add` — đa giác ép vào mặt nạ khi vật đứng yên che ngang vật chuyển động: lan can lễ
  đài trước chân Bác S01, mép bàn giữa thân và chân đoàn VN S04. Thiếu nó sprite đứt khúc
  trên thẻ tư liệu (đúng lỗi "Bác mất một chân" bị chê).
- `watermark` — ảnh Gemini bản thường (1376×768, tài khoản hết gói Pro) đặt dấu ✦ ở chỗ
  khác; chỉ inpaint đúng pixel sáng của dấu, không cả khung (inpaint cả khung kéo màu gỗ
  xuống nỉ xanh S04 thành vệt tối). Ảnh 1376 được phóng Lanczos lên 1.5×.
- `art/debug/sNN_cut.jpg` vẽ viền mọi mặt nạ để soi; script cảnh báo khi hai vật giao nhau.

### Mặt nạ bám hình vật — MobileSAM (11/2026)

Góp ý: "outline cắt không khớp với ảnh". Mặt nạ diff / bare / đa giác ăn cả mảng nền
Gemini vẽ lại quanh vật → viền vàng ôm tường hẻm quanh xe tải S07, cắt ngang đầu đám
đông S01 thành đường thẳng, bục phát biểu thành hình chữ nhật. Bước cuối của mỗi mặt nạ
giờ là **MobileSAM** (`tools/sam.py`, ONNX, chạy CPU ~4 s/cảnh): khung bao mặt nạ cũ (hoặc
từng đa giác `poly`/`polys`, hoặc `sam.boxes`) → SAM trả mặt nạ bám nét mực của vật, giới
hạn trong mặt nạ cũ nới 8 px. Cài: `pip install onnxruntime` + 2 file model ở `art/models/`
(không commit — nguồn ghi đầu `tools/sam.py`).

- `sam: false` cho vật là mặt đất (lối mòn S05, đường làng S06, hào S03) — không có nét
  viền để SAM bám.
- **Phần dư `rest_<id>.webp`** (vật chuyển động): nền clean đã xoá người, nên chỗ mặt nạ
  cũ có mà SAM bỏ phải vẫn hiện — bản đầu chỉ dùng SAM làm biến mất 3 người cuối đoàn S06,
  người ngồi ghi chép S08, tay anh bộ đội S08, người áo xanh S01. Phần dư lấy pixel master,
  chỉ chỗ master khác clean, bỏ vành 2 px quanh mép vật, vẽ tĩnh dưới mọi vật, không viền /
  không bấm. Dung lượng: bản đầu (cả vành, cả chỗ giống clean) +670 KB → 16 ảnh, 167 KB;
  bundle 6,39 MB → 6,54 MB.
- Vật đứng yên (pixel nền clean): lấp lỗ (cửa hầm S03, sảnh Dinh S10) trừ chỗ có người
  phía sau; dải mép 14 px không phủ lên chỗ master khác hẳn clean — lòng quai giỏ S01 từng
  đè mất chân đám đông thành quầng đất sáng.
- S02 chiến lũy `exclude` nhóm tự vệ đứng trước nó; S04 đoàn VN bỏ đa giác `add` mép bàn
  (chỉ để thẻ tư liệu khỏi đứt khúc — thẻ giờ là khung cảnh), khai 4 khung SAM.
- Kiểm: chụp từng cảnh trong game (tắt HUD, hiệu ứng, nhịp thở) rồi trừ ảnh master — vùng
  lệch lớn là vật / người bị mất.
- **S01 cờ + đoàn người dự lễ (góp ý "outline vàng chưa khớp, vẽ liền luôn")**. Trước: cờ 2
  mảnh (cán đứt ở bàn tay người cầm), mép dưới vải răng cưa ôm đầu đám đông, cán phình ra
  ôm vai người phía sau; đoàn người mép trên lởm chởm cắt ngang đầu hàng sau + 2 mảnh vụn
  rời sau lưng người cầm cờ. Sau: mỗi vật **1 mảnh**.
  - Cờ: SAM chỉ chạy khung vải (điểm dương trên vải, âm trên đầu người); cán là dải
    ±9 px quanh đường tâm đo từng hàng trên ảnh (cán hơi cong, dốc trên/dưới bàn tay khác
    nhau) khai bằng `over` — ép vào SAU `cut`, nên viền chạy thẳng qua bàn tay tới hết cán.
    Pixel bàn tay trong dải lấy từ master, trùng actor nên không lộ.
  - Đoàn người: 9 khung SAM, mỗi người hàng đầu một khung (`clip: 4` không tràn sang
    khung bên), `close: 14` gộp thành một khối, `add` chân người áo xanh xám (sau bàn tay)
    + khe giữa hai người đầu hàng. Người hàng sau / mảnh sau lưng người cầm cờ vẫn hiện qua
    `rest_O4` (tĩnh, không viền).
  - `sam.strict: true` (cả hai): không kéo lại phần diff mạnh sát mép SAM — chính phần đó
    tạo răng cưa.

### Ảnh trong thẻ tư liệu / bộ sưu tập = khung cảnh (11/2026)

Góp ý: "ảnh trong popup bị cắt một khúc, vỡ — lấy khung vuông cho đẹp". Thẻ tư liệu
không còn đặt sprite cắt rời lên giấy (lộ mép răng cưa, mảng nền dính, khúc bị che cụt):
`_shared/scene-crop.js` dựng lại cảnh đủ lớp (nền → phần dư → bóng → nhân vật nền → vật
theo chiều sâu) rồi cắt khung vuông 330 px quanh vật (vật chiếm ~1/1.35 khung, chạm mép
cảnh thì khung trượt vào), dán viền ngà. Bộ sưu tập dùng cùng hàm (khung rộng, pad 2.2) —
bản cũ chỉ ghép nền clean với đúng một vật nên người xung quanh biến mất khỏi ảnh.

### Ảnh isolate từng vật (11/2026, thử S01)

Góp ý: "mỗi món đồ generate bản isolate để cho vào bên dưới và popup tư liệu — nhìn đẹp hơn".
Gemini (một chat, mỗi lượt một vật, tải lên master + ảnh cắt `art/isolate/ref/sNN_<id>.png`)
vẽ lại riêng từng vật **đủ hình** (cờ đủ cán không tay, Bác đủ chân, đoàn người đủ chân) trên
nền trắng → `art/gemini/sNN_iso_<id>.png`. `prepare-assets.py` (`isolate_asset`) tách nền
(trắng nối mép + mảng trắng tinh ≥ 150 px lọt trong nét mực — khe chân đoàn người, lòng quai
giỏ), cắt sát, cạnh dài 640 px → `sNN/iso_<id>.webp`, khai `iso` trong layout; `iso_flip`
lật ngang khi Gemini vẽ ngược chiều cảnh (cờ S01).

- Dùng ở: ô thanh dưới (cả bóng đen chưa tìm), ô bộ sưu tập, ảnh thẻ tư liệu + chi tiết bộ
  sưu tập (nền giấy ngà, nhãn "MINH HOẠ"). Vật chưa có isolate → khung cảnh như cũ
  (`itemPhoto` / `itemImageFile` trong `_shared/scene-crop.js`).
- Gemini vẽ lại khác dáng (cờ dựng đứng, Bác buông tay, bục to ngang hơn, đoàn 12 người xếp
  khác) nên isolate không chồng khít lên cảnh — chỉ dùng cho giao diện.
- Dung lượng S01: 6 ảnh 229 KB, bundle 6,53 → 6,84 MB. 10 cảnh ước +3 MB.
- Đã có: S01–S04 (11/2026). S05–S10 chờ lượt Gemini (hết lượt 8/11, mở lại 9/11).
- `iso_tight` (scenes.json): vật giấy màu kem (bảng tên S04 O5, min kênh ~232, bão hoà ~17)
  bị ngưỡng nền thường (> 228, bão hoà < 28) coi là nền, loang vào qua khe nét mực hở →
  siết ngưỡng (> 244, < 8); nền Gemini thật bão hoà 0.
- S04 O3 (sơ đồ giới tuyến): Gemini kéo vạch vĩ tuyến 17 sang nửa nước Lào → xoá tay
  (inpaint) phần vạch phía tây biên giới Việt–Lào, giữ đoạn từ biên giới ra biển.

### Vòng khoanh cọ đỏ thay viền vàng (11/2026)

Góp ý: "thay vì outline vàng thì khoanh đỏ, hiệu ứng như cọ vẽ rồi xoáy; nhiều kích thước
khoanh cho đẹp". Viền vàng bám mép alpha của sprite nên rối và lệch ở mọi chỗ vật bị che
(né tay người cầm cờ, cụt ở chân bục). Đã thử viền từ "bản lành lặn tại chỗ" (Gemini vẽ bù
phần bị che, căn SIFT về cảnh) rồi bỏ theo hướng mới — vòng khoanh không cần mặt nạ chính xác.

- **Bộ vòng**: Gemini vẽ 3 tấm (`art/gemini/ring_{a_round,b_wide,c_tall}.png`, mỗi tấm 4 vòng
  cọ đỏ đậm + mảnh). `tools/brush-rings.py` tách từng vòng → `ui/ring_<n>.webp` (màu đỏ đồng
  nhất, vệt cọ ở alpha) + `data/rings.generated.json` (tỉ lệ, độ dày nét đo bằng tia từ tâm,
  góc bắt đầu = mép đoạn chồng đầu–đuôi). Bỏ 6 vòng nét bè (15–22 % cạnh ngắn, không bao
  giờ hợp cỡ vật) → giữ 6 vòng tỉ lệ 0,28 / 0,49 / 0,97 / 1,00 / 2,16 / 2,92, 232 KB.
- **Nhiều cỡ mà nét đều** (`_shared/circle-mark.js`): khung vòng = khung vật × 1,18/1,1 + lề
  14 px (tối thiểu 70 px); mỗi vật chọn vòng gần tỉ lệ khung nhất + nét sau co giãn gần nét
  chuẩn (5 % cạnh ngắn, kẹp 4–9 px) nhất; co giãn lệch tỉ lệ tối đa 1,45; lật ngang theo id.
  Đo nét bằng 2·diện tích/chu vi lúc đầu sai (mép cọ khô tưa làm chu vi dài gấp mấy lần →
  nét đo mỏng hơn thật → chọn nhầm vòng bè, đoàn người S01 bị khoanh nét ~30 px).
- **Hiệu ứng**: mặt nạ quạt quét theo góc từ mép đoạn chồng (đoạn chồng hiện cuối như cọ
  khép vòng), chậm–nhanh–chậm 0,75 s; cùng lúc xoáy vào (xoay −0,45 rad → 0, thu 1,22 → 1,
  back-out). Xong thì gỡ mặt nạ. Gợi ý hết giờ → mờ 0,35 s. Vật tìm từ lần trước: vòng có sẵn.
- Vòng nằm TRÊN mọi vật (vòng Bác không bị bục che). Khung riêng khi khung sprite không hợp
  ở `data/circle-overrides.js` (cờ S01: chỉ khoanh vải + đầu cán, không cả cán dài).
- Bỏ `GlowOutline` / `HOVER_GLOW` / `pixi-filters` khỏi game.
- Bundle 7,72 → 7,98 MB (vòng +232 KB; trong khoảng đó còn isolate S02–S03).

### Sinh lại S01 / S03 / S04 (11/2026, theo góp ý duyệt art)

| Cảnh | Góp ý | Ảnh mới |
|---|---|---|
| S01 | Bối cảnh như công viên, Bác đứng sân khấu thấp quay nghiêng | Quảng trường Ba Đình (nhà kiểu Pháp, đám đông kín), lễ đài gỗ cao có rèm đỏ, Bác đứng trên lễ đài quay ra đám đông; thành viên Chính phủ đứng sau |
| S03 | Lính đứng trong hào, mũ sắt kiểu Âu, bối cảnh sai | Lính đội mũ nan nguỵ trang chạy khỏi hào lao về hầm De Castries mái tôn vòm phủ bao cát; hai chiến sĩ cắm cờ trên nóc; lòng chảo Mường Thanh, dù, dây thép gai, pháo hỏng |
| S04 | Bàn chữ nhật dài | Bàn xếp hình vuông rỗng, 9 đoàn ngồi quanh bốn cạnh (không phải "4 bên" — đó là Paris S09) |

Prompt sửa ở `brief` trong `tools/build-prompts.mjs` (thay `promptMaster` của docs khi góp ý
lịch sử mâu thuẫn với docs).

S07 (góp ý "người mất đầu, cầm cuộn đồ + gậy"): lỗi nằm ở **mặt nạ cắt**, không phải ảnh —
ảnh gốc 5 người đủ đầu, chỉ đeo túi. Người đi đầu đứng sát khung cửa tối: diff master/clean
ăn cả dải khung cửa giữa cổ áo và cánh tay (trông như cây gậy), `rect` cũ dừng ở x 1066 nên
mất ngón tay chỉ (nắm tay như cầm đồ), mép sau gáy bị khoét. Sửa trong `art/scenes.json`
(O3): `add` gáy + bàn tay, `cut` dải khung cửa. Lỗi lộ rõ nhất trên thẻ tư liệu (sprite
đứng một mình); trong cảnh, chỗ thiếu tay bị sprite cửa O5 (lấy từ clean) đè thành nắm tay
cụt. Giữ ảnh cũ 2752×1536: bản sinh lại 11/2026 (Gemini miễn phí, 1376×768) phòng trống
trơn, một người vẫn bị che nửa đầu — kém hơn bản đang dùng.

Bảng lời mở cảnh: dòng ngày · địa điểm xuống dòng trong khung 800 px — địa điểm S07 dài
~900 px từng tràn ra hai mép khung.

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
| `layers/prop-layer.js` | vật, dò chuột theo alpha, vòng khoanh đỏ, gợi ý |
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
