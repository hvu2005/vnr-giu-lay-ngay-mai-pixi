# Prompt Gemini cho 10 scene — Giữ lấy ngày mai (brief hình ảnh 2.1)

Prompt KHÔNG viết tay ở đây nữa: `node tools/build-prompts.mjs` dựng
`art/prompts/prompts.json` từ `src/docs/visual-briefs.json`. Mỗi cảnh ba lượt trong
CÙNG một chat Gemini (Pro), cùng khung hình:

| Lượt | Nội dung |
|---|---|
| `master` | khối STYLE (giữ nét vẽ cũ: mực nâu, cọ vẽ, tông đất) + `promptMaster` của docs nguyên văn + ghi chú tách sprite (`notes`) + khung `visualBoxPercent` của 6 vật |
| `clean` | sửa ảnh vừa sinh: xoá vật CHUYỂN ĐỘNG (người, cờ) theo danh sách riêng |
| `bare` | sửa bản clean: xoá vật ĐỨNG YÊN theo danh sách riêng |

Docs 2.1: "prompt nền sạch phải dùng danh sách xóa lớp riêng" — nên clean/bare là lệnh
sửa ảnh kèm danh sách, không phải prompt master viết lại. Khi ảnh thật khác danh sách
mặc định (người cầm cờ ở cửa hầm S03, 5 người biệt động S07…), lệnh xoá được viết lại
theo đúng những gì có trong ảnh — ghi ở bảng dưới.

## Ràng buộc chung

- Vật ĐƯỢC che nhau nếu hợp lý về không gian (tự vệ đứng trước chiến lũy, cột cổng che
  xe 843); game vẽ theo chiều sâu, ép bằng `z` trong `data/ambience.js` khi cần.
- Không chữ trong ảnh — trừ số 390 / 843 trên tháp pháo S10 (xem dưới).
- Nhân vật có thật vẽ nhỏ / ba phần tư, thẻ tư liệu mới là nơi giới thiệu người thật.

## Từng cảnh — lần được dùng và lý do

| Cảnh | Ảnh dùng | Ghi chú |
|---|---|---|
| S01 | Ảnh S01 cũ (bố cục 26/10) do người làm nội dung sửa "đông hơn" trong chat Gemini | Hai lần sinh theo brief 2.1 bị bỏ: lần 1 đám đông dày chồng lên nhóm dự lễ, lần 2 quá thưa. **Lệch brief 2.1**: Bác đứng nghiêng về bục ở mép phải chứ không đối diện đám đông; micro bên trái Bác |
| S02 | lần 1 | Đạt checklist (đêm, camera phía tự vệ, đèn điện tắt, gia đình đi xuống phải). Bare không xoá được cột đèn → `bare2` xoá riêng cột đèn |
| S03 | lần 1 | Cờ do một chiến sĩ cắm ở cửa hầm, cán dựng sát mái (brief cho phép "người giữ"). `bare2` lấp hào giữa để lấy mặt nạ hào |
| S04 | lần 1 | Hai tập văn kiện tách nhau trên bàn gần; đoàn VN ở giữa trái hướng vào bàn; sơ đồ trên giá |
| S05 | lần 1 | **Lệch nhỏ**: gùi và kiện nằm trên hai phản tre riêng (brief: một phản). `bare2` xoá lối mòn để lấy mặt nạ lối mòn |
| S06 | lần 2 | Lần 1 nhóm tự vệ bên phải đi NGƯỢC về camera → thêm `notes` "mọi người đi xa camera" |
| S07 | lần 1 | Lịch Gemini vẽ chữ "Tết 1968" → bản clean làm trang lịch trắng (sprite lịch cắt từ clean) |
| S08 | lần 1 | Bare giữ cột điện, chỉ xoá loa (cột còn mang dây điện) |
| S09 | lần 1 | Bare tự thêm một người quay phim ở khu báo chí → mặt nạ máy quay giới hạn bằng `poly` |
| S10 | lần 1 | Đạt checklist (camera ngoài cổng, đuôi + sườn trái xe 390, nòng chĩa vào Dinh, cờ đã treo). **Lệch textRule**: Gemini vẽ sẵn số 390 / 843 đúng xe — giữ lại vì engine chưa có lớp đặt chữ |

## Ghi chú tách sprite (`notes` trong build-prompts.mjs)

- S01: một nhóm ~6 người dự lễ trước lễ đài, đám đông lớn lùi xa sau một dải đất trống,
  không ai đứng chắn mặt trước lễ đài, chỉ Bác trên lễ đài, đúng một micro.
- S06: MỌI người đi xa camera về cổng xã (kể cả nhóm tự vệ), người đánh trống và người
  cầm mõ đứng cạnh trống ở tiền cảnh trái, tách khỏi đoàn.
