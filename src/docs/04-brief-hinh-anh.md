# Brief hình ảnh chi tiết cho 10 scene

## Quy tắc khóa bố cục khi tạo ảnh

Bản brief hình ảnh 2.1 khóa **một khoảnh khắc, một camera và một trục không gian** cho mỗi scene. Các lựa chọn góc máy và tọa độ là dàn dựng mỹ thuật; dữ kiện lịch sử vẫn theo nguồn của kịch bản.

Thứ tự ưu tiên: Một thời điểm duy nhất → Góc máy và trục không gian → Hướng đầu thân và hướng hành động → Vị trí cùng tỷ lệ các đối tượng → Ánh sáng và che khuất → Phong cách.

Mỗi lần sinh dùng quy chuẩn chung cùng đúng một scene. Không đưa mô tả mười scene trong một prompt. Prompt master là cảnh đầy đủ có người và object; prompt nền sạch phải dùng danh sách xóa lớp riêng, không dùng cùng một câu vừa yêu cầu có vừa yêu cầu không có nhân vật.

Ảnh tư liệu dùng để khóa kiến trúc, gương mặt, trang phục và hình dạng phương tiện. Khung máy, cách thu gọn không gian và vị trí đạo cụ là dàn dựng mỹ thuật, không phải tọa độ lịch sử được kiểm chứng.

Khung bao visualBoxPercent là vùng hình dự kiến, không phải hitbox. clickAnchorPercent là vị trí chọn đề xuất, phải nằm trong vùng tương tác nhìn thấy; object quá nhỏ mở bằng vùng đại diện được ghi rõ, không phóng to đạo cụ sai tỷ lệ.

Ảnh không chứa chữ, số hiệu, logo UI hoặc mũi tên chỉ hướng. Số 390, 843, bảng tên, lịch, bản đồ và nhãn văn kiện được engine đặt lên đúng mặt phẳng sau khi ảnh được duyệt.

Quy trình duyệt: Phác bố cục thô theo khung bao và hướng → Duyệt quan hệ không gian và thời điểm → Sinh ảnh master dựa trên bố cục đã duyệt → Kiểm tra bằng checklist của scene → Chốt mask và hitbox theo ảnh → Cắt sprite và inpaint phần thật sự cần tách.

Tọa độ trong bảng là phần trăm khung 1280 × 720, gốc trên trái. Vùng tương tác an toàn giữ 80 ≤ y ≤ 670. Khung bao mô tả phạm vi hình dự kiến; tâm click và hitbox phải chốt lại trên ảnh thật. Khi giấy, bút hoặc micro quá nhỏ, dùng vùng đại diện như mặt bục hoặc bìa giấy rồi mở cận cảnh UI, không phóng lớn đạo cụ sai tỷ lệ.

Ở S10, thứ tự chiều sâu bắt buộc là **camera ngoài đường → cổng → đuôi xe 390 → mũi xe 390 → sảnh Dinh**. Hướng thân xe từ dưới trái lên trên phải, xa camera. Ảnh master sau 11:30 có xe dừng và cờ đã treo; shot xe đang tiến qua cổng là trạng thái khác, chưa có cờ Mặt trận đã treo trên mái.


### S01 Tuyên ngôn Độc lập tại Ba Đình

**Thời điểm và trạng thái:** Chiều 2/9/1945, khoảnh khắc công bố Tuyên ngôn; buổi lễ còn đang diễn ra.

**Camera:** Camera ở rìa phía sau bên trái đám đông, cao khoảng 1,7 m, nhìn chéo qua người dự lễ về mặt trước lễ đài ở nửa phải ảnh. Khung rộng tương đương 35 mm, đường chân trời khoảng y=42%. Mặt bục hướng ra đám đông và về phía camera.

**Bố cục và quan hệ không gian:** Tiền cảnh từ x=0–35% là cờ và vai người dự lễ; trung cảnh x=22–57% là người đứng hướng về lễ đài; hậu cảnh x=58–95%, y=22–58% là toàn bộ lễ đài. Trên cùng một sân khấu, người đọc, mặt bục, bản giấy và micro phải cùng tỷ lệ; không tách thành ba công trình.

**Hướng người và phương tiện:** Người dự lễ quay lưng hoặc nghiêng ba phần tư về phía camera, mặt nhìn lên lễ đài ở trên phải. Hồ Chí Minh đứng đối diện đám đông, nhìn hơi xuống bản giấy rồi về phía người nghe. Cờ bay cùng một hướng gió từ trái sang phải. Người đọc không quay lưng về phía khán giả.

**Ánh sáng:** Ánh chiều dịu từ trên trái. Mặt trái cột, vai người và vải cờ sáng hơn; bóng đổ xuống đất theo hướng phải và xa nguồn. Nền đủ sáng để nhận hình, không dùng đèn sân khấu hoặc ánh đèn LED.

#### Vị trí từng object

| Object | Khung hình dự kiến x y rộng cao và tâm click | Hướng và điểm tựa |
| --- | --- | --- |
| **S01_O1 Cờ đỏ sao vàng** · FG | Khung 7, 46, 18, 35%; tâm 16, 66%. | Mặt cờ nghiêng về phía người xem, cán do người giữ. Tay nắm cán, chân người trên nền quảng trường. Che khuất: Vải cờ không che mặt người đọc hoặc cả lễ đài. |
| **S01_O2 Chủ tịch Hồ Chí Minh trên lễ đài** · BG | Khung 65, 26, 11, 24%; tâm 70, 35%. | Thân hướng ra đám đông, mặt trước hoặc ba phần tư hướng camera. Chân trên sàn lễ đài, phía sau bục. Che khuất: Phần mặt và vai hiện rõ; dáng lấy từ ảnh tham khảo. |
| **S01_O3 Bản Tuyên ngôn trên bục** · BG | Khung 67, 46, 13, 9%; tâm 73, 50%. | Trang giấy nằm ngang trên mặt bục, hướng người đọc. Giấy chạm mặt bục; click vùng bục mở cận cảnh UI. Che khuất: Không vẽ văn bản lớn bay giữa không trung. |
| **S01_O4 Đoàn người dự lễ** · MG | Khung 27, 49, 28, 35%; tâm 39, 65%. | Nhiều tư thế đứng tự nhiên, phần lớn nhìn về trên phải. Chân trên đất, người xa nhỏ hơn. Che khuất: Đám đông che chân nhau có mức độ, chừa đường nhìn tới lễ đài. |
| **S01_O5 Micro trên lễ đài** · BG | Khung 81, 32, 9, 18%; tâm 85, 41%. | Đầu micro hướng vào miệng người đọc, không hướng ra sau. Giá micro neo trên bục hoặc sàn theo ảnh. Che khuất: Không che kín mặt; chiều cao xấp xỉ miệng người nói. |
| **S01_H1 Giỏ kim chỉ may cờ** · FG | Khung 3, 57, 8, 15%; tâm 7, 64%. | Giỏ nghiêng đủ nhìn được vải, chỉ. Nằm trên ghế nhỏ cùng lớp tiền cảnh. Che khuất: Ẩn nhẹ sau mép vải, nhìn thấy hơn nửa giỏ. |

#### Prompt master dùng trực tiếp

```text
Ảnh master 16:9, minh họa 2D vẽ tay bán hiện thực, mắt ngang hoặc hơi cao theo từng brief, phối cảnh phối hợp thống nhất; nhân vật có trọng lượng; đạo cụ gắn vào bề mặt; chữ đặt sau bằng engine.

Create one 16:9 hand-painted 2D historical game master scene of the September 2, 1945 independence gathering at Ba Dinh. Camera stands behind the left edge of the crowd at adult eye height, looking diagonally toward the FRONT of the independence platform in the upper-right half of the frame. Foreground civilians and a held red flag occupy the lower-left. Midground spectators face away from the camera toward the platform. Ho Chi Minh stands behind a lectern on that platform, his front facing the audience and partly toward camera. The manuscript rests flat on the lectern; it is small at this distance and opens as a later UI close-up. A period microphone on a physically supported stand points toward the speaker's mouth. Keep all platform elements in one coherent perspective. A small sewing basket rests on a low foreground stool. Soft afternoon light comes from upper left, shadows fall right. Keep the head of the speaker, the flag and the lectern distinguishable. Refer to historical photographs for architecture and clothing. No modern mausoleum, no giant floating document, no readable text, no UI, no arrows.
```

#### Những lỗi phải loại

- Người đọc quay lưng với đám đông
- Lễ đài, bục và micro không cùng phối cảnh
- Bản Tuyên ngôn to bằng người hoặc bay trên trời
- Lăng hoặc công trình quảng trường hiện đại
- Đồng phục hiện đại lặp lại cho toàn bộ đám đông

#### Checklist duyệt ảnh

- [ ] Nhìn vào ảnh thấy đám đông đang nghe người trên lễ đài.
- [ ] Giấy, người đọc và micro thuộc cùng một bục.
- [ ] Cờ không che điểm nhận diện nhân vật và sự kiện.


### S02 Toàn quốc kháng chiến

**Thời điểm và trạng thái:** Đêm 19/12/1946, sau khi phố đã tắt điện; một khoảnh khắc chuẩn bị và giữ chiến lũy.

**Camera:** Camera ở sau chiến lũy, thấp ngang ngực khoảng 1,5 m, nhìn dọc con phố từ dưới ảnh lên điểm tụ x=62%, y=36%. Góc rộng vừa, không fisheye. Người xem đứng cùng phía với tự vệ, không đứng ở phía đối diện nhìn vào họ.

**Bố cục và quan hệ không gian:** Chiến lũy nằm chéo tiền cảnh từ x=10%, y=77% tới x=60%, y=59%. Phố tiếp tục về BG qua phần khe trên chiến lũy. Một lối bên phải được chừa từ x=70%,y=54% về x=95%,y=85% cho người tản cư. Toa xe điện xa bên trái; nhà hai bên giữ cùng điểm tụ.

**Hướng người và phương tiện:** Chiến sĩ ở sau vật chắn, đầu và thân nhìn dọc phố ra xa camera. Gia đình tản cư đi trong lối bên phải từ trung cảnh về gần camera và ra mép dưới phải; họ rời vùng giao tranh chứ không đi thẳng vào chiến lũy. Người liên lạc đứng sát cửa một ngôi nhà, không chạy xuyên qua đống bàn tủ.

**Ánh sáng:** Ban đêm thực sự: ánh trời xanh xám rất yếu, vài nguồn đèn dầu được che trong hiên. Đèn điện trên phố đều tắt; không có nắng chiều, ánh bình minh hoặc đèn đường đang sáng. Chọn đèn dầu hiên trái làm nguồn ấm chính; không dùng lửa nổ làm nguồn sáng toàn cảnh.

#### Vị trí từng object

| Object | Khung hình dự kiến x y rộng cao và tâm click | Hướng và điểm tựa |
| --- | --- | --- |
| **S02_O1 Chiến lũy bằng giường tủ** · FG | Khung 10, 57, 50, 28%; tâm 30, 71%. | Mặt dài của đồ gỗ nằm ngang hoặc chéo chắn đường, có khe nhìn phía trên. Chân và cạnh tủ, giường tiếp xúc mặt đường và bao đất; không nổi. Che khuất: Chiến lũy che phần chân tự vệ, không che đầu họ. |
| **S02_O2 Chiến sĩ tự vệ** · MG | Khung 38, 38, 14, 27%; tâm 44, 51%. | Lưng hoặc ba phần tư lưng hướng người xem, nhìn theo phố ra xa. Đứng sau vật chắn trên cùng mặt đường. Che khuất: Thấy đầu, vai, tay và đủ thân để hiểu tư thế giữ vị trí. |
| **S02_O3 Dãy đèn phố đã tắt** · BG | Khung 71, 17, 20, 24%; tâm 82, 29%. | Dãy đèn nhỏ dần theo đường phố. Cột và dây gắn vào nhà; bóng đèn tối. Che khuất: Không để khói che hết dãy đèn. |
| **S02_O4 Người liên lạc** · MG | Khung 54, 39, 12, 24%; tâm 60, 49%. | Người liên lạc nghiêng về cửa nhà bên trái, nhìn về người nhận tin. Chân trên bậc và đường, túi công văn tựa hông. Che khuất: Tách rõ khỏi chiến sĩ để hai hitbox không chồng. |
| **S02_O5 Gia đình tản cư** · MG | Khung 73, 48, 22, 36%; tâm 84, 65%. | Tiến về gần và xuống phải, theo lối rời phố. Người lớn giữ hành lý, trẻ đi cùng; chân cùng mặt đường. Che khuất: Không đặt gia đình ở sau nòng súng hoặc trong đường giao tranh chính. |
| **S02_H1 Toa xe điện chắn phố** · BG | Khung 3, 30, 19, 23%; tâm 12, 42%. | Toa xe nằm ngang tương đối so với con phố, nhận ra hình toa. Trên ray và mặt đường, không đứng nghiêng vô lý. Che khuất: Bị góc nhà che khoảng một phần ba, vẫn thấy bánh và thân. |

#### Prompt master dùng trực tiếp

```text
Ảnh master 16:9, minh họa 2D vẽ tay bán hiện thực, mắt ngang hoặc hơi cao theo từng brief, phối cảnh phối hợp thống nhất; nhân vật có trọng lượng; đạo cụ gắn vào bề mặt; chữ đặt sau bằng engine.

Single 16:9 hand-painted historical game scene, Hanoi on the NIGHT of December 19, 1946 after the electric streetlights have gone out. The camera is on the DEFENDERS' SIDE behind a furniture barricade, looking away down the street toward a vanishing point at 62 percent width and 36 percent height. The barricade runs diagonally across the lower-left and center foreground; bed frames and cupboards rest heavily on pavement and earth sacks. Self-defense fighters stand BEHIND it, their backs or rear three-quarter profiles toward the viewer and their faces looking down the distant street. Leave a clear side passage on the RIGHT. A family carrying bundles walks along that passage from middle distance TOWARD the near lower-right exit, away from the fighting area. A courier stands at a doorway between the barricade and side passage. A partly obscured period tram sits on rails far left. Weak cool night ambience and a shielded oil lamp in the left porch are the only light sources; all electric streetlights are dark. Coherent street perspective and natural contact shadows. No sunset, no daytime, no lit electric lamps, no floating furniture, no modern vehicles, no UI or text.
```

#### Những lỗi phải loại

- Nắng chiều trong cảnh đêm
- Đèn đường điện đang bật
- Camera ở trước chiến lũy khiến tự vệ như đang tấn công người xem
- Gia đình đi vào vùng giao tranh
- Bàn tủ bay hoặc xếp thẳng đứng không có điểm tựa
- Xe điện hiện đại

#### Checklist duyệt ảnh

- [ ] Nguồn sáng khớp thời điểm đêm và phố tắt điện.
- [ ] Người giữ vị trí và gia đình tản cư có hai hướng khác nhau, đều hiểu được.
- [ ] Chiến lũy thực sự chắn con phố nhưng vẫn có lối bên phải.


### S03 Chiến thắng Điện Biên Phủ

**Thời điểm và trạng thái:** Cuối chiều 7/5/1954, hình minh họa cô đọng thời khắc chiến thắng tại Điện Biên Phủ.

**Camera:** Camera hơi cao khoảng 2 m ở mép một tuyến tiếp tế và hào, nhìn chéo về hầm chỉ huy phía trên phải. Góc rộng vừa 35 mm. Đây là bố cục diễn giải chiến dịch, không phải bản ghi địa hình từ một vị trí thật.

**Bố cục và quan hệ không gian:** Xe thồ FG ở dưới trái; nhóm chiến sĩ MG ở giữa trái; giao thông hào nối từ giữa dưới tới BG phải. Hầm chiếm x=62–93%, y=38–61%; cột cờ mọc ngay từ phần mái trong cùng vùng x=77–82%, không đặt cờ ở khoảng trời xa hầm.

**Hướng người và phương tiện:** Xe thồ đã dừng cạnh tuyến tiếp tế, bánh trước hướng lên phải theo đường; người đứng cạnh giữ tay lái. Nhóm chiến sĩ bước từ tuyến hào gần vào phía hầm xa. Cờ cùng hướng gió với bụi và vải; không có đội hình đang rút khỏi hầm về phía camera.

**Ánh sáng:** Nắng cuối chiều dịu từ trên phải, mặt đất và mái hầm ấm, phần sâu trong hào tối. Bóng kéo nhẹ xuống trái. Không dùng bình minh hoặc sương sớm làm mất thời điểm cuối chiều.

#### Vị trí từng object

| Object | Khung hình dự kiến x y rộng cao và tâm click | Hướng và điểm tựa |
| --- | --- | --- |
| **S03_O1 Hầm chỉ huy Đờ Cát** · BG | Khung 62, 38, 31, 23%; tâm 80, 51%. | Cửa hầm nhìn được theo góc ba phần tư; hầm thấp ăn vào đất. Mái và bao đất nối với địa hình. Che khuất: Thấy rõ mép mái, cửa và phần đất chung quanh. |
| **S03_O2 Lá cờ trên nóc hầm** · BG | Khung 75, 18, 10, 23%; tâm 80, 29%. | Cán xuống tới đúng mái hầm; vải bay sang trái. Người giữ hoặc chân cán nằm trực tiếp trên mái; chọn một cách trong ảnh. Che khuất: Không cắt rời cột khỏi mái và không che hầm. |
| **S03_O3 Hệ thống giao thông hào** · MG | Khung 41, 42, 19, 32%; tâm 53, 58%. | Hào uốn và lùi theo chiều sâu về khu hầm. Vách hào là đất, không là các đường vẽ nổi trên mặt. Che khuất: Vài đoạn khuất hợp lý nhưng vẫn đọc được tính liên tục. |
| **S03_O4 Xe đạp thồ chở hàng** · FG | Khung 9, 58, 28, 27%; tâm 23, 72%. | Xe nhìn ngang ba phần tư; bánh trước phía trên phải. Bánh chạm đường, bao trên khung, có người giữ. Che khuất: Không đặt cả xe chắn kín tuyến hào. |
| **S03_O5 Nhóm chiến sĩ tại trận địa** · MG | Khung 27, 35, 15, 27%; tâm 35, 48%. | Thân người nhìn về hầm trên phải; góc lưng hoặc nghiêng. Chân ở đáy hoặc mép hào; không đi xuyên vách đất. Che khuất: Thấy đủ vai, đầu và tư thế di chuyển. |
| **S03_H1 Sổ tay dân công** · FG | Khung 8, 47, 9, 12%; tâm 12, 53%. | Sổ lộ trong túi treo trên xe cùng lớp tiền cảnh. Túi buộc vào xe, sổ tựa vào miệng túi. Che khuất: Lộ hơn nửa cuốn sổ; không xuất hiện thành bảng lớn. |

#### Prompt master dùng trực tiếp

```text
Ảnh master 16:9, minh họa 2D vẽ tay bán hiện thực, mắt ngang hoặc hơi cao theo từng brief, phối cảnh phối hợp thống nhất; nhân vật có trọng lượng; đạo cụ gắn vào bề mặt; chữ đặt sau bằng engine.

Single 16:9 hand-painted historical narrative panorama of Dien Bien Phu, LATE AFTERNOON May 7, 1954. Use a slightly elevated camera at the edge of a supply path and trench, looking diagonally toward the low De Castries command bunker in the upper-right background. This is an explicitly condensed campaign illustration, not a literal site survey. The bunker occupies the upper-right ground, embedded in earth with a low roof. A victory flag is DIRECTLY on that bunker roof: the bottom of its pole visibly meets the roof, with a soldier holding it or a firmly planted support. Never detach the flag into empty sky. Midground connected earth trenches lead from lower center TOWARD the bunker; soldiers face and move deeper toward it, seen partly from behind. A supply bicycle has STOPPED in the lower-left foreground on a separate path, its front wheel pointing diagonally inward to the right, sacks supported by its frame and a porter steadying the handlebar. A notebook protrudes from the bicycle's cloth bag. Warm late-afternoon light from upper right casts shadows down-left. No dawn mist, no modern museum structures, no floating flag, no readable text or UI.
```

#### Những lỗi phải loại

- Cờ cách hầm một khoảng trống không có cán nối
- Hầm nổi như một tòa nhà nhiều tầng
- Xe thồ phóng to bằng hầm ở xa
- Bình minh, sương sáng
- Chiến sĩ đi khỏi khu hầm thành đoàn rút lui
- Biển bảo tàng, lan can di tích hiện nay

#### Checklist duyệt ảnh

- [ ] Chân cán cờ và hầm cùng một vị trí, cùng lớp sâu.
- [ ] Trục tiếp cận dẫn tới hầm, không dẫn ra khỏi sự kiện.
- [ ] Xe thồ có điểm tựa và tuyến riêng, không được vẽ đang lao vào hầm.


### S04 Hội nghị Giơnevơ

**Thời điểm và trạng thái:** Cuối Hội nghị Giơnevơ tháng 7/1954, khung thảo luận và đọc văn kiện; không chọn cảnh tất cả cùng ký.

**Camera:** Camera ở đầu gần của phòng, cách bàn khoảng 2 m, cao 1,6 m, nhìn chéo dọc chiều dài bàn về phía cuối phòng. Mặt bàn là một mặt phẳng phối cảnh liên tục từ cạnh dưới lên giữa ảnh; không dùng góc nhìn trần nhà.

**Bố cục và quan hệ không gian:** Hai bộ văn kiện ở hai vị trí riêng trên phần gần của cùng một bàn. Đoàn Việt Nam ở MG trái, bảng tên các đoàn lùi dần sang phải. Sơ đồ địa lý trên giá ở cuối phải. Sơ đồ không phải bản đồ treo lơ lửng giữa bàn.

**Hướng người và phương tiện:** Người đại diện ngồi hướng vào lòng bàn và các phái đoàn đối diện. Có người đọc tài liệu hoặc lắng nghe; không đồng loạt cầm bút ký. Phạm Văn Đồng không quay lưng về bàn. Văn kiện là đạo cụ giấy nhỏ, cận cảnh nội dung chỉ có ở UI.

**Ánh sáng:** Ánh ban ngày tán qua cửa bên trái; giấy và mặt bàn sáng, vùng dưới bàn tối hơn. Ánh đèn phòng bổ trợ nhẹ cùng nhiệt độ ấm; không ghép phòng lạnh với mặt người sáng chói từ nguồn khác.

#### Vị trí từng object

| Object | Khung hình dự kiến x y rộng cao và tâm click | Hướng và điểm tựa |
| --- | --- | --- |
| **S04_O1 Văn kiện đình chỉ chiến sự** · FG | Khung 12, 64, 22, 16%; tâm 23, 72%. | Bìa nằm dọc trục nhìn của người ngồi gần. Giấy nằm trên bàn gỗ, có mép và bóng mỏng. Che khuất: Không bị tay hoặc cốc che hết. |
| **S04_O2 Phạm Văn Đồng và đoàn Việt Nam** · MG | Khung 28, 31, 17, 28%; tâm 36, 43%. | Ngồi nghiêng vào bàn, mặt nhìn chếch phải tới đoàn đối diện. Thân ngồi ghế, khuỷu tay có thể trên bàn. Che khuất: Mặt và vai rõ; không dùng chân dung rời treo trong không gian. |
| **S04_O3 Sơ đồ giới tuyến quân sự** · BG | Khung 76, 19, 18, 29%; tâm 85, 33%. | Mặt giá xoay nhẹ về camera, sơ đồ đọc rõ qua UI. Chân giá chạm sàn, bảng kê trên giá. Che khuất: Tách khỏi đầu phái đoàn, không cắt qua người. |
| **S04_O4 Tuyên bố cuối cùng ngày 21/7** · FG | Khung 47, 64, 20, 16%; tâm 57, 72%. | Tập văn kiện thứ hai tách bằng khoảng bàn trống. Nằm phẳng trên cùng mặt bàn. Che khuất: Không vẽ các chữ ký hàng loạt để tránh nhận sai tính chất văn bản. |
| **S04_O5 Bảng tên các phái đoàn** · MG | Khung 59, 38, 16, 15%; tâm 67, 46%. | Bảng tên đặt theo mép bàn và hướng ghế ngồi. Đế bảng nằm thật trên bàn, chữ thêm bằng engine. Che khuất: Không xếp toàn bộ bảng thẳng hàng như menu UI. |
| **S04_H1 Thẻ ghi mốc tổng tuyển cử** · FG | Khung 7, 48, 9, 11%; tâm 11, 53%. | Một góc trang ghi chú lộ bên bìa trên bàn phụ gần camera. Trang nằm dưới bìa giấy, không là thẻ 3D bay. Che khuất: Nhìn rõ hơn nửa vùng dùng để click; cận cảnh giải thích ở UI. |

#### Prompt master dùng trực tiếp

```text
Ảnh master 16:9, minh họa 2D vẽ tay bán hiện thực, mắt ngang hoặc hơi cao theo từng brief, phối cảnh phối hợp thống nhất; nhân vật có trọng lượng; đạo cụ gắn vào bề mặt; chữ đặt sau bằng engine.

One 16:9 hand-painted historical game scene in a Geneva conference room, July 1954, during discussion and document review near the end of the conference. Camera is at the near end of the room at seated-to-standing eye level, looking diagonally along ONE continuous long conference table. The near tabletop extends from the bottom foreground into the middle of the room. Two separate modest paper folders lie flat on the near table, one lower-left and one lower-center, with a clear gap between them. Pham Van Dong and the Vietnamese delegation sit in the middle-left, bodies facing inward toward the table and attention directed toward opposite delegates. Use historical references for appearance; no fabricated portrait claims. Other delegation nameplates sit on the receding table edges with their bases touching the wood. A small geographic schematic stands on a real easel in the far-right background. Participants read and listen; do NOT show all delegations signing the final declaration together. Diffuse window light enters from left. Keep all paper and people at correct scale. Papers, map and nameplates have no readable text; engine overlays and UI closeups will provide it. No floating folders, no modern screens, no collage of incompatible camera angles.
```

#### Những lỗi phải loại

- Tất cả đại biểu cùng ký Tuyên bố cuối cùng
- Bảng tên lơ lửng giữa bàn
- Giấy dựng đứng như màn hình máy tính
- Bản đồ chia thành hai quốc gia được tô như biên giới vĩnh viễn
- Phạm Văn Đồng quay lưng về cuộc họp
- Ghép nhiều góc máy trong một ảnh phòng

#### Checklist duyệt ảnh

- [ ] Hai bộ văn kiện có chỗ riêng và cùng mặt bàn.
- [ ] Tư thế mọi người cho thấy đang tham dự cuộc họp, không diễn một lễ ký tập thể sai.
- [ ] Giá sơ đồ và bảng tên có điểm tựa.


### S05 Mở đường Trường Sơn

**Thời điểm và trạng thái:** Giai đoạn mở tuyến Trường Sơn năm 1959 tại Khe Hó, khoảnh khắc nhận gùi trước một chặng đi bộ.

**Camera:** Camera ở bên rìa đường và phía sau một phần nhóm giao liên, cao 1,6 m, nhìn theo đường mòn từ dưới trái tới trên phải. Điểm tụ khoảng x=80%,y=36%; rừng bao quanh nhưng không kín hết hướng ra của con đường.

**Bố cục và quan hệ không gian:** Khoảng nghỉ nhỏ FG có gùi và kiện hàng trên một phản tre duy nhất; người giao liên MG đứng cạnh đầu đường. Đường mòn rộng vừa một hoặc hai người đi, lùi vào BG phải. Sơ đồ treo trong mái lán MG phải, không treo giữa lối đi.

**Hướng người và phương tiện:** Nhóm chuẩn bị quay thân hướng vào đường mòn phía trên phải, không đi từ rừng trở ra trước camera. Người gần có thể nghiêng nửa người để nhận gùi; người xa đã quay lưng đi vào chiều sâu. Gùi bám lưng qua quai, kiện trên phản còn đang chờ bàn giao.

**Ánh sáng:** Ánh buổi sáng dịu lọt từ trên trái qua tán cây; vùng hở trên đường sáng hơn hai bên rừng. Bóng trên đất cùng hướng xuống phải, không đặt đèn pha hoặc khói động cơ.

#### Vị trí từng object

| Object | Khung hình dự kiến x y rộng cao và tâm click | Hướng và điểm tựa |
| --- | --- | --- |
| **S05_O1 Gùi hàng** · FG | Khung 9, 56, 22, 27%; tâm 20, 70%. | Gùi dựng trên phản, thấy miệng và hai quai. Đáy gùi trên mặt phản; phản có chân trên đất. Che khuất: Không bị kiện hàng khác che hơn nửa. |
| **S05_O2 Chiến sĩ giao liên** · MG | Khung 32, 31, 14, 34%; tâm 39, 49%. | Thân ba phần tư lưng, hướng vào đường rừng trên phải. Chân trên đường, gùi ôm vào lưng. Che khuất: Không trùng silhouette với cây hoặc người khác. |
| **S05_O3 Kiện hàng quân sự** · FG | Khung 47, 58, 20, 23%; tâm 57, 70%. | Kiện nằm theo chiều dài phản tre, bao gói kín. Trọng lượng ép lên mặt phản, quai và dây không xuyên vật. Che khuất: Để rõ một mặt kiện phục vụ hotspot. |
| **S05_O4 Sơ đồ nối Bắc Nam** · MG | Khung 65, 30, 15, 20%; tâm 72, 41%. | Tấm giấy nhỏ kê trên bảng dưới mái lán, quay về người nhận hàng. Bảng tựa cột; giấy kẹp vào bảng. Che khuất: Không che đường nhìn vào lối mòn. |
| **S05_O5 Lối mòn từ Khe Hó** · BG | Khung 77, 25, 17, 26%; tâm 85, 37%. | Đường mòn tiếp nối thật từ người giao liên tới rừng xa. Lối đất bám sườn và đi qua khoảng trống giữa cây. Che khuất: Tán cây che một phần nhưng còn thấy hướng đi. |
| **S05_H1 Bọc công văn** · FG | Khung 5, 45, 9, 12%; tâm 9, 51%. | Bọc giấy lộ trong túi giao liên đặt gần phản. Túi tựa chân phản; giấy không nổi. Che khuất: Lộ hơn nửa bọc, không đặt chữ lớn lên bìa. |

#### Prompt master dùng trực tiếp

```text
Ảnh master 16:9, minh họa 2D vẽ tay bán hiện thực, mắt ngang hoặc hơi cao theo từng brief, phối cảnh phối hợp thống nhất; nhân vật có trọng lượng; đạo cụ gắn vào bề mặt; chữ đặt sau bằng engine.

Single 16:9 hand-painted 2D historical game scene at the initial Khe Ho Truong Son route in 1959, a moment of taking up loads BEFORE a walking stage. Eye-level camera stands at the side and slightly behind the couriers, looking along a narrow dirt footpath from lower-left foreground into upper-right forest. A small rest clearing contains ONE grounded bamboo platform with an upright carrying basket on its left and a wrapped supply parcel on its right. A courier in the middle-left turns in rear three-quarter view toward the upper-right trail, his load secured closely to his back by visible straps. Farther couriers already face away into the depth of the forest, not toward the camera. A small paper schematic is clipped to a board supported by a shelter post mid-right, off the walking path. A wrapped dispatch protrudes from a cloth bag leaning against the platform. Filtered morning light comes from upper left; contact shadows ground feet, platform and cargo. Make the trail visibly continuous between people and background. No trucks, no paved road, no fuel pipeline, no concrete modern station, no floating backpack, no readable text, no arrows or UI.
```

#### Những lỗi phải loại

- Xe tải trong cảnh mở tuyến 1959
- Đường nhựa, đường ống xăng dầu hoặc binh trạm bê tông giai đoạn sau
- Gùi bay sau lưng không có quai
- Nhân vật đi ra khỏi rừng trong khi cảnh đang kể chuẩn bị chi viện vào tuyến
- Đường cụt vào thân cây
- Bản đồ tác chiến chi tiết dựng như màn hình điện tử

#### Checklist duyệt ảnh

- [ ] Một đường mòn nối thông từ nhóm người gần tới BG.
- [ ] Hướng người đi phù hợp hướng vào tuyến.
- [ ] Vật mang trên lưng, hàng chờ và đồ kê trên phản có trạng thái rõ ràng.


### S06 Đồng Khởi Bến Tre

**Thời điểm và trạng thái:** Buổi tập hợp trong những ngày đầu Đồng Khởi tháng 1/1960; đoàn người đang hướng từ xóm ra trung tâm xã.

**Camera:** Camera ở lề đường phía sau bên trái đoàn người, cao 1,6 m. Nhìn theo đường làng từ dưới trái lên trên phải; điểm tụ khoảng x=76%,y=38%. Góc ba phần tư từ sau, không nhìn đối diện đoàn như ảnh chụp tập thể.

**Bố cục và quan hệ không gian:** Trống và mõ đặt ở FG trái; phụ nữ và quần chúng thành đoàn không đều MG giữa. Cổng trụ sở xã ở BG phải; con đường nối thật từ người đi tới cổng. Ba địa danh mở trong UI, không vẽ ba xã thành ba cổng đứng sát nhau trong cùng ảnh.

**Hướng người và phương tiện:** Đoàn người quay thân và bước về trên phải, hướng khu trung tâm xã. Một vài người ở lề nghiêng nói chuyện nhưng hướng chung thống nhất. Nhóm tự vệ bên phải đi cùng chiều hoặc đứng hỗ trợ bên lề. Người đánh trống không vác chiếc trống lớn không có quai; nếu trống trên giá thì người đứng bên đánh.

**Ánh sáng:** Nắng sáng dịu lọt qua tán dừa từ trên phải; bóng người đổ xuống trái. Không khí có sức tập hợp nhưng không phủ pháo giấy, băng rôn hiện đại hoặc ánh đèn sân khấu.

#### Vị trí từng object

| Object | Khung hình dự kiến x y rộng cao và tâm click | Hướng và điểm tựa |
| --- | --- | --- |
| **S06_O1 Trống và mõ tre** · FG | Khung 8, 57, 21, 26%; tâm 19, 70%. | Mặt trống hướng nghiêng về người đánh bên lề đường. Trống trên hai chân giá; mõ do một người giữ. Che khuất: Để lộ mặt trống và tay người, không bị đám đông phủ kín. |
| **S06_O2 Đoàn phụ nữ trong phong trào** · MG | Khung 30, 38, 25, 35%; tâm 42, 55%. | Đoàn phụ nữ nhìn về cổng xã trên phải, thấy lưng và mặt nghiêng. Chân có bước đi trên đất, người đứng khác tư thế. Che khuất: Nhóm có độ sâu, không nhân bản một sprite. |
| **S06_O3 Đường làng tới ba xã khởi đầu** · BG | Khung 77, 32, 17, 20%; tâm 86, 42%. | Đoạn đường phía xa mở tiếp sau đoàn, click mở sơ đồ địa danh. Đường bám địa hình, không thành bảng giữa trời. Che khuất: Vẫn thấy đích và lối tiếp nối qua vai người. |
| **S06_O4 Cổng trụ sở cấp xã** · BG | Khung 62, 24, 16, 24%; tâm 70, 35%. | Mặt cổng hướng về đường đoàn đang đi tới. Hai trụ gắn đất và tường thấp, kiến trúc làng quê minh họa. Che khuất: Không để thân dừa che toàn bộ cổng. |
| **S06_O5 Nhóm tự vệ và quần chúng** · MG | Khung 64, 47, 16, 28%; tâm 72, 59%. | Nhóm tự vệ và người dân ở lề cùng hướng đoàn chính. Chân trên đường; trang bị thể hiện tiết chế. Che khuất: Tách đủ khỏi đoàn phụ nữ để chọn riêng. |
| **S06_H1 Loa tay** · FG | Khung 4, 44, 9, 12%; tâm 8, 50%. | Loa tay đặt nghiêng trên ghế, miệng loa hướng ra đường. Thân loa nằm trên ghế dưới mái hiên. Che khuất: Bị mép vải che khoảng một phần tư. |

#### Prompt master dùng trực tiếp

```text
Ảnh master 16:9, minh họa 2D vẽ tay bán hiện thực, mắt ngang hoặc hơi cao theo từng brief, phối cảnh phối hợp thống nhất; nhân vật có trọng lượng; đạo cụ gắn vào bề mặt; chữ đặt sau bằng engine.

One 16:9 hand-painted 2D scene of the early January 1960 Dong Khoi movement in rural Ben Tre. Camera stands at the back-left roadside behind the gathering, looking diagonally along a dirt village road toward a simple administrative compound gateway in the upper-right background. The road leads from lower-left foreground through the people to that gateway; it must not stop at a fence. Women and other villagers form a naturally uneven middle-ground procession facing and walking AWAY from the viewer toward the upper-right destination. Show backs and side profiles rather than everybody smiling at camera. A small supporting self-defense group stands or walks on the right verge in the SAME overall direction. In the near left, a drum rests on a real wooden support while a person beside it plays; another person holds a bamboo signal block. A hand megaphone partly rests under cloth on a low porch stool. Coconut palms and modest period rural architecture frame the road. Gentle morning light comes from upper right and shadows fall lower-left. The three historical village names belong in a later UI map, not as three identical gateways in the scene. No modern monument, no floating props, no confetti, no readable banners, no UI or arrows.
```

#### Những lỗi phải loại

- Đoàn người bước ra khỏi cổng về phía camera
- Tất cả quay mặt tạo dáng như chụp ảnh lưu niệm
- Ba xã là ba tòa nhà đặt liền nhau
- Trống bay hoặc mõ không có người cầm
- Tượng đài Đồng Khởi hiện đại
- Biểu ngữ có chữ AI sai

#### Checklist duyệt ảnh

- [ ] Hướng đoàn đi tới địa điểm đích dễ đọc.
- [ ] Đường làng nối liên tục từ FG qua đoàn tới BG.
- [ ] Trống mõ và hai nhóm người có hoạt động riêng, không đứng thành menu.


### S07 Tổng tiến công và nổi dậy Mậu Thân

**Thời điểm và trạng thái:** Tết Mậu Thân 1968, khoảnh khắc chuẩn bị trong cơ sở nội thành trước khi nhóm rời nhà.

**Camera:** Hình cắt lớp giải thích: camera ở ngoài mặt tường đã lược bỏ, hơi cao hơn sàn tầng trên, nhìn xuống khoảng 15 độ. Chỉ dùng một hệ phối cảnh ba phần tư. Nhà tầng trên và hầm dưới thuộc cùng một khối, không ghép hai ảnh có góc máy khác nhau.

**Bố cục và quan hệ không gian:** Tầng trên chiếm y=17–53%, hầm y=57–88%. Sàn tầng trên chính là trần hầm. Cửa hầm nằm trên sàn khoảng x=40–52%,y=48–55%; phần cắt lớp cho thấy không gian bên dưới. Cửa ra hẻm ở x=78–95%, tầng trên; xe chỉ thấy một phần bên ngoài cửa ở đúng cao độ mặt hẻm. Mép đất cắt lớp ở cạnh ảnh làm rõ đây là minh họa.

**Hướng người và phương tiện:** Nhóm người trên tầng trên tập trung về phía cửa ra hẻm bên phải, không bước xuống xuyên trần hầm. Các kiện phía dưới đứng yên. Xe ngoài hẻm đã dừng, thân song song với hẻm, không chĩa đầu xe vào hầm hoặc phòng.

**Ánh sáng:** Một nguồn đèn ấm ở trên trái phòng trên. Ánh sáng giảm rõ khi xuống hầm, có ánh bổ trợ yếu để thấy kiện hàng; không dùng hầm sáng hơn phòng. Khoảng cửa hẻm là ánh đêm xanh xám, không nắng giữa trưa.

#### Vị trí từng object

| Object | Khung hình dự kiến x y rộng cao và tâm click | Hướng và điểm tựa |
| --- | --- | --- |
| **S07_O1 Cửa hầm dưới nền nhà** · MG | Khung 37, 46, 18, 10%; tâm 46, 51%. | Nắp mở hoặc đặt lệch ngay cạnh miệng, nhìn được mối nối với sàn. Khung cửa nằm trong sàn; không treo giữa hai tầng. Che khuất: Miệng hầm rõ, không có người đứng chắn hết. |
| **S07_O2 Các kiện vũ khí trong hầm** · FG | Khung 9, 64, 25, 20%; tâm 22, 74%. | Kiện kín đặt theo sàn hầm, các cạnh cùng điểm tụ. Kiện trên nền hoặc kệ thấp, không treo. Che khuất: Xếp vừa phải, không nhét vật xuyên nền hoặc vách. |
| **S07_O3 Nhóm chiến sĩ biệt động** · MG | Khung 57, 23, 18, 24%; tâm 66, 35%. | Nhóm nghiêng thân về cửa phải, trò chuyện nhỏ hoặc chuẩn bị đồ. Chân ở sàn tầng trên; không lọt vào trần hầm. Che khuất: Phân biệt từng dáng, không cần bày đủ số người theo ảnh tư liệu chưa có. |
| **S07_O4 Xe tải nhỏ ngoài cửa** · BG | Khung 83, 34, 13, 16%; tâm 89, 43%. | Xe nằm dọc hẻm theo phương ngang, thấy sườn qua khoảng cửa. Bánh trên mặt hẻm ngang với sàn tầng trên. Che khuất: Khung cửa che một phần thân, vẫn nhận ra xe nhỏ. |
| **S07_O5 Cửa ra hẻm Sài Gòn** · BG | Khung 79, 16, 17, 17%; tâm 87, 25%. | Phần trên cửa và khoảng hẻm lùi ra sau tường. Cửa gắn tường, có ngưỡng và bản lề. Che khuất: Cửa và xe là hai vùng chọn khác cao độ hình ảnh, không cùng một hitbox. |
| **S07_H1 Tờ lịch Tết Mậu Thân** · FG | Khung 4, 26, 10, 13%; tâm 9, 33%. | Lịch treo trên mặt trong bức tường gần đã lược một phần. Móc lịch thật trên cột hoặc tường còn lại. Che khuất: Cạnh vật khác che nhẹ; giấy để trống cho engine. |

#### Prompt master dùng trực tiếp

```text
Ảnh master 16:9, minh họa 2D vẽ tay bán hiện thực, mắt ngang hoặc hơi cao theo từng brief, phối cảnh phối hợp thống nhất; nhân vật có trọng lượng; đạo cụ gắn vào bề mặt; chữ đặt sau bằng engine.

Single 16:9 hand-painted EXPLANATORY CUTAWAY of a Saigon resistance house during Tet 1968, inspired by the 287/70 Phan Dinh Phung historical site, not a measured architectural reconstruction. Remove only the wall facing the viewer. Use ONE consistent three-quarter perspective, looking slightly downward. The upper room occupies the upper half of the image and the cellar the lower quarter; the upper room FLOOR is visibly the cellar CEILING. A modest floor hatch sits in that floor near the center, with its lid next to the opening. Closed supply crates rest firmly on the cellar floor or a low shelf below; provide only broad historical illustration, not construction or operating diagrams. A small group of urban resistance fighters stands on the UPPER floor, bodies turning toward the doorway on the RIGHT as they prepare to leave. Through that doorway show a narrow alley and only part of a small period truck parked ALONG the alley, wheels at the same ground level as the upper room. The truck must not be inside or beneath the house. A blank Tet calendar hangs on a remaining near wall at left. Warm light from an upper-left lamp reaches the room; cellar stays darker, doorway has cool night light. No palace outside the alley, no mixed perspectives, no floating hatch, no readable text, UI or arrows.
```

#### Những lỗi phải loại

- Hai tầng có hai phối cảnh không khớp
- Cửa hầm treo trong không trung
- Xe tải nằm dưới hầm hoặc trên mái
- Tất cả người nằm trong lớp đất
- Phủ cả tầng hầm bằng bản vẽ kỹ thuật cấu tạo
- Dinh Độc Lập ngay ngoài cửa hẻm

#### Checklist duyệt ảnh

- [ ] Sàn phòng và trần hầm là một mặt cấu trúc duy nhất.
- [ ] Xe thuộc mặt đường ngoài cửa, không thuộc tầng hầm.
- [ ] Người chuẩn bị rời phòng có lối đi rõ tới cửa, không xuyên vật.


### S08 Hà Nội Điện Biên Phủ trên không

**Thời điểm và trạng thái:** Buổi sáng sau khi xác B52 đã rơi xuống hồ Hữu Tiệp trong đợt tập kích cuối tháng 12/1972; không phải lúc máy bay đang rơi.

**Camera:** Camera ở một bờ hồ, cao khoảng 1,6 m, nhìn chéo qua mặt nước về mảnh xác ở bờ đối diện phía trên phải. FG là lối đi dân cư và cửa hầm, không đứng giữa mặt hồ. Đường chân trời ở khoảng y=36%.

**Bố cục và quan hệ không gian:** Mặt nước từ x=43–95%,y=34–68%, mảnh xác ở x=73–93%,y=31–50%. Khu hầm ở FG trái. Chiến sĩ MG trái nhìn về tổ dân phòng giữa phải; bàn trực ở lối bờ hồ thấp hơn, không đặt nổi trên mặt nước. Phần xác phải nối với mặt nước, không là chiếc máy bay nguyên vẹn đỗ trên hồ.

**Hướng người và phương tiện:** Mọi người đang đứng hỏi tin hoặc quan sát sau sự kiện, không chạy dạt cùng một hướng như đang có vụ nổ trước mặt. Không có người điều khiển vũ khí bắn vào xác. Máy bay trong ảnh là mảnh xác nằm yên; không đồng thời có một B52 nguyên vẹn đang rơi.

**Ánh sáng:** Ánh sáng sáng sớm âm u từ trên trái, màu xanh xám và nâu; bóng ngắn mềm. Trong hầm có thể có ánh ấm rất yếu. Không dùng sân đêm xanh tối, đèn pha hoặc chớp lửa làm nguồn sáng chính.

#### Vị trí từng object

| Object | Khung hình dự kiến x y rộng cao và tâm click | Hướng và điểm tựa |
| --- | --- | --- |
| **S08_O1 Mảnh xác B52 trên hồ** · BG | Khung 73, 31, 20, 20%; tâm 84, 42%. | Mảnh thân kim loại gãy nghiêng, một phần chìm. Có tiếp xúc mặt nước và bùn, phản chiếu vỡ nhẹ. Che khuất: Không che bằng khói dày, không phóng to thành nguyên máy bay. |
| **S08_O2 Lối xuống hầm phòng không** · FG | Khung 8, 59, 24, 24%; tâm 20, 72%. | Miệng hầm nhìn chéo, bậc đi xuống dưới mặt đất. Nằm trong nền lối đi, không là hộp đặt trên mặt nước. Che khuất: Để lộ lối vào đủ rõ và không có người đè kín cửa. |
| **S08_O3 Loa truyền tin khu dân cư** · MG | Khung 58, 16, 13, 18%; tâm 65, 26%. | Miệng loa hướng về khu dân cư, không chĩa vào trời. Gắn chắc vào cột cạnh nhà. Che khuất: Để khoảng trời tách loa khỏi thân cây. |
| **S08_O4 Chiến sĩ phòng không** · MG | Khung 32, 34, 14, 29%; tâm 39, 49%. | Đứng nghiêng hướng về tổ dân phòng và hồ. Chân trên lối đi cùng độ cao với bàn trực. Che khuất: Không dựng thành chân dung tách nền quá sáng. |
| **S08_O5 Tổ dân phòng** · MG | Khung 61, 47, 18, 30%; tâm 70, 62%. | Nhóm người quanh bàn, một người ghi tin, một người hỏi. Bàn và ghế trên bờ đất, cách mép nước. Che khuất: Không che xác B52 phía trên phải. |
| **S08_H1 Sổ ghi nơi sơ tán** · FG | Khung 5, 43, 9, 12%; tâm 9, 49%. | Sổ nằm trên góc bàn trực kéo về phía gần camera. Trên mặt bàn phụ cùng không gian bờ hồ. Che khuất: Lộ hơn nửa trang; không cần chữ đọc được trong ảnh. |

#### Prompt master dùng trực tiếp

```text
Ảnh master 16:9, minh họa 2D vẽ tay bán hiện thực, mắt ngang hoặc hơi cao theo từng brief, phối cảnh phối hợp thống nhất; nhân vật có trọng lượng; đạo cụ gắn vào bề mặt; chữ đặt sau bằng engine.

One 16:9 hand-painted historical narrative scene at Huu Tiep pond, Ngoc Ha Hanoi, during a QUIET OVERCAST MORNING after B52 wreckage has fallen there in late December 1972. Camera stands on the residential bank at eye level, looking diagonally across the pond toward broken wreckage in the upper-right far bank area. The pond occupies middle-right. Show only a damaged fragment of aircraft partly embedded in water and mud, with believable contact and subdued reflections, not an intact aircraft floating on top. Foreground left has a grounded civilian air-raid shelter entrance whose steps descend into earth. A composite air-defense serviceman stands mid-left in conversation toward civil-defense volunteers mid-right. Volunteers gather at a low message desk on the DRY BANK, not on water. A period loudspeaker is fixed to a residential post above them, facing the neighborhood. A partially visible ledger rests on a nearer table corner. Everyone is stationary or quietly exchanging information; this is not the moment of the crash or an active explosion. Cool diffuse morning daylight from upper left, with only faint warmth inside the shelter. No modern memorial plaques or restored railings, no complete flying B52, no giant flames, no night lighting, no readable text, no UI.
```

#### Những lỗi phải loại

- B52 nguyên chiếc đỗ nổi trên mặt hồ
- Máy bay đang rơi và xác đã nằm trên hồ trong cùng một khung
- Cảnh đêm nhưng brief ghi buổi sáng
- Bảng di tích, bia, lan can trùng tu hiện đại
- Bàn dân phòng nổi trên nước
- Người bắn vào xác máy bay

#### Checklist duyệt ảnh

- [ ] Xác đã rơi và nằm yên, không lẫn khoảnh khắc đang ném bom.
- [ ] Tất cả người, bàn và hầm ở trên bờ.
- [ ] Hướng nhìn dẫn từ khu dân cư tới dấu tích trên hồ.


### S09 Ký Hiệp định Paris

**Thời điểm và trạng thái:** Ngày 27/1/1973, một nhịp tại bàn ký sau khi bút đã được đặt xuống để xem văn kiện; không phải mọi người đồng loạt đang ký.

**Camera:** Camera ở khu báo chí đầu gần bên trái, cao khoảng 1,5 m, nhìn ba phần tư vào mặt trước bàn ký. Mặt bà Nguyễn Thị Bình nhìn thấy nghiêng ba phần tư, thân hướng vào tờ giấy trên bàn. Khung rộng vừa để thấy người, bìa văn kiện và khu báo chí.

**Bố cục và quan hệ không gian:** Bàn ký trải x=12–75%,y=50–81%; phần giấy và bìa gần camera ở FG. Người ký MG trái; các bảng tên nhỏ nằm theo mép bàn, không dựng thành bốn bảng lớn sau đầu. Máy ảnh và micro báo chí ở BG phải, ngoài vùng ngồi của đại biểu.

**Hướng người và phương tiện:** Nguyễn Thị Bình ngồi xem văn kiện, tay đặt tự nhiên trên bàn. Bút ký chính của bố cục nằm trên bàn gần bìa, không đồng thời có một bản sao của cùng bút đang cầm để ký. Nhiếp ảnh gia hướng ống kính về bàn ký; đại biểu không quay lưng với bàn.

**Ánh sáng:** Ánh phòng hội nghị tán đều, thêm ánh cửa trái rất nhẹ. Mặt người và giấy cùng nhiệt độ màu; bóng dưới cánh tay và bìa mỏng. Không nắng xiên chói xuyên qua đầu người hoặc đèn spotlight kiểu sân khấu hiện đại.

#### Vị trí từng object

| Object | Khung hình dự kiến x y rộng cao và tâm click | Hướng và điểm tựa |
| --- | --- | --- |
| **S09_O1 Bản Hiệp định Paris** · FG | Khung 12, 65, 22, 15%; tâm 23, 73%. | Văn kiện quay theo chiều người ký; phần chữ để engine/cận cảnh. Trang và bìa nằm trên mặt bàn theo đúng phối cảnh. Che khuất: Không giấu kín sau bảng tên. |
| **S09_O2 Nguyễn Thị Bình tại bàn ký** · MG | Khung 29, 24, 19, 30%; tâm 38, 39%. | Ngồi nhìn xuống và vào bàn, mặt ba phần tư về camera. Thân trên ghế, bàn tay chạm bàn. Che khuất: Khuôn mặt rõ; tham khảo ảnh nhân vật thật. |
| **S09_O3 Bảng tên bốn bên** · MG | Khung 48, 49, 18, 11%; tâm 57, 55%. | Các bảng tên phân bố theo chỗ đoàn ngồi; vùng này mở UI tên bốn bên. Đế gập của từng bảng nằm trên bàn. Che khuất: Không che tay và văn kiện; không phóng to thành bốn poster. |
| **S09_O4 Bút ký văn kiện** · FG | Khung 64, 67, 10, 8%; tâm 69, 71%. | Bút nằm chéo nhẹ cùng mặt bàn, thân ngắn bằng vật thật. Bút và nắp trên bìa giấy; dùng vùng bìa làm proxy khi bút quá nhỏ. Che khuất: Không nằm dưới tay người; vẫn nhìn thấy hình bút. |
| **S09_O5 Máy ảnh và micro báo chí** · BG | Khung 78, 20, 17, 27%; tâm 86, 34%. | Ống kính và micro hướng về bàn ký, chân máy ở phía báo chí. Chân máy tiếp đất, camera trên đầu chân. Che khuất: Không chặn mặt đại biểu. |
| **S09_H1 Hồ sơ đàm phán từ năm 1968** · FG | Khung 5, 43, 9, 13%; tâm 9, 50%. | Tập hồ sơ trên bàn phụ gần camera, mép bìa quay về phía người xem. Nằm trên bàn phụ, giấy không trôi. Che khuất: Một phần bìa bị tờ giấy che, còn đủ vùng chọn. |

#### Prompt master dùng trực tiếp

```text
Ảnh master 16:9, minh họa 2D vẽ tay bán hiện thực, mắt ngang hoặc hơi cao theo từng brief, phối cảnh phối hợp thống nhất; nhân vật có trọng lượng; đạo cụ gắn vào bề mặt; chữ đặt sau bằng engine.

One 16:9 hand-painted historical game image of the Paris agreement signing setting on January 27, 1973, inspired by period photographs at Kleber. Choose ONE quiet beat AFTER the pen has been set down and the document is being reviewed. Camera is at the near-left press position, looking three-quarter toward the FRONT of the signing table. Nguyen Thi Binh is seated middle-left, her body facing inward toward the papers and her face visible in three-quarter view as she looks down. The near table runs across the lower image with a modest agreement folder lower-left, small folded party nameplates along the middle table edge, and ONE resting pen beside a folder lower-right. Do not simultaneously duplicate that pen in her hand. The pen stays realistically small; later UI uses the surrounding folder as its click proxy. Press cameras and microphones stand in the far-right press area, their lenses pointing toward the delegates. A negotiation file partly shows on a near side table. Use coherent table-plane perspective, supported chair positions and even period room light with a soft contribution from left. No Le Duc Tho signing the formal agreement, no giant placards, no readable AI text, no modern cameras, no floating papers, no UI.
```

#### Những lỗi phải loại

- Lê Đức Thọ ký chính thức ngày 27/1
- Nhân vật quay lưng về văn kiện
- Một bút vừa ở trên bàn vừa nằm trong tay cùng người
- Bốn bảng tên khổng lồ đặt lơ lửng
- Giấy thẳng mặt camera nhưng mặt bàn nghiêng sang hướng khác
- Máy ảnh hoặc micro hiện đại không có chân

#### Checklist duyệt ảnh

- [ ] Tư thế người ký và mặt giấy thuộc cùng một hành động.
- [ ] Ống kính báo chí hướng tới người và bàn ký.
- [ ] Bút có tỷ lệ thật, có vùng click đại diện hợp lý.


### S10 Ngày 30 tháng 4 tại Dinh Độc Lập

**Thời điểm và trạng thái:** Ảnh master sau 11 giờ 30 ngày 30/4/1975: xe đã đi qua cổng, đang dừng trong sân, đầu thân và nòng cùng hướng vào phía Dinh. Cờ đã có trên nóc. Đây không phải khoảnh khắc xe đang húc cổng.

**Camera:** Camera ở NGOÀI khuôn viên, trên phía đường trước cổng chính, lệch trái trục cổng một chút, cao 1,6 m. Camera nhìn QUA cổng VÀO sân, thấy mặt trước Dinh ở BG. Phía gần camera là đường và phần cổng; phía xa là sân rồi tòa nhà. Khung rộng 30–35 mm, không nhìn từ trong Dinh ra đường.

**Bố cục và quan hệ không gian:** Quan hệ chiều sâu bắt buộc: CAMERA → CỔNG → ĐUÔI XE 390 → MŨI XE 390 → SẢNH DINH. Dinh ở x=42–88%, y=17–49%. Xe 390 ở x=29–66%,y=48–78%, hoàn toàn bên trong cổng; cổng đổ và trụ cổng ở hai mép FG, không cắt ngang giữa thân xe. Cờ trên mái x=61–67%,y=14–27%.

**Hướng người và phương tiện:** Trục thân xe đi từ điểm đuôi khoảng (39%,73%) tới điểm mũi khoảng (62%,55%): hướng LÊN PHẢI, đi XA camera về phía Dinh. Camera thấy ĐUÔI và SƯỜN TRÁI xe, không thấy toàn mặt giáp trước. Phần sau động cơ gần dưới trái; phần mũi trước ở trên phải. Tháp pháo và nòng song song gần trục thân, nòng chĩa sâu vào sân phía Dinh, không chĩa về camera, không bắn. Xe 843 ở vùng cổng phụ bên trái cũng hướng vào khuôn viên, không quay đầu ra đường.

**Ánh sáng:** Ánh TRƯA đầu giờ chiều ngắn sau 11:30, nắng từ trên trái; bóng tương đối ngắn xuống phải. Mặt sân sáng rõ, không ánh hoàng hôn hoặc bóng dài kiểu chiều muộn. Vết bẩn và bụi trên xích có mức độ, không phủ đám khói che hình xe.

#### Vị trí từng object

| Object | Khung hình dự kiến x y rộng cao và tâm click | Hướng và điểm tựa |
| --- | --- | --- |
| **S10_O1 Xe tăng 390** · FG | Khung 29, 48, 37, 30%; tâm 47, 65%. | Nhìn từ phía sau bên trái; đuôi gần camera, mũi xa camera hướng sảnh Dinh. Hai dải xích áp mặt sân liên tục, bóng tiếp xúc dưới xích. Che khuất: Cánh cổng có thể che rất ít mép xích gần nhưng không che silhouette đuôi; số 390 đặt sau lên sườn tháp. |
| **S10_O2 Cổng Dinh Độc Lập** · FG | Khung 6, 60, 23, 25%; tâm 18, 75%. | Cổng chính bị đổ vào trong khoảng sân; thấy trụ và cánh cổng từ phía đường. Bản lề nối trụ, phần cánh nằm trên mặt đất; không đè xuyên thân xe. Che khuất: Đủ nhận ra cổng; để khoảng trống trung tâm cho lối vào. |
| **S10_O3 Cờ trên nóc Dinh** · BG | Khung 60, 13, 9, 15%; tâm 65, 21%. | Cờ nhìn theo mặt trước tòa nhà, nửa trên đỏ, nửa dưới xanh, sao vàng. Cán nối với đúng nóc Dinh; vị trí có đối chiếu ảnh. Che khuất: Không tách thành cờ lơ lửng trên trời hoặc cắm lên đầu xe thay cho cờ trên mái. |
| **S10_O4 Cửa sảnh Dinh** · BG | Khung 60, 34, 16, 13%; tâm 68, 41%. | Mặt trước sảnh mở về phía sân và camera. Cột, cửa và bậc thuộc cùng kiến trúc; không nhìn xuyên phòng. Che khuất: Không bị toàn bộ xe che khuất; còn thấy lối vào sảnh. |
| **S10_O5 Radio chuyển tin** · FG | Khung 79, 70, 14, 14%; tâm 86, 77%. | Radio trên bàn trực nhỏ tại rìa ngoài cổng, mặt quay về người trực. Bàn có chân trên đất, radio tựa hoàn toàn trên mặt bàn. Che khuất: Đạo cụ minh họa nằm lệch phải, không ở giữa đường xe. |
| **S10_H1 Xe tăng 843** · MG | Khung 6, 39, 21, 21%; tâm 16, 50%. | Xe 843 ở vùng bên trái, thân và nòng cùng hướng vào sân. Xích trên mặt đất; bố cục vị trí hai xe là thu gọn để kể chuyện. Che khuất: Trụ cổng che khoảng một phần tư đến một phần ba; không bị che quá nửa. |

#### Prompt master dùng trực tiếp

```text
Ảnh master 16:9, minh họa 2D vẽ tay bán hiện thực, mắt ngang hoặc hơi cao theo từng brief, phối cảnh phối hợp thống nhất; nhân vật có trọng lượng; đạo cụ gắn vào bề mặt; chữ đặt sau bằng engine.

Create ONE 16:9 hand-painted 2D historical game master image at Independence Palace, Saigon, AFTER 11:30 on April 30, 1975. This is a stationary moment AFTER the tanks have entered and the flag has been raised, NOT the gate-impact moment. CAMERA POSITION IS OUTSIDE THE MAIN GATE ON THE STREET, slightly LEFT of the entrance axis, looking THROUGH THE GATE INTO THE COURTYARD toward the FRONT FACADE of the palace in the upper-right background. Mandatory depth order: CAMERA, BROKEN MAIN GATE, REAR OF TANK 390, FRONT OF TANK 390, PALACE ENTRANCE. Tank 390 has completely passed the gate and has stopped inside the courtyard, still pointing INWARD toward the palace. Show the tank from its REAR-LEFT THREE-QUARTER SIDE: the rear engine area is closest to the viewer in the lower-left of the tank, while the front hull is farther away toward upper-right. Its hull axis runs diagonally from approximately 39% width 73% height at the REAR to 62% width 55% height at the FRONT. The turret and cannon point AWAY from the camera, deeper toward the palace, in the same general direction as the hull. Do not show a frontal tank facing the viewer. Ground both tracks on the courtyard pavement with weight and contact shadows. Fallen gate leaves rest near the foreground posts on the sides, leaving the central entry lane clear. The palace occupies upper-right background. The Liberation Front flag, red above blue with a yellow star, is attached to the palace roof. Tank 843 is partly visible in the left side-gate area, also facing inward. A small illustrative radio rests on a supported duty table at the far-right verge OUTSIDE the vehicle lane. Use high midday light from upper left with modest short shadows. Historical architecture and tank shapes follow reference photographs. No reversed vehicle direction, no camera looking out from the palace, no cannon aimed at viewer, no modern skyline, no smoke hiding the tank, no generated lettering or numbers; apply 390 and 843 later on the correct turret surfaces. No arrows or UI.
```

#### Những lỗi phải loại

- Camera đứng trong Dinh nhìn ra cổng
- Mặt giáp trước của 390 chĩa thẳng vào camera
- Nòng pháo hướng về người xem hoặc ra đường
- Đuôi xe ở sát cửa sảnh còn mũi xe ở sát cổng
- Xe đang lùi ra khỏi sân
- Cổng xuyên qua thân xe hoặc cánh cổng lơ lửng
- Mặt Dinh nằm phía sau camera
- Cờ trên mái được ghép vào khoảnh khắc trước khi cắm cờ
- Xe tăng hiện đại hoặc cả hai xe cùng số 390

#### Checklist duyệt ảnh

- [ ] Đọc ảnh từ dưới lên thấy cổng gần, đuôi xe, mũi xe, rồi Dinh xa.
- [ ] Nhìn được đuôi động cơ và sườn trái 390; không phải ảnh mặt trước xe lao vào người xem.
- [ ] Hướng nòng và trục thân đều sâu vào sân.
- [ ] Cờ, trạng thái xe dừng và thời điểm sau 11:30 thống nhất.

#### Shot chuyển cảnh tách riêng

**Shot xe đang tiến qua cổng.** Chỉ dùng làm khung chuyển cảnh riêng; không trộn vào master sau 11:30.

Thời điểm: Khoảnh khắc tiến qua cổng trước mốc cờ tung bay 11:30.

- Giữ nguyên camera ở ngoài nhìn vào và trục đuôi gần, mũi xa.
- Cho xe tiến sâu từ đường qua cổng vào sân, chuyển động xa camera.
- Không có cờ Mặt trận đã treo trên nóc Dinh trong shot này.
- Chọn trạng thái cổng vừa bị mở hoặc húc đổ đúng khung tham khảo; không để xe bị kẹt xuyên cánh.

#### Prompt riêng cho shot đang tiến qua cổng

```text
One 16:9 hand-painted historical transition frame showing tank 390 ENTERING the main gate of Independence Palace from the street on April 30, 1975, BEFORE the later 11:30 roof-flag moment. Camera stands OUTSIDE the gate, slightly LEFT of the entrance axis, and looks INWARD across the courtyard toward the palace front facade in the upper-right background. Show tank 390 from its REAR-LEFT THREE-QUARTER VIEW. The REAR engine deck is closest to camera in lower-left, the FRONT hull is farther away in upper-right. The nose has crossed into the courtyard while the rear is still passing between the gateposts. Its tracks carry it FORWARD AWAY from camera toward the palace. The cannon follows the hull direction deeper into the courtyard, never toward the viewer or back toward the street. Gate leaves have been pushed inward and lie or tilt with physically credible hinge and ground contacts, never intersecting the hull. Keep a clear route from the street through the gateway into the courtyard. Use correct period tank and palace reference shapes. This frame is about arrival at the gate, so DO NOT show the later Liberation Front flag already flying on the palace roof. No front-facing tank driving toward the viewer, no reverse travel out of the palace, no floating gate, no modern tanks, no readable labels or UI.
```

Không đưa cả hai trạng thái vào cùng một prompt master.
