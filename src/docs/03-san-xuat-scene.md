# Tài liệu sản xuất Giữ lấy ngày mai

# Quy chuẩn sản xuất và dữ liệu

## Quy cách chung

Giữ phong cách 2D vẽ tay, giàu chi tiết vừa đủ để khám phá, chuyển động nhỏ và giao diện gọn. Canvas tham chiếu 1280 × 720. Tọa độ trong dữ liệu là tọa độ chuẩn hóa của hình; hitbox nháp tính theo canvas này.

Vùng tương tác theo bản mẫu cũ được thống nhất ở **80 ≤ y ≤ 670**. Cả hình chữ nhật hitbox phải nằm trong vùng an toàn. Trên màn hình khác tỷ lệ, dùng cùng phép biến đổi và letterbox cho hình lẫn hitbox; không dời riêng object để né UI. Khi hộp thoại mở, khóa tương tác với cảnh phía sau.

Mỗi cảnh có FG tiền cảnh, MG trung cảnh và BG hậu cảnh. Mọi vật thể có bề mặt đỡ, phối cảnh phù hợp, bóng tiếp xúc và nguồn sáng nhất quán. Tọa độ là đề xuất bố cục ban đầu; phải kiểm tra lại trên ảnh đã duyệt trước khi dùng trong bản chơi.

## Pipeline hình ảnh thống nhất

1. Chốt ngày hoặc giai đoạn, địa điểm, nội dung tư liệu, vật minh họa và danh sách nhân vật. Xác định một nguồn sáng chính.
2. Phác bố cục với 6 vùng tương tác và safe zone. Đặt vật lên bề mặt thật trong cảnh, kiểm tra đường nhìn và chiều sâu.
3. Tạo **một ảnh master hoàn chỉnh có toàn bộ nhân vật và đạo cụ tương tác**, để các vật cùng phối cảnh và ánh sáng. Chữ, nhãn và văn bản vẫn để trống.
4. Cắt sprite hoặc nhóm sprite từ chính ảnh master, lưu cả mask, vùng cắt, pivot và z-order. Nhóm nhân vật có thể là sprite tĩnh. Với BG như đường phố, có thể giữ vùng ảnh gốc làm lớp highlight thay vì tách một công trình khỏi nền.
5. Inpaint ảnh clean ở những vùng thật sự cần tách hoặc chuyển động. Bản master vẫn là ảnh tham chiếu. Đặt lại sprite đúng vị trí phải khôi phục cảnh liền mạch.
6. Render toàn bộ chữ bằng engine, kể cả nhãn bảng tin, lịch, bản đồ và giấy. Với mặt giấy nghiêng, dùng mesh hoặc biến đổi phù hợp mặt phẳng; không dán chữ nằm ngang lên mọi mặt giấy.
7. Kiểm tra toàn cảnh, zoom viền 200%, overlay hitbox và trạng thái hover. Sửa ảnh hoặc mask trước khi chỉnh hitbox lần cuối.

Các object quan sát như lá cờ, người, cửa sổ và đường phố **không biến mất khi đã đọc**. Tiến độ nằm ở UI. Chỉ tạo nền clean cho phần cần lớp riêng hoặc chuyển động, không inpaint xóa cả con đường chỉ vì đã click.

Không sinh một sprite rời rồi ép vào khung bằng fit_into. Điều chỉnh vùng cắt và vị trí theo ảnh master thay vì làm vật thể lơ lửng.

## Định mức asset

| Nhóm | Số lượng thiết kế | Ghi chú |
| --- | --- | --- |
| Ảnh master cảnh | 10 | Mỗi ảnh chứa trọn bố cục và các đối tượng |
| Ảnh clean hoặc lớp nền hỗ trợ | Tối đa 10 | Chỉ xử lý vùng cần tách; có thể giữ nguyên master ở cảnh tĩnh |
| Vùng hoặc nhóm sprite tương tác | 60 | 50 bắt buộc và 10 ẩn; một nhóm có thể cần nhiều lớp ảnh |
| Cutscene | 30 khung | 20 khung minh họa, 10 khung chữ; khung chữ do engine render |
| Mini-game | 3 bộ | Thẻ, tranh và vùng nhận riêng; tái dùng UI |
| Mở và kết hành trình | 1 bộ mô-típ | Lá cờ, văn kiện, bản đồ và phương tiện; tái dùng từ cảnh |
| UI chung | 1 bộ | Panel, nút, con trỏ, tiến độ, Timeline, Archive, cài đặt |
| Âm thanh cảnh | 10 cấu hình | Có thể tái dùng lớp môi trường; không đồng nghĩa cần 10 bản nhạc |

Không đồng nhất 60 vùng tương tác với đúng 60 tệp PNG. Tên asset theo quy tắc S01_master, S01_clean, S01_O1, CS01_F1; tất cả chỉ là **tên dự kiến**, chưa phải tài nguyên đã sản xuất.

## Bảng màu và âm thanh theo chương

Chương 1 dùng nắng Ba Đình, đêm phố Hà Nội, đất chiến trường Điện Biên và ánh sáng phòng hội nghị. Chương 2 đi từ rừng Trường Sơn, nắng làng quê Bến Tre tới đèn trong cơ sở Biệt động. Chương 3 dùng màu trầm ở Hà Nội 1972, phòng ký Paris sáng rõ và nắng sân Dinh Độc Lập. Nguồn sáng cụ thể của từng cảnh quyết định bảng màu; không phủ một tông lên cả chương.

Nhạc chủ đề đề xuất dùng một giai điệu mới sáng tác, với đàn bầu, sáo hoặc bộ gõ nhẹ ở mức tiết chế. Cảnh tưởng niệm ưu tiên im lặng và âm môi trường. Không dùng lời ca, bản ghi lịch sử hay nhạc thương mại khi chưa có tài nguyên và quyền sử dụng phù hợp. Voice-over hiện có dưới dạng kịch bản chữ; chưa có file thu âm.

## Cơ chế dữ liệu và tiến độ

Tệp content-pack.json là dữ liệu nội dung độc lập. Đây là **đề xuất cấu trúc để lập trình viên ánh xạ vào game**, chưa xác nhận tương thích với schema dự án cũ vì chưa có mã nguồn.

| Nhóm dữ liệu | Trường chính | Mục đích |
| --- | --- | --- |
| meta | title, version, period, referenceCanvas | Thông tin bản nội dung |
| chapters | id, sceneIds, question, arc | Tổ chức ba chương |
| scenes | id, date, place, opening, insight, objects | Nội dung 10 cảnh |
| objects | id, kind, layer, text, meaning, sourceIds, required, hidden, claimStatus | Tương tác và nội dung popup |
| hitboxDraft | cx, cy, width, height | Hình chữ nhật nháp, đơn vị pixel ở canvas chuẩn |
| anchor | x và y trong mảng hai số | Điểm giữa chuẩn hóa theo hình |
| completion | requiredObjectIds, minigameId, requiresHidden | Điều kiện mở đoạn chốt và nút Tiếp tục |
| cutscene | frames, finalFrame, duration | Hai khung tranh và một khung chữ |
| minigames | cards, correctOrder hoặc target, feedback | Nội dung và đáp án hỗ trợ |
| timeline | date, unlock, sourceIds | Mốc thời gian và điều kiện mở |
| sources | id, publisher, url, supports | Nguồn cho các thông tin lịch sử |

Chuỗi trạng thái chuẩn: vào cảnh → khám phá từng object → hoàn thành hoặc xem trợ giúp mini-game nếu có → đoạn thoại chốt → mở Tiếp tục → cutscene → cảnh sau.

Các giá trị kind là inspect, dialogue, archive hoặc minigame. Với dialogue, text là phần giới thiệu thông tin khi chọn nhân vật; không tự biến câu diễn giải thành lời nói của nhân vật có thật; đoạn dialogue ba lượt ở scene là đoạn chốt riêng. Với archive, text là popup ngắn và nút Đọc thêm mở mục AR tương ứng. Với minigame, trước hết hiện text giới thiệu rồi mở hoạt động. Đánh dấu object chính sau khi đọc xong; điều kiện mini-game được lưu riêng.

Trạng thái lưu đề xuất: currentSceneId; seenObjectIds; minigameState theo game; closingDialogueSeen theo scene; cutsceneFrame theo cutscene; unlockedTimelineIds; unlockedArchiveIds; settings; personalClosingNote. Khi tải lại giữa popup, mở lại popup chưa đọc xong; không tự tính là đã khám phá. Khi xem lại scene, giữ tiến độ và vẫn cho đọc lại mọi nội dung.

Thẻ Timeline trong chuyển cảnh mở sau khi người chơi đi qua khung nhắc tới nó. Đặc biệt CS01 mở TL02; CS02 mở TL04 và TL05; CS06 mở TL10; CS07 mở TL12; CS09 mở TL15, TL16 và TL17. Bỏ qua toàn cutscene vẫn mở các thẻ tương ứng sau khi xác nhận bỏ qua; không khóa tư liệu vì người chơi dùng tùy chọn hỗ trợ.

## Tiêu chí nghiệm thu nội dung

- Đủ 10 cảnh, mỗi cảnh 5 object bắt buộc và 1 ẩn; ID không trùng.
- Mỗi object có một ý nghĩa cụ thể đối với sự kiện, được ghi trong trường meaning và bảng kịch bản; không dùng vật chỉ để tạo không khí.
- Popup dưới hoặc bằng 40 từ tách bằng khoảng trắng; trang Archive đảm nhiệm phần dài.
- Nguồn tư liệu truy ra được từ cảnh và Archive; mọi hội thoại hư cấu có nhãn rõ.
- Không tính vật ẩn vào điều kiện qua cảnh; không khóa tiến độ khi dùng trợ giúp mini-game.
- Mọi đường đi từ S01 tới S10 liên tục; sau CS10 mở màn kết.
- Các ngày Giơnevơ, Buôn Ma Thuột và Paris được ghi theo phân biệt đã nêu trong kịch bản.
- Đoạn tưởng niệm Đồng Lộc trong CS07 không phát âm thanh mừng hoàn thành hay thông báo thành tích.
- Không gán lời nói sáng tác cho nhân vật lịch sử có thật.

## Tiêu chí nghiệm thu hình và chơi thử

- Vật thể có điểm tựa, cùng phối cảnh và hướng sáng; viền không có halo.
- Không có kiến trúc, biểu tượng, đồ dùng hoặc bảng hiệu xuất hiện sai thời điểm.
- Chữ do engine render, đọc được ở mức thu nhỏ; bản đồ có chú giải và phạm vi rõ.
- Ba tầng chiều sâu rõ ràng; object ẩn nhìn thấy ít nhất một nửa, không nhỏ thành một pixel khó bấm.
- Hitbox nằm trong safe zone, không chồng nhau, khớp hình đã duyệt.
- Có thể hoàn thành cả ba mini-game chỉ bằng click; hỗ trợ không tạo ngõ cụt.
- Thử lưu và tải lại khi đang đọc popup, đang làm mini-game và đang xem cutscene.
- Thử cỡ chữ lớn, giảm âm thanh căng thẳng, bỏ qua cutscene và xem lại Archive.
- Kiểm tra người chơi hiểu được mối nối giữa hai cảnh, thay vì chỉ nhớ tên đồ vật.

Các kiểm tra dữ liệu tự động không thay thế nghiệm thu hình và chơi thử. Tọa độ trong gói cần được chỉnh theo asset thật; các prompt sau là brief tạo ảnh, chưa phải ảnh đã được duyệt.


## Brief và vị trí từng cảnh

### S01 Tuyên ngôn Độc lập tại Ba Đình

**Hình nhận diện:** Lễ đài, Chủ tịch Hồ Chí Minh và cờ đỏ sao vàng.

**Bố cục:** Lễ đài ở trung cảnh phải, đám đông và cờ ở trái. Chọn vùng giấy trên bục sẽ mở cận cảnh UI, không phóng to một tờ giấy khổng lồ trong không gian. Hình người thật dựa trên ảnh tư liệu, không tạo lời thoại cho Hồ Chí Minh.

**Ánh sáng:** Nắng chiều từ trái; đỏ cờ, kem giấy, xanh cây; ánh sáng sáng rõ, không tạo vẻ lễ hội hiện đại.

**Âm môi trường:** Tiếng người, vải cờ, bước chân; nhạc mộc nhẹ. Bản lời đọc Tuyên ngôn chỉ dùng bản ghi có nguồn và quyền sử dụng; bản dựng thử dùng người dẫn diễn giải.

| Object | Tâm hitbox nháp x và y | Điểm tựa và gợi ý |
| --- | --- | --- |
| S01_O1 · FG | 192, 497 | Cán cờ trong tay người dự lễ. Tìm cờ đỏ sao vàng ở phía gần. |
| S01_O2 · BG | 755, 259 | Đứng trên sàn lễ đài, sau bục. Tìm chủ tịch hồ chí minh trên lễ đài ở phía xa. |
| S01_O3 · BG | 896, 367 | Giấy đặt trên mặt bục; click mở cận cảnh. Tìm bản tuyên ngôn trên bục ở phía xa. |
| S01_O4 · MG | 461, 526 | Đứng trên mặt đất quảng trường. Tìm đoàn người dự lễ ở giữa cảnh. |
| S01_O5 · BG | 1088, 274 | Gắn trên giá cạnh bục, theo ảnh tham khảo. Tìm micro trên lễ đài ở phía xa. |
| S01_H1 · FG | 102, 331 | Giỏ đặt trên ghế, lộ kim chỉ và vải đỏ. Tìm giỏ kim chỉ may cờ ở phía gần. |

Hitbox nháp 104 × 76 px cho object chính, 58 × 46 px cho H1; cần khớp hình đã duyệt trước khi triển khai.

**Prompt master:** Hand-painted 2D historical point-and-click scene Ba Dinh Hanoi September 2 1945, independence platform midground right with historically referenced Ho Chi Minh figure behind lectern and period microphone, diverse civilians foreground left carrying red flag with yellow star, manuscript only visible through later UI closeup, sewing basket on grounded stool, warm daylight, consistent scale and shadows, no modern mausoleum, no readable text.

### S02 Toàn quốc kháng chiến

**Hình nhận diện:** Giường tủ thành chiến lũy, phố tắt điện và người tự vệ.

**Bố cục:** Một phố Hà Nội ban đêm; chiến lũy có nền đỡ rõ, gia đình tản cư ở một bên, người liên lạc đi giữa các nhà. Văn kiện Lời kêu gọi mở dưới dạng thẻ UI, không đặt bản in chưa phát hành vào cảnh.

**Ánh sáng:** Ánh chiều lạnh qua cửa trái; đèn dầu ấm trong nhà.

**Âm môi trường:** Tiếng gọi nhau, bước chân, vật dụng dịch chuyển; âm thanh chiến sự ở xa và có thể giảm.

| Object | Tâm hitbox nháp x và y | Điểm tựa và gợi ý |
| --- | --- | --- |
| S02_O1 · FG | 205, 518 | Đồ gỗ và bao đất đặt chồng vững trên mặt đường. Tìm chiến lũy bằng giường tủ ở phía gần. |
| S02_O2 · MG | 448, 382 | Đứng sau chiến lũy, chân trên đường. Tìm chiến sĩ tự vệ ở giữa cảnh. |
| S02_O3 · BG | 1062, 216 | Đèn treo trên cột và mặt tiền nhà. Tìm dãy đèn phố đã tắt ở phía xa. |
| S02_O4 · MG | 704, 302 | Đứng tại bậc cửa, tay giữ túi công văn. Tìm người liên lạc ở giữa cảnh. |
| S02_O5 · MG | 870, 454 | Đi trên lối bên đường với hành lý mang trên vai. Tìm gia đình tản cư ở giữa cảnh. |
| S02_H1 · BG | 115, 310 | Toa đặt trên đường ray, bị khuất một phần sau góc nhà. Tìm toa xe điện chắn phố ở phía xa. |

Hitbox nháp 104 × 76 px cho object chính, 58 × 46 px cho H1; cần khớp hình đã duyệt trước khi triển khai.

**Prompt master:** Hand-painted 2D Hanoi street barricade night December 19 1946, grounded furniture barricade built from cupboards and bed frames, self-defense fighters and courier, family evacuating along side passage, dark unlit streetlamps, partly occluded tram car in background, period wooden houses, restrained distant battle atmosphere, no modern vehicles, no text.

### S03 Chiến thắng Điện Biên Phủ

**Hình nhận diện:** Hầm Đờ Cát, cờ chiến thắng, giao thông hào và xe đạp thồ.

**Bố cục:** Bố cục minh họa cô đọng, có chú thích rõ; không nhận là toàn bộ vật đều nhìn thấy từ một vị trí thực địa. Hầm ở BG, hào ở MG, xe đạp thồ ở đường tiếp tế FG. Không trưng bày công trình bảo tàng hiện đại.

**Ánh sáng:** Ánh sớm mờ từ trái; sương xanh xám, mặt người và giấy ngả ấm.

**Âm môi trường:** Nan hoa khẽ rung, tiếng dây kéo, tiếng người nhận hàng, bước chân bùn.

| Object | Tâm hitbox nháp x và y | Điểm tựa và gợi ý |
| --- | --- | --- |
| S03_O1 · BG | 1075, 245 | Hầm thấp ăn vào địa hình, mái và bao đất có khối. Tìm hầm chỉ huy đờ cát ở phía xa. |
| S03_O2 · MG | 845, 194 | Cán cờ được người chiến sĩ giữ hoặc cắm chắc theo brief. Tìm lá cờ trên nóc hầm ở giữa cảnh. |
| S03_O3 · MG | 666, 346 | Hào đào liền mặt đất theo địa hình. Tìm hệ thống giao thông hào ở giữa cảnh. |
| S03_O4 · FG | 218, 504 | Hai bánh chạm đường; bao tải đặt trên khung. Tìm xe đạp thồ chở hàng ở phía gần. |
| S03_O5 · MG | 448, 360 | Đứng trong và cạnh hào, đúng tỷ lệ chiều sâu. Tìm nhóm chiến sĩ tại trận địa ở giữa cảnh. |
| S03_H1 · FG | 102, 317 | Lộ trong túi vải đặt cạnh xe. Tìm sổ tay dân công ở phía gần. |

Hitbox nháp 104 × 76 px cho object chính, 58 × 46 px cho H1; cần khớp hình đã duyệt trước khi triển khai.

**Prompt master:** Hand-painted 2D editorial historical panorama Dien Bien Phu May 7 1954, low De Castries command bunker background with victory flag, connected trenches midground, Vietnamese soldiers, supply carrying bicycle on foreground supply path with porter notebook partly visible, explicitly condensed campaign composition rather than geographic survey, natural daylight, all objects grounded, no modern museum, no text.

### S04 Hội nghị Giơnevơ

**Hình nhận diện:** Bàn hội nghị quốc tế, Phạm Văn Đồng và văn kiện Giơnevơ.

**Bố cục:** Phục dựng minh họa phòng hội nghị, văn kiện mở qua cận cảnh UI. Không vẽ mọi phái đoàn cùng ký Tuyên bố cuối cùng; không mô tả giới tuyến như biên giới quốc gia. Sơ đồ là lớp diễn giải mở từ bản đồ trên giá.

**Ánh sáng:** Ánh cửa sổ trái, trắng xám và xanh nhạt; ấm ở mặt giấy.

**Âm môi trường:** Tiếng giấy, bút máy đặt xuống, đồng hồ tường; âm nhạc thưa.

| Object | Tâm hitbox nháp x và y | Điểm tựa và gợi ý |
| --- | --- | --- |
| S04_O1 · FG | 205, 526 | Trong bìa đặt trên bàn hội nghị. Tìm văn kiện đình chỉ chiến sự ở phía gần. |
| S04_O2 · MG | 448, 353 | Ngồi tại bàn, phục trang theo ảnh. Tìm phạm văn đồng và đoàn việt nam ở giữa cảnh. |
| S04_O3 · BG | 1075, 223 | Bản đồ trên giá; mở UI có chú giải. Tìm sơ đồ giới tuyến quân sự ở phía xa. |
| S04_O4 · FG | 691, 526 | Tập giấy riêng trên đầu bàn bên kia. Tìm tuyên bố cuối cùng ngày 21/7 ở phía gần. |
| S04_O5 · MG | 883, 331 | Đặt trên các bàn, không thành menu lơ lửng. Tìm bảng tên các phái đoàn ở giữa cảnh. |
| S04_H1 · FG | 102, 331 | Thẻ chú giải UI mở từ trang tài liệu lộ dưới bìa. Tìm thẻ ghi mốc tổng tuyển cử ở phía gần. |

Hitbox nháp 104 × 76 px cho object chính, 58 × 46 px cho H1; cần khớp hình đã duyệt trước khi triển khai.

**Prompt master:** Hand-painted 2D Geneva July 1954 conference hall inspired by period reference photos, Pham Van Dong and Vietnamese delegation at table, separate armistice folder and final declaration folder, multiple delegation nameplates left blank, geographic easel map left blank for explanatory overlay, no universal signing of final declaration, no modern equipment, no readable text.

### S05 Mở đường Trường Sơn

**Hình nhận diện:** Đường rừng, người gùi hàng và tuyến nối Bắc Nam.

**Bố cục:** Cảnh giai đoạn mở tuyến ở Khe Hó trong năm 1959, không vẽ lễ thành lập tại Khe Hó ngày 19/5. Chỉ có gùi bộ và đường mòn; chưa đưa xe tải, đường nhựa, đường ống hay mạng binh trạm giai đoạn sau vào ảnh.

**Ánh sáng:** Ánh sớm xuyên tán cây từ trái; rừng xanh, đất sẫm và vải bạc.

**Âm môi trường:** Tiếng rừng, bước chân, dây gùi; không có tiếng động cơ.

| Object | Tâm hitbox nháp x và y | Điểm tựa và gợi ý |
| --- | --- | --- |
| S05_O1 · FG | 205, 518 | Đặt trên giá tre thấp, quai và kiện hàng có sức nặng. Tìm gùi hàng ở phía gần. |
| S05_O2 · MG | 448, 367 | Đứng trên đường mòn, giữ quai gùi. Tìm chiến sĩ giao liên ở giữa cảnh. |
| S05_O3 · FG | 691, 526 | Đặt trên phản gỗ, bao gói kín. Tìm kiện hàng quân sự ở phía gần. |
| S05_O4 · MG | 883, 302 | Giấy trên bảng tựa vách lán; mở sơ đồ UI. Tìm sơ đồ nối bắc nam ở giữa cảnh. |
| S05_O5 · BG | 1088, 209 | Đường rừng bám địa hình và mất dần sau tán cây. Tìm lối mòn từ khe hó ở phía xa. |
| S05_H1 · FG | 102, 331 | Lộ ở ngăn túi giao liên đặt trên ghế. Tìm bọc công văn ở phía gần. |

Hitbox nháp 104 × 76 px cho object chính, 58 × 46 px cho H1; cần khớp hình đã duyệt trước khi triển khai.

**Prompt master:** Hand-painted 2D Khe Ho forest path Vinh Linh in 1959 during initial Truong Son route development, military couriers carrying baskets and wrapped supplies by foot, parcel on low bamboo platform, simple schematic sheet at shelter, wrapped dispatch partly visible, coherent forest light, no trucks, no pipelines, no paved road, no readable text.

### S06 Đồng Khởi Bến Tre

**Hình nhận diện:** Trống mõ, đoàn người và phụ nữ nông thôn Bến Tre.

**Bố cục:** Đường làng dẫn ra khu trung tâm xã, trống và mõ có người giữ hoặc giá đỡ. Cổng trụ sở xã là kiến trúc minh họa; click mở thông tin về thay đổi quyền kiểm soát, không tái dựng một tòa nhà đã kiểm chứng.

**Ánh sáng:** Sáng dịu qua tán dừa từ phải; xanh lá, đất vàng và vải nâu.

**Âm môi trường:** Tiếng lá dừa, chèo khua xa, chuyện trò nhỏ, tiếng mõ ở xa như dấu hiệu bối cảnh.

| Object | Tâm hitbox nháp x và y | Điểm tựa và gợi ý |
| --- | --- | --- |
| S06_O1 · FG | 205, 511 | Trống trên giá gỗ; mõ tre do người cầm. Tìm trống và mõ tre ở phía gần. |
| S06_O2 · MG | 448, 382 | Đứng và bước trên mặt đường làng. Tìm đoàn phụ nữ trong phong trào ở giữa cảnh. |
| S06_O3 · BG | 1088, 216 | Đường liên tục; click mở sơ đồ ba địa danh. Tìm đường làng tới ba xã khởi đầu ở phía xa. |
| S06_O4 · BG | 819, 216 | Cổng gắn với tường và con đường. Tìm cổng trụ sở cấp xã ở phía xa. |
| S06_O5 · MG | 870, 410 | Đứng bên đường, trang bị thể hiện tiết chế. Tìm nhóm tự vệ và quần chúng ở giữa cảnh. |
| S06_H1 · FG | 102, 317 | Đặt trên ghế dưới mái hiên. Tìm loa tay ở phía gần. |

Hitbox nháp 104 × 76 px cho object chính, 58 × 46 px cho H1; cần khớp hình đã duyệt trước khi triển khai.

**Prompt master:** Hand-painted 2D Dong Khoi Ben Tre January 1960 rural village road, drum on wooden support and handheld bamboo signal block foreground, village women and civilian crowd midground with small self-defense group, road leading to village administrative entrance background, hand megaphone partly visible on stool, coconut palms, natural daylight, no modern monument, no text.

### S07 Tổng tiến công và nổi dậy Mậu Thân

**Hình nhận diện:** Căn nhà và hầm Biệt động Sài Gòn, chuẩn bị trong dịp Tết.

**Bố cục:** Minh họa cắt lớp căn nhà, không nhận là bản vẽ di tích. Phòng trên, cửa ra hẻm và phần hầm giữ quan hệ không gian rõ. Không vẽ Dinh Độc Lập nằm ngay ngoài cửa; không mô tả cách xây, giấu hoặc vận hành vũ khí.

**Ánh sáng:** Đèn trong phòng ấm, phần hầm tối hơn; cửa hẻm xanh xám.

**Âm môi trường:** Tiếng người nói thấp, tiếng phố Tết xa; không có nhạc chiến thắng trong lúc chuẩn bị.

| Object | Tâm hitbox nháp x và y | Điểm tựa và gợi ý |
| --- | --- | --- |
| S07_O1 · MG | 512, 396 | Nắp nằm trong nền, cắt lớp cho thấy quan hệ với hầm. Tìm cửa hầm dưới nền nhà ở giữa cảnh. |
| S07_O2 · FG | 218, 526 | Kiện đặt trên nền hầm và giá thấp. Tìm các kiện vũ khí trong hầm ở phía gần. |
| S07_O3 · MG | 806, 302 | Đứng trong phòng, đúng mặt sàn. Tìm nhóm chiến sĩ biệt động ở giữa cảnh. |
| S07_O4 · BG | 1088, 346 | Hai bánh trên hẻm; chỉ một phần xe nhìn qua cửa. Tìm xe tải nhỏ ngoài cửa ở phía xa. |
| S07_O5 · BG | 1075, 194 | Khung cửa gắn tường, hẻm lùi sâu. Tìm cửa ra hẻm sài gòn ở phía xa. |
| S07_H1 · FG | 102, 317 | Treo ở góc phòng; không mô phỏng ngày âm lịch chưa đối chiếu. Tìm tờ lịch tết mậu thân ở phía gần. |

Hitbox nháp 104 × 76 px cho object chính, 58 × 46 px cho H1; cần khớp hình đã duyệt trước khi triển khai.

**Prompt master:** Hand-painted 2D explanatory cutaway of a Saigon resistance house at 287/70 Phan Dinh Phung during Tet 1968, upper room and cellar aligned in perspective, hatch connected to floor, closed supply crates in cellar, small group of urban resistance fighters upstairs, partly visible small period truck through alley doorway, Tet calendar left blank, no palace outside door, no construction instructions, no readable text.

### S08 Hà Nội Điện Biên Phủ trên không

**Hình nhận diện:** Xác B52 ở hồ Hữu Tiệp và hầm phòng không.

**Bố cục:** Lấy xác B52 tại hồ Hữu Tiệp làm hình nhận diện. Không đưa lan can, bia di tích hoặc cảnh quan cải tạo hiện nay vào năm 1972. Hầm, loa và người trong cảnh là bố cục dàn dựng quanh khu dân cư, không xác nhận vị trí từng vật theo ảnh hồ.

**Ánh sáng:** Ánh đèn trong hầm ấm, sân đêm xanh sẫm; không dùng chớp nháy dồn dập.

**Âm môi trường:** Tiếng radio và trò chuyện thấp; còi báo động ngắn có thể giảm/tắt.

| Object | Tâm hitbox nháp x và y | Điểm tựa và gợi ý |
| --- | --- | --- |
| S08_O1 · BG | 1062, 245 | Khối xác nghiêng vào lòng hồ, tiếp xúc nước và bùn. Tìm mảnh xác b52 trên hồ ở phía xa. |
| S08_O2 · FG | 205, 518 | Bậc hầm liền nền, có mái che thấp. Tìm lối xuống hầm phòng không ở phía gần. |
| S08_O3 · MG | 819, 194 | Loa gắn trên cột theo hình thức thời kỳ. Tìm loa truyền tin khu dân cư ở giữa cảnh. |
| S08_O4 · MG | 474, 360 | Đứng trên lối cạnh hồ. Tìm chiến sĩ phòng không ở giữa cảnh. |
| S08_O5 · MG | 870, 432 | Ngồi và đứng bên bàn trực thấp. Tìm tổ dân phòng ở giữa cảnh. |
| S08_H1 · FG | 102, 317 | Trên bàn trực, lộ dưới bìa. Tìm sổ ghi nơi sơ tán ở phía gần. |

Hitbox nháp 104 × 76 px cho object chính, 58 × 46 px cho H1; cần khớp hình đã duyệt trước khi triển khai.

**Prompt master:** Hand-painted 2D Huu Tiep pond Ngoc Ha Hanoi late December 1972, B52 wreckage embedded in pond with realistic water contact, nearby illustrative residential air-raid shelter entrance, civil defense volunteers and composite air-defense serviceman, fixed period loudspeaker and message ledger on table, somber morning daylight, no modern memorial plaques or renovated railings, no text.

### S09 Ký Hiệp định Paris

**Hình nhận diện:** Nguyễn Thị Bình, bàn ký, văn kiện và bảng tên bốn bên.

**Bố cục:** Bố cục dựa trên ảnh lễ ký, không tự gán mọi vị trí ghế là chính xác. Nguyễn Thị Bình và các đại diện chỉ có thẻ giới thiệu; mọi lời giải thích dùng giọng người dẫn. Không vẽ Lê Đức Thọ ký chính thức ngày 27/1.

**Ánh sáng:** Nắng đông nhạt qua cửa trái; mặt bàn sáng, góc phòng xanh xám.

**Âm môi trường:** Tiếng giấy, máy ảnh và âm phòng hội nghị; lời dẫn diễn giải, không giả giọng nhân vật lịch sử.

| Object | Tâm hitbox nháp x và y | Điểm tựa và gợi ý |
| --- | --- | --- |
| S09_O1 · FG | 205, 526 | Trên bàn ký; click mở cận cảnh diễn giải. Tìm bản hiệp định paris ở phía gần. |
| S09_O2 · MG | 461, 310 | Ngồi sau bàn, theo ảnh tư liệu tham khảo. Tìm nguyễn thị bình tại bàn ký ở giữa cảnh. |
| S09_O3 · MG | 704, 403 | Các bảng nhỏ trên mặt bàn, mở UI phóng lớn. Tìm bảng tên bốn bên ở giữa cảnh. |
| S09_O4 · FG | 870, 526 | Nằm cạnh bìa giấy trên bàn. Tìm bút ký văn kiện ở phía gần. |
| S09_O5 · BG | 1088, 216 | Trên chân máy tại khu báo chí, không lơ lửng. Tìm máy ảnh và micro báo chí ở phía xa. |
| S09_H1 · FG | 102, 317 | Tập hồ sơ lộ ở bàn phụ, nhãn do engine render. Tìm hồ sơ đàm phán từ năm 1968 ở phía gần. |

Hitbox nháp 104 × 76 px cho object chính, 58 × 46 px cho H1; cần khớp hình đã duyệt trước khi triển khai.

**Prompt master:** Hand-painted 2D Paris Kleber conference signing ceremony January 27 1973 inspired by documentary reference, Nguyen Thi Binh seated at signing table, agreement folder and pen, four party nameplates blank for engine text, press camera and microphone on stands at side, negotiation archive folder partly visible on side table, no Le Duc Tho signing reenactment, no text.

### S10 Ngày 30 tháng 4 tại Dinh Độc Lập

**Hình nhận diện:** Xe tăng 390, cổng Dinh Độc Lập và lá cờ trên nóc Dinh.

**Bố cục:** Sân Dinh nhìn từ góc thấp có cổng và xe tăng, lá cờ trên nóc đủ rõ. Không cho nhìn xuyên vào mọi phòng trong Dinh. Radio trên bàn trực là đạo cụ minh họa để mở bản tin diễn giải; không nhận là máy đã thu bản ghi gốc.

**Ánh sáng:** Nắng chiều từ trái; bảng màu ấm sáng, xanh lá trở lại; cảm xúc nhẹ dần, không phủ giấy màu kiểu lễ hội.

**Âm môi trường:** Tiếng người trong sân, động cơ xa, bản tin diễn giải; nhạc chậm chỉ mở sau phần tư liệu.

| Object | Tâm hitbox nháp x và y | Điểm tựa và gợi ý |
| --- | --- | --- |
| S10_O1 · FG | 256, 497 | Xích xe tiếp xúc sân, có bóng và trọng lượng. Tìm xe tăng 390 ở phía gần. |
| S10_O2 · MG | 614, 374 | Cánh cổng đổ nối đúng bản lề và mặt sân. Tìm cổng dinh độc lập ở giữa cảnh. |
| S10_O3 · BG | 922, 166 | Cán cờ cố định trên nóc, đúng hướng gió. Tìm cờ trên nóc dinh ở phía xa. |
| S10_O4 · BG | 1088, 324 | Cửa sảnh là bộ phận tòa nhà, không lộ phòng không thể thấy. Tìm cửa sảnh dinh ở phía xa. |
| S10_O5 · FG | 819, 526 | Đặt trên bàn trực ngoài sân, đạo cụ dàn dựng. Tìm radio chuyển tin ở phía gần. |
| S10_H1 · MG | 128, 302 | Xích xe trên sân cạnh khu cổng phụ. Tìm xe tăng 843 ở giữa cảnh. |

Hitbox nháp 104 × 76 px cho object chính, 58 × 46 px cho H1; cần khớp hình đã duyệt trước khi triển khai.

**Prompt master:** Hand-painted 2D Independence Palace Saigon after 11:30 April 30 1975, grounded tank 390 in courtyard, collapsed main gate and palace architecture in coherent perspective, Liberation Front flag red top blue bottom yellow star on roof, tank 843 partly visible beside side-gate area, illustrative radio on low duty table, no modern skyline, no readable text.

