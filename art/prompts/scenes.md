# Prompt Gemini cho 10 scene — Giữ lấy ngày mai

Mỗi scene: 1 ảnh MASTER (đủ vật tương tác) + 1 ảnh CLEAN (cùng chat, xoá các vật
sẽ chuyển động idle) → `tools/prepare-assets.py` lấy hiệu hai ảnh làm mặt nạ vật.

## Ràng buộc bố cục (vì sao prompt viết dài như vậy)

- (Cập nhật theo yêu cầu: vật ĐƯỢC che nhau nếu hợp lý về không gian — cổng Dinh
  Độc Lập đè lên xe tăng phía sau… Game vẽ theo chiều sâu, vật gần che vật xa và
  được dò chuột trước. Prompt cũ dưới đây vẫn tách rời các vật vì như vậy dễ cắt
  sprite nhất; chỉ chỗ nào tách rời là vô lý mới để chồng.)
- 6 vật tương tác của mỗi cảnh **không chồng lên nhau, không che nhau** — có khoảng
  trống quanh mỗi vật. Lý do: sprite cắt từ ảnh master; hai vật chồng nhau thì
  cắt vật này mất một mảnh vật kia, viền vàng khi hover ôm lẫn sang vật khác,
  và vật idle (thở, cờ bay) kéo lệch luôn phần của vật bên cạnh.
- Vật nào cũng có **bề mặt đỡ** (đất, bàn, giá, tay người) và bóng tiếp xúc —
  đúng tiêu chí nghiệm thu ở `src/docs/03-san-xuat-scene.md`.
- Vị trí đã sửa so với hitbox nháp ở chỗ nháp vô lý về vật lý (micro cách người
  nói 330 px, xe tải nằm dưới khung cửa, tăng 843 chồng lên tăng 390…). Ghi
  chú "ĐỔI" ở từng scene.
- Nhân vật có thật (Hồ Chí Minh, Phạm Văn Đồng, Nguyễn Thị Bình) vẽ **nhỏ, ở
  xa, không chân dung cận** — không tạo hình nhận dạng sai, thẻ tư liệu mới là
  nơi giới thiệu người thật.
- Không chữ trong ảnh: mọi chữ do engine render.

## Khối STYLE (dán đầu mọi prompt)

```
STYLE: hand-painted 2D digital illustration for a historical narrative point-and-click adventure game. Painterly brush texture with clean dark-brown ink outlines around every figure and object, semi-realistic proportions, soft cinematic lighting, muted earthy palette with a few saturated accents, detailed but readable at a glance — like a classic graphic-novel adventure game background. Wide 16:9 landscape, eye-level camera, one continuous scene. Absolutely no text, letters, numbers, captions, logos, UI or watermark.
LAYOUT RULES: the six KEY ITEMS listed below must each be fully visible and clearly separated from one another by empty ground, floor or wall — no key item may overlap, touch, or hide another key item. Every key item rests on a believable support (ground, floor, table, stand, a person's hands) with a soft contact shadow, consistent perspective, scale and light direction. Background extras stay small and behind the key items.
```

## S01 — Tuyên ngôn Độc lập tại Ba Đình (2/9/1945)

ĐỔI: micro đặt sát trước người đọc (nháp để micro cách 330 px — vô lý); bản
Tuyên ngôn nằm trên bục ngay bên phải người đọc; giỏ kim chỉ chuyển xuống tiền
cảnh phải (chỗ trống, không lẫn đám đông).

```
SCENE: Ba Dinh square, Hanoi, 2 September 1945, warm afternoon sunlight from the left. A simple wooden independence platform draped with red cloth occupies the midground right; trees and a distant crowd of small civilians fill the background; open square ground in front.
KEY ITEMS (left → right):
1. Far left foreground: a Vietnamese civilian in a white shirt and conical hat holding up a red flag with a yellow five-pointed star on a bamboo pole, the flag waving freely against the sky.
2. Lower center midground: a compact group of five attendees (men in white shirts, women in ao dai with conical hats) standing on the square, looking toward the platform.
3. On the platform, left part: a tall period chrome microphone on a floor stand.
4. On the platform, just right of the microphone: a slender elderly man with a thin white beard in a plain khaki suit standing, small in the distance, seen from three-quarter view, no close-up face.
5. On the platform, right of the man: a wooden lectern with a few cream manuscript sheets lying on its top.
6. Bottom right foreground corner: a low wooden stool with a small woven sewing basket on it, red cloth and spools of thread visible.
```

## S02 — Toàn quốc kháng chiến (đêm 19/12/1946)

ĐỔI: chiến sĩ tự vệ đứng cạnh đầu phải chiến lũy (không đứng sau, để không bị
chiến lũy che); toa xe điện ở hậu cảnh trái, đỉnh chiến lũy thấp hơn chân toa.

```
SCENE: an old Hanoi street at night, 19 December 1946. Two-storey tube houses with wooden shutters line both sides, a tram track runs into the distance. Cold blue moonlight from the left, warm oil-lamp glow from a few doorways. Distant faint orange glow on the horizon.
KEY ITEMS:
1. Left foreground: a sturdy street barricade built from wooden wardrobes, bed frames and sandbags stacked on the road surface (kept low, below mid-height of the image).
2. Center-left midground, standing on the road just to the right of the barricade's end: a Vietnamese self-defense militiaman in a dark shirt and helmet, rifle slung, alert.
3. Center, on a doorstep of a house: a young courier holding a canvas satchel of documents.
4. Right midground, walking along the side passage: an evacuating family — a mother carrying bundles on a shoulder pole, a father, a child.
5. Upper right background: a row of three unlit dark iron street lamps on poles in front of the facades.
6. Far left background, behind a house corner and well above the barricade: an old tram car partly visible, parked across the tracks to block the street.
```

## S03 — Chiến thắng Điện Biên Phủ (7/5/1954)

ĐỔI: cờ cắm trên mép nóc hầm, cả lá cờ nằm trên nền trời (chỉ chân cán chạm hầm);
nhóm chiến sĩ đứng cạnh đầu hào thay vì trong hào; túi vải đặt cạnh tảng đá bên
trái xe đạp, có khoảng trống.

```
SCENE: Dien Bien Phu valley, 7 May 1954, misty morning light from the left, blue-grey haze on distant mountains, muddy brown ground, scattered shell craters.
KEY ITEMS:
1. Right background: a low, half-buried French command bunker with a curved corrugated-steel roof covered in sandbags and earth.
2. On top of that bunker's roof, its pole planted at the roof edge: a large red flag with a yellow star waving, the whole flag cloth against the sky.
3. Center midground: a zig-zag network of dug communication trenches cut into the ground.
4. Left-center midground, standing on open ground beside the left end of the trenches: a group of four Viet Minh soldiers in pith helmets and green uniforms.
5. Left foreground: a loaded transport bicycle ("xe dap tho") with a long bamboo steering pole and big rice sacks tied to the frame, both wheels on the dirt path.
6. Far left foreground, next to a rock and separated from the bicycle: a small cloth shoulder bag with a worn notebook sticking out.
```

## S04 — Hội nghị Giơnevơ (20–21/7/1954)

ĐỔI: hai tập văn kiện đặt ở hai đầu bàn tiền cảnh, cách xa đoàn đại biểu; thẻ
ghi mốc tổng tuyển cử là một tấm thẻ nằm riêng trên bàn phụ góc trái.

```
SCENE: a grand 1950s Geneva conference hall, July 1954, tall windows on the left letting in pale white-blue daylight, wood-panelled walls, a long conference table with green cloth crossing the room.
KEY ITEMS:
1. Left foreground, on the near end of the conference table: a closed dark-blue document folder with papers (the armistice agreement).
2. Left-center midground, seated behind the table: the Vietnamese delegation — three men in dark suits, the head of delegation in the middle, small and seen from a distance.
3. Right background: a large blank geographic map of Indochina on a wooden easel.
4. Center foreground, on the far end of the near table, well apart from item 1: a separate stack of cream papers in a brown folder (the final declaration).
5. Right midground, on a second table: a row of small blank white delegation nameplates standing on the tabletop.
6. Far left foreground: a small side table with a single blank index card lying on it.
```

## S05 — Mở đường Trường Sơn (1959)

```
SCENE: a jungle trail at Khe Ho, Vinh Linh, 1959. Early morning light rays pierce the forest canopy from the left. Dense green forest, dark earth, a simple thatched bamboo shelter on the right. No vehicles, no roads, no pipes.
KEY ITEMS:
1. Left foreground: a large woven bamboo back-basket (gui) loaded with goods, resting on a low bamboo rack.
2. Left-center midground, standing on the trail: a young courier soldier in a faded uniform and soft hat, holding the straps of his back-basket.
3. Center foreground: a tightly wrapped supply parcel tied with rope, lying on a low wooden plank platform.
4. Right midground, leaning against the shelter wall: a wooden board with a blank sheet of paper pinned to it (a route sketch).
5. Upper right background: a narrow footpath winding up the hillside and disappearing under the canopy.
6. Far left foreground: a small wooden stool with a cloth satchel on it, a wrapped bundle of documents peeking from its pocket.
```

## S06 — Đồng Khởi Bến Tre (17/1/1960)

ĐỔI: "đường tới ba xã" là nhánh đường rẽ phải chạy vào xa, tách khỏi lối chính
dẫn tới cổng trụ sở — hai vật không chồng nhau.

```
SCENE: a rural village in Ben Tre, January 1960, soft daylight through coconut palms from the right, yellow dirt roads, green paddies and water coconut along a canal.
KEY ITEMS:
1. Left foreground: a large wooden barrel drum on a wooden stand, with a bamboo slit drum (mo tre) hanging beside it.
2. Center-left midground, walking on the main village road: a group of four rural women in brown ao ba ba and checkered scarves, determined.
3. Right background: a side road branching to the right and running far into the distance between coconut palms.
4. Center background, at the end of the main road: a modest whitewashed village administration gate with two pillars set in a low wall.
5. Right midground, standing by the roadside: a small group of villagers and two self-defense men in black clothes, restrained, few or no weapons visible.
6. Far left foreground, under a thatched eave: a low stool with a hand-held cone megaphone on it.
```

## S07 — Mậu Thân 1968 (căn nhà Biệt động 287/70 Phan Đình Phùng)

ĐỔI: xe tải nhìn qua một ô cửa sổ lớn ở tường phải (nháp đặt xe nằm ngay dưới
khung cửa ra hẻm — chồng nhau); cửa ra hẻm ở tường sau.

```
SCENE: explanatory cutaway illustration of a small Saigon house during Tet 1968. The upper part of the image is the ground-floor room (warm lamp light, tiled floor, Tet decorations of yellow apricot blossoms), the lower-left part shows the hidden cellar beneath the floor (darker, brick walls). Clear horizontal floor slab between them.
KEY ITEMS:
1. Center, in the floor slab: an open square wooden hatch with a short ladder going down into the cellar.
2. Lower left, inside the cellar: several closed wooden supply crates stacked on a low shelf.
3. Right part of the room, standing on the floor: a group of three young urban resistance fighters in civilian clothes talking quietly.
4. Far right wall: a large open window through which a small 1960s delivery truck parked in the alley is partly visible.
5. Back wall, center-right: a half-open wooden door leading out to a dim alley.
6. Upper left wall of the room: a blank Tet wall calendar hanging on a nail.
```

## S08 — Hà Nội Điện Biên Phủ trên không (cuối 12/1972)

ĐỔI: sổ ghi nơi sơ tán đặt trên thùng gỗ cạnh cửa hầm (không nằm giữa nhóm dân
phòng); cột loa đứng tách bên trái nhóm dân phòng.

```
SCENE: Huu Tiep pond in the Ngoc Ha residential area of Hanoi, late December 1972, somber cold morning light, grey sky, low brick houses and bare trees around the pond.
KEY ITEMS:
1. Right background: the huge dark tail and fuselage wreckage of a B-52 bomber jutting out of the pond water at an angle, with water ripples around it.
2. Left foreground: the concrete entrance of a residential air-raid shelter with steps going down under a low earth-covered roof.
3. Center midground: a loudspeaker horn mounted on top of a wooden pole.
4. Left-center midground, standing on the lakeside path: an air-defense serviceman in a green uniform and pith helmet.
5. Right midground, on the pond bank, well apart from the pole: a civil-defense team of three people with red armbands around a low duty table.
6. Far left foreground, on a wooden crate beside the shelter entrance: a closed ledger notebook.
```

## S09 — Ký Hiệp định Paris (27/1/1973)

```
SCENE: the signing ceremony hall at the International Conference Center on avenue Kleber, Paris, 27 January 1973. Pale winter light through tall windows on the left, chandeliers, a long signing table covered in green cloth.
KEY ITEMS:
1. Left foreground, on the near end of the signing table: an open leather agreement folder with blank pages.
2. Left-center midground, seated behind the table: a Vietnamese woman in an elegant dark ao dai with short hair, small in the distance, seen in three-quarter view.
3. Center midground, on the table surface: four small blank nameplates standing in a row.
4. Right foreground, on the table, apart from the folder: a black fountain pen lying on a blotter pad.
5. Right background, in the press area: a press camera on a tripod next to a microphone stand.
6. Far left foreground: a small side table with a stack of thick archive folders tied with string.
```

## S10 — Ngày 30/4/1975 tại Dinh Độc Lập

ĐỔI: tăng 843 chuyển ra cổng phụ hậu cảnh trái (nháp đặt sát tăng 390 — chồng
nhau); cổng chính đổ nằm ở trung cảnh trái, tăng 390 ở tiền cảnh giữa đã qua cổng.

```
SCENE: the courtyard of the Independence Palace in Saigon, early afternoon of 30 April 1975, bright sunlight from the left, green lawn, the long modernist palace facade with its vertical concrete screen in the right background, blue sky.
KEY ITEMS:
1. Center foreground, on the lawn: a Soviet T-54 style tank painted dark green.
2. Left midground: the main wrought-iron palace gate knocked down and lying flat on the ground between its two pillars.
3. On the palace roof, center-right: a flag pole with a flag whose top half is red, bottom half blue, with a yellow star in the middle.
4. Right background, at the base of the palace: the main entrance doorway of the palace hall.
5. Right foreground: a small wooden duty table with an old portable radio on it.
6. Far left background, at a side gate: a second tank (Chinese Type 59 style) partly visible.
```

## Prompt CLEAN (gửi ngay sau master, cùng chat)

```
Edit this exact image: remove ONLY these items and paint the background that would naturally be behind them: <danh sách>. Keep every other pixel, the framing, perspective, colors and lighting exactly the same. Same 16:9 size. No text.
```
