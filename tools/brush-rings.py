"""
Vòng khoanh cọ đỏ đánh dấu vật đã tìm / đang gợi ý (thay viền vàng).

    python tools/brush-rings.py

Gemini vẽ vài tấm vòng cọ đỏ trên nền trắng (`art/gemini/ring_*.png`, mỗi tấm
nhiều vòng cách xa nhau: tròn, bầu dục ngang, bầu dục dọc; nét đậm và mảnh).
Script tách từng vòng → `src/drop-assets-in-me/ui/ring_<n>.webp` (màu đỏ đồng
nhất, độ đậm nhạt vệt cọ nằm ở alpha) + `data/rings.generated.json`:

    { file, w, h, stroke, cx, cy, start, dir }

- `stroke`: độ dày nét (px texture), đo bằng tia từ tâm (xem `ray_profile`).
  Game chọn vòng có tỉ lệ khung gần vật
  nhất VÀ nét sau khi co giãn gần độ dày chuẩn nhất — vật nhỏ không bị nét
  bè, vật to không bị nét chỉ.
- `cx, cy`: tâm vòng (0..1 theo khung) — tâm quét của hiệu ứng vẽ.
- `start, dir`: góc bắt đầu quét (radian, 0 = phải, chiều kim đồng hồ dương vì
  trục y hướng xuống) và chiều quét. Vòng tay khoanh có ĐOẠN CHỒNG (đuôi vượt
  qua đầu nét): quét bắt đầu ở mép đoạn chồng, đi ra xa nó, đoạn chồng hiện cuối
  cùng — như cây cọ khép vòng. Không thấy đoạn chồng → bắt đầu góc trên trái.
"""
import glob
import json
import math
import os

import cv2
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_DIR = os.path.join(ROOT, "src", "drop-assets-in-me", "ui")
OUT_JSON = os.path.join(ROOT, "src", "scripts", "_game", "data", "rings.generated.json")
LONG = 768
# Nét dày hơn tỉ lệ này của cạnh ngắn (vòng "thiền" bè 15–22 %) thì bỏ: game cần
# nét 4–9 px quanh vật cỡ 70–630 px (≈ 1–6 %), vòng bè không bao giờ được chọn
# mà vẫn tốn ~40 KB mỗi vòng. Ảnh gốc vẫn ở art/gemini nếu sau cần.
MAX_WEIGHT = 0.13
WEBP_Q = 82
RED = (27, 35, 196)  # BGR — đỏ son


def redness_alpha(img):
    """Mực đỏ trên giấy trắng: kênh xanh lá tụt mạnh, đỏ giữ cao. Vệt cọ khô
    (hồng nhạt) ra alpha thấp — giữ được chất cọ."""
    b, g, r = [c.astype(np.float32) for c in cv2.split(img)]
    a = np.clip((255 - g - 25) / 150, 0, 1)
    a[(r - g) < 35] = 0  # xám / đen / bóng giấy không phải mực đỏ
    return a


def ray_profile(mask, cx, cy):
    """
    Bắn 120 tia từ tâm vòng. Trả (góc bắt đầu, chiều quét, độ dày nét):
    - cung có ≥ 2 lớp nét = đoạn chồng đầu–đuôi → quét bắt đầu ở mép sau của
      nó, đi ra xa nó;
    - độ dày = trung vị độ dài đoạn nét trên các tia CHỈ cắt một lớp. Không
      dùng 2·diện tích/chu vi: mép cọ khô tưa sợi làm chu vi dài gấp mấy lần,
      nét đo ra mỏng hơn thật → game chọn nhầm vòng bè.
    """
    h, w = mask.shape
    bins = 120
    layers = np.zeros(bins, int)
    runs = []
    rmax = int(math.hypot(w, h))
    for i in range(bins):
        a = 2 * math.pi * i / bins
        xs = (cx + np.cos(a) * np.arange(rmax)).astype(int)
        ys = (cy + np.sin(a) * np.arange(rmax)).astype(int)
        ok = (xs >= 0) & (xs < w) & (ys >= 0) & (ys < h)
        v = mask[ys[ok], xs[ok]] > 0
        if v.size == 0:
            continue
        # Số đoạn nét cắt tia (bỏ khe hở cọ khô < 4 px).
        v = cv2.morphologyEx(v.astype(np.uint8)[None], cv2.MORPH_CLOSE, np.ones((1, 5), np.uint8))[0]
        d = np.diff(np.concatenate([[0], v, [0]]))
        starts, ends = np.nonzero(d == 1)[0], np.nonzero(d == -1)[0]
        layers[i] = len(starts)
        if len(starts) == 1:
            runs.append(int(ends[0] - starts[0]))
    stroke = float(np.median(runs)) if runs else 10.0
    multi = layers >= 2
    if multi.all() or not multi.any():
        return -3 * math.pi / 4, 1, stroke
    # Cung nhiều lớp dài nhất (vòng tròn → xoay để không cắt đôi ở bin 0).
    k = int(np.argmin(multi))
    rolled = np.roll(multi, -k)
    best, cur, best_end = 0, 0, 0
    for i, m in enumerate(rolled):
        cur = cur + 1 if m else 0
        if cur > best:
            best, best_end = cur, i
    end = (best_end + k) % bins
    # Bắt đầu ở mép sau của đoạn chồng, quét ra xa nó (chiều +).
    return 2 * math.pi * (end + 1) / bins, 1, stroke


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for f in os.listdir(OUT_DIR):
        if f.startswith("ring_"):
            os.remove(os.path.join(OUT_DIR, f))
    rings = []
    for sheet in sorted(glob.glob(os.path.join(ROOT, "art", "gemini", "ring_*.png"))):
        img = cv2.imread(sheet, cv2.IMREAD_COLOR)
        a = redness_alpha(img)
        solid = (a > 0.2).astype(np.uint8) * 255
        joined = cv2.dilate(solid, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
        n, lab, st, _ = cv2.connectedComponentsWithStats(joined, 8)
        # Vệt cọ khô có thể cắt một vòng thành hai mảnh (chỗ đầu–đuôi gặp nhau
        # của vòng đậm tấm A) → gộp mảnh có khung chồng lên khung mảnh khác.
        boxes = {i: list(st[i][:4]) for i in range(1, n) if st[i][4] >= 0.0005 * img.size / 3}
        parent = {i: i for i in boxes}
        for i in boxes:
            for j in boxes:
                if i < j:
                    ax, ay, aw, ah = boxes[i]
                    bx, by, bw, bh = boxes[j]
                    ix = max(0, min(ax + aw, bx + bw) - max(ax, bx))
                    iy = max(0, min(ay + ah, by + bh) - max(ay, by))
                    if ix * iy > 0.3 * min(aw * ah, bw * bh):
                        parent[j] = parent[i] = min(parent[i], parent[j])
        def root(i):
            while parent[i] != i:
                i = parent[i]
            return i
        groups = {}
        for i in boxes:
            groups.setdefault(root(i), []).append(i)
        for ids in groups.values():
            comp_all = np.isin(lab, ids)
            ys_, xs_ = np.nonzero(comp_all)
            x, y, w, h = xs_.min(), ys_.min(), xs_.max() - xs_.min() + 1, ys_.max() - ys_.min() + 1
            if w * h < 0.01 * img.shape[0] * img.shape[1]:
                continue
            pad = 8
            x0, y0 = max(0, x - pad), max(0, y - pad)
            x1, y1 = min(img.shape[1], x + w + pad), min(img.shape[0], y + h + pad)
            comp = comp_all[y0:y1, x0:x1]
            alpha = a[y0:y1, x0:x1] * comp
            s = min(1.0, LONG / max(alpha.shape))
            if s < 1:
                alpha = cv2.resize(alpha, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
            m = (alpha > 0.2).astype(np.uint8) * 255
            ys, xs = np.nonzero(m)
            (ecx, ecy), _, _ = cv2.fitEllipse(np.column_stack([xs, ys]).astype(np.float32))
            start, d, stroke = ray_profile(((alpha > 0.5) * 255).astype(np.uint8), ecx, ecy)
            hh, ww = alpha.shape
            if stroke / min(ww, hh) > MAX_WEIGHT:
                print(f"{os.path.basename(sheet)}: bỏ vòng bè (nét {stroke:.0f} px / cạnh {min(ww, hh)})")
                continue
            out = np.zeros(alpha.shape + (4,), np.uint8)
            out[:, :, :3] = RED
            out[:, :, 3] = np.clip(alpha * 255, 0, 255).astype(np.uint8)
            out[out[:, :, 3] == 0, :3] = 0
            name = f"ring_{len(rings)}.webp"
            cv2.imwrite(os.path.join(OUT_DIR, name), out, [cv2.IMWRITE_WEBP_QUALITY, WEBP_Q])
            rings.append({"file": f"ui/{name}", "w": ww, "h": hh, "stroke": round(stroke, 1),
                          "cx": round(ecx / ww, 3), "cy": round(ecy / hh, 3),
                          "start": round(start, 3), "dir": d})
            print(f"{os.path.basename(sheet)} → {name}: {ww}×{hh}, tỉ lệ {ww / hh:.2f}, nét {stroke:.1f} px")
    json.dump(rings, open(OUT_JSON, "w", encoding="utf8"), indent=1)
    print("→", OUT_JSON, len(rings), "vòng")


if __name__ == "__main__":
    main()
