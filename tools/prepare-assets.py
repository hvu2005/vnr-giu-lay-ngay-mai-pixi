"""
Dựng asset game từ cặp ảnh Gemini của từng scene.

    python -I tools/prepare-assets.py            # mọi scene có trong art/scenes.json
    python -I tools/prepare-assets.py s03 s05    # chỉ dựng lại vài scene

Đầu vào (art/gemini/):
    sNN_master.png   ảnh hoàn chỉnh, có đủ 6 vật tương tác
    sNN_clean.png    cùng ảnh, Gemini đã XOÁ những vật sẽ chuyển động (người,
                     cờ…) và vẽ lại nền phía sau chúng
Cấu hình (art/scenes.json): mỗi vật một cách cắt, toạ độ là PIXEL THIẾT KẾ 1376×768.

Đầu ra:
    src/drop-assets-in-me/sNN/bg.webp           nền = ảnh clean (đã xoá dấu ✦ Gemini)
    src/drop-assets-in-me/sNN/prop_<key>.webp   vật tương tác, có alpha
    src/drop-assets-in-me/sNN/actor_<k>.webp    nhân vật nền (không tương tác, chỉ idle)
    src/scripts/_game/data/layout.generated.json

── VÌ SAO DÙNG CẶP MASTER / CLEAN ─────────────────────────────────────────────

Project tham khảo (di-tim-con-duong) cắt vật bằng GrabCut rồi inpaint chỗ trống
bằng OpenCV — vùng inpaint nhoè, nên vật idle (thở, nhấp nhô) lộ quầng mờ
quanh mình. Ở đây Gemini tự vẽ lại nền phía sau (bản clean) với phối cảnh và
ánh sáng đúng, nên:

  · `diff`: mặt nạ vật = chỗ master khác clean. Bám đúng hình vật (kể cả bóng
            đổ của nó), không cần khai viền tay. Vật cắt TỪ MASTER.
  · `grab` / `poly` / `rect`: vật ĐỨNG YÊN (chiến lũy, hầm, cổng…) — còn
            nguyên trong clean, cắt TỪ CLEAN để sprite trùng khít từng pixel
            với nền bên dưới (không lệch màu ở mép khi viền vàng bật/tắt).

Vật đứng yên không cần nền phía sau: sprite đè đúng lên chính nó.

── TỈ LỆ ẢNH ───────────────────────────────────────────────────────────────────

Gemini trả 2752×1536. Game thiết kế 1376×768 (toạ độ mọi thứ), nhưng ảnh xuất
ở ART_SCALE = 1.5 (2064×1152) — màn PC 1920×1080 kéo khung lên ~1.4 lần, ảnh
1376 sẽ mờ. Sprite trong game đặt `scale = 1 / ART_SCALE`.
"""
import json
import os
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sam  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = os.path.join(ROOT, "art", "gemini")
CFG = os.path.join(ROOT, "art", "scenes.json")
OUT_ASSETS = os.path.join(ROOT, "src", "drop-assets-in-me")
OUT_LAYOUT = os.path.join(ROOT, "src", "scripts", "_game", "data", "layout.generated.json")
DEBUG = os.path.join(ROOT, "art", "debug")

W, H = 1376, 768
ART_SCALE = 1.5
AW, AH = int(W * ART_SCALE), int(H * ART_SCALE)

WEBP_BG = 86
WEBP_PROP = 90

# Dấu ✦ Gemini ở góc phải dưới (toạ độ thiết kế) — có ở cả master lẫn clean.
# Ảnh 1376×768 (Gemini bản thường) đặt dấu ở chỗ khác: khai `watermark` riêng.
WATERMARK = [1290, 680, 1352, 742]

# Ngưỡng khác biệt master↔clean (0–255, kênh lớn nhất). Gemini vẽ lại cả ảnh
# khi sửa nên nền "giống" vẫn lệch vài đơn vị ở mọi pixel — dưới 28 là nhiễu.
DIFF_THRESHOLD = 28

# Bán kính (px ảnh xuất) dải mép mà snap_edges được phép dời mép mặt nạ về nét
# mực. Lớn hơn thì sửa được mặt nạ lệch xa hơn nhưng dễ nhảy sang nét của vật
# bên cạnh; `snap` trong scenes.json đổi riêng từng vật, 0 = tắt.
SNAP = 30


def to_art(v):
    return int(round(v * ART_SCALE))


def load(path):
    img = cv2.imread(path, cv2.IMREAD_COLOR)
    if img is None:
        raise FileNotFoundError(path)
    # Gemini bản thường (hết gói Pro) trả 1376×768 — phóng lên thì Lanczos,
    # INTER_AREA chỉ hợp khi thu nhỏ từ 2752×1536.
    up = img.shape[1] < AW
    return cv2.resize(img, (AW, AH), interpolation=cv2.INTER_LANCZOS4 if up else cv2.INTER_AREA)


def rect_art(r):
    x0, y0, x1, y1 = r
    return max(0, to_art(x0)), max(0, to_art(y0)), min(AW, to_art(x1)), min(AH, to_art(y1))


def poly_mask(poly):
    m = np.zeros((AH, AW), np.uint8)
    pts = np.array([[to_art(x), to_art(y)] for x, y in poly], np.int32)
    cv2.fillPoly(m, [pts], 255)
    return m


def poly_limit(spec):
    """Hợp các `poly` / `polys` của một vật, nới thêm `pad` px thiết kế."""
    m = np.zeros((AH, AW), np.uint8)
    for p in [spec["poly"]] if "poly" in spec else spec["polys"]:
        m |= poly_mask(p)
    pad = to_art(spec.get("pad", 0))
    if pad:
        m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * pad + 1,) * 2))
    return m


def fill_holes(m):
    """Lấp lỗ bên trong mặt nạ (áo trắng trùng màu nền → diff bị thủng)."""
    h, w = m.shape
    flood = m.copy()
    pad = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(flood, pad, (0, 0), 255)
    return m | cv2.bitwise_not(flood)


def keep_big(m, min_frac):
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m, 8)
    if n <= 1:
        return m
    biggest = stats[1:, cv2.CC_STAT_AREA].max()
    out = np.zeros_like(m)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] >= biggest * min_frac:
            out[lab == i] = 255
    return out


def mask_diff(master, clean, spec):
    """Mặt nạ = vùng master khác clean, trong khung `rect` (± `poly` giới hạn)."""
    x0, y0, x1, y1 = rect_art(spec["rect"])
    d = cv2.absdiff(master, clean).max(axis=2)
    d = cv2.GaussianBlur(d, (5, 5), 0)
    m = np.zeros((AH, AW), np.uint8)
    thr = spec.get("thr", DIFF_THRESHOLD)
    m[y0:y1, x0:x1] = (d[y0:y1, x0:x1] > thr).astype(np.uint8) * 255
    if "poly" in spec:
        m &= poly_mask(spec["poly"])
    if "polys" in spec:
        u = np.zeros_like(m)
        for p in spec["polys"]:
            u |= poly_mask(p)
        m &= u
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    m = keep_big(m, spec.get("min_frac", 0.04))
    m = fill_holes(m)
    # `cut`: polygon bỏ khỏi mặt nạ (vd. chân cột đèn lọt vào khung của người).
    for p in spec.get("cut", []):
        m &= cv2.bitwise_not(poly_mask(p))
    return m


def _wm_mask(img, cfg):
    """Vùng xoá dấu ✦. Ảnh cũ: cả khung WATERMARK. Ảnh 1376×768 khai
    `watermark` riêng và chỉ xoá đúng các pixel sáng của dấu: dấu nằm sát mép
    bàn gỗ (S04), inpaint cả khung kéo màu gỗ xuống nỉ xanh thành vệt tối."""
    if "watermark" not in cfg:
        return _rect_mask(WATERMARK)
    box = _rect_mask(cfg["watermark"])
    # Dấu bán trong suốt: trên khói tối (S03) chỉ sáng ~150–177 → so với nền
    # quanh nó (median rộng hơn dấu) thay vì một ngưỡng tuyệt đối.
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.int16)
    around = cv2.medianBlur(g.astype(np.uint8), to_art(60) | 1).astype(np.int16)
    bright = ((g > 165) | (g > around + 30)).astype(np.uint8) * 255
    return cv2.dilate(box & bright, np.ones((7, 7), np.uint8))


def _rect_mask(r):
    m = np.zeros((AH, AW), np.uint8)
    x0, y0, x1, y1 = rect_art(r)
    m[y0:y1, x0:x1] = 255
    return m


def mask_grab(img, spec):
    """GrabCut trong khung `rect`; `fg` / `bg` = polygon chắc chắn là vật / nền."""
    x0, y0, x1, y1 = rect_art(spec["rect"])
    gc = np.full((AH, AW), cv2.GC_BGD, np.uint8)
    gc[y0:y1, x0:x1] = cv2.GC_PR_FGD
    if "poly" in spec:
        pm = poly_mask(spec["poly"])
        gc[(pm == 0)] = cv2.GC_BGD
    for p in spec.get("fg", []):
        gc[poly_mask(p) > 0] = cv2.GC_FGD
    for p in spec.get("bg", []):
        gc[poly_mask(p) > 0] = cv2.GC_BGD
    pad = 20
    cx0, cy0, cx1, cy1 = max(0, x0 - pad), max(0, y0 - pad), min(AW, x1 + pad), min(AH, y1 + pad)
    sub = gc[cy0:cy1, cx0:cx1].copy()
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    cv2.grabCut(np.ascontiguousarray(img[cy0:cy1, cx0:cx1]), sub, None, bgd, fgd, 6, cv2.GC_INIT_WITH_MASK)
    m = np.zeros((AH, AW), np.uint8)
    m[cy0:cy1, cx0:cx1] = np.where((sub == cv2.GC_FGD) | (sub == cv2.GC_PR_FGD), 255, 0)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    m = keep_big(m, spec.get("min_frac", 0.1))
    return fill_holes(m)


def refine_grab(img, seed, spec):
    """GrabCut lấy mặt nạ diff làm hạt giống: lõi diff = chắc chắn vật, vành
    quanh diff = có thể là vật, phần còn lại của khung = có thể là nền, ngoài
    khung = nền. Diff ở cảnh tối/sương bị thủng và lem ra đất; GrabCut kéo mép
    về đúng biên màu của vật."""
    x0, y0, x1, y1 = rect_art(spec["rect"])
    gc = np.full((AH, AW), cv2.GC_BGD, np.uint8)
    gc[y0:y1, x0:x1] = cv2.GC_PR_BGD
    k = spec.get("band", 9)
    near = cv2.dilate(seed, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k * 2 + 1,) * 2))
    core = cv2.erode(seed, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    gc[(near > 0) & (gc == cv2.GC_PR_BGD)] = cv2.GC_PR_FGD
    gc[core > 0] = cv2.GC_FGD
    if "poly" in spec:
        gc[poly_mask(spec["poly"]) == 0] = cv2.GC_BGD
    if "polys" in spec:
        u = np.zeros((AH, AW), np.uint8)
        for p in spec["polys"]:
            u |= poly_mask(p)
        gc[u == 0] = cv2.GC_BGD
    # Cắt khung con quanh rect cho nhanh (GrabCut trên ảnh 2064×1152 rất chậm).
    pad = 20
    cx0, cy0, cx1, cy1 = max(0, x0 - pad), max(0, y0 - pad), min(AW, x1 + pad), min(AH, y1 + pad)
    sub = gc[cy0:cy1, cx0:cx1].copy()
    if not (sub == cv2.GC_FGD).any() and not (sub == cv2.GC_PR_FGD).any():
        return seed
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    cv2.grabCut(np.ascontiguousarray(img[cy0:cy1, cx0:cx1]), sub, None, bgd, fgd, 5, cv2.GC_INIT_WITH_MASK)
    out = np.zeros((AH, AW), np.uint8)
    out[cy0:cy1, cx0:cx1] = np.where((sub == cv2.GC_FGD) | (sub == cv2.GC_PR_FGD), 255, 0)
    out = cv2.morphologyEx(out, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    out = keep_big(out, spec.get("min_frac", 0.04))
    return fill_holes(out)


def split_shadow(master, clean, mask, top=0.78):
    """Tách bóng đổ khỏi thân vật trong mặt nạ diff.

    Bóng = pixel master TỐI HƠN clean nhưng cùng sắc (kênh a/b của Lab gần
    như giữ nguyên) — mặt đất bị che sáng chứ không đổi màu. Tách ra để:
      · viền vàng chỉ ôm thân người/vật, không ôm vệt bóng trên đất;
      · người "thở" (co giãn) mà bóng vẫn nằm yên dưới chân.
    """
    lm = cv2.cvtColor(master, cv2.COLOR_BGR2LAB).astype(np.int16)
    lc = cv2.cvtColor(clean, cv2.COLOR_BGR2LAB).astype(np.int16)
    dl = lc[:, :, 0] - lm[:, :, 0]
    da = np.abs(lc[:, :, 1] - lm[:, :, 1])
    db = np.abs(lc[:, :, 2] - lm[:, :, 2])
    # Bóng giữ phần lớn độ "ngả màu" của nền (cát vàng → cát vàng sẫm); quần
    # xám đứng trên sàn vàng thì mất hẳn sắc → không phải bóng.
    chroma_m = np.hypot(lm[:, :, 1] - 128, lm[:, :, 2] - 128)
    chroma_c = np.hypot(lc[:, :, 1] - 128, lc[:, :, 2] - 128)
    keeps_hue = chroma_m >= 0.45 * chroma_c
    shade = ((dl > 10) & (da < 10) & (db < 24) & (lm[:, :, 0] > 60) & keeps_hue).astype(np.uint8) * 255
    shade &= mask
    # Bóng đổ nằm trên mặt đất quanh chân — chỉ xét dải dưới cùng của vật.
    # Không giới hạn thì áo kaki trong bóng râm (cùng sắc với nền đất) cũng bị
    # coi là bóng và thân người thủng lỗ.
    # `top` (= `shadow_top` trong scenes.json): nhóm nhiều người đứng so le
    # thì bóng của người phía sau nằm cao hơn dải dưới cùng → hạ xuống.
    ys = np.where(mask.any(axis=1))[0]
    if len(ys):
        y_top, y_bot = ys.min(), ys.max()
        shade[: int(y_top + (y_bot - y_top) * top)] = 0
    shade = cv2.morphologyEx(shade, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    body = cv2.subtract(mask, shade)
    body = cv2.morphologyEx(body, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    body = keep_big(body, 0.04)
    body = fill_holes(body)
    shadow = cv2.subtract(mask, body)
    shadow = cv2.morphologyEx(shadow, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    return body, shadow


def elevation(img):
    """Bản đồ "độ cao" cho snap_edges: cao ở nét mực (vạch tối mảnh — tranh vẽ
    mực nâu viền mọi vật) và ở chỗ đổi màu gắt. Trả (độ cao, nét mực) 0..1."""
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    ink = cv2.morphologyEx(lab[:, :, 0], cv2.MORPH_BLACKHAT,
                           cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))).astype(np.float32)
    g = np.zeros(ink.shape, np.float32)
    for c in range(3):
        ch = cv2.GaussianBlur(lab[:, :, c], (3, 3), 0).astype(np.float32)
        g = np.maximum(g, cv2.magnitude(cv2.Sobel(ch, cv2.CV_32F, 1, 0), cv2.Sobel(ch, cv2.CV_32F, 0, 1)))
    ink = np.clip(ink / max(1.0, float(np.percentile(ink, 99.5))), 0, 1)
    g = np.clip(g / max(1.0, float(np.percentile(g, 99.5))), 0, 1)
    return 0.6 * ink + 0.4 * g, ink


def snap_edges(elev, ink, mask, r, keep=None):
    """Kéo mép mặt nạ về đúng nét viền của vật trong tranh.

    Mặt nạ diff/bare chỉ biết "chỗ Gemini vẽ khác đi" — Gemini vẽ lại cả đất,
    bóng, người nền sát vật nên mép mặt nạ lệch khỏi nét mực vài đến chục px,
    và viền vàng (bám mép alpha) trôi lơ lửng ngoài vật. Watershed có hạt giống:
    lõi mặt nạ (cách mép > r) = vật, ngoài mặt nạ nới r = nền, dải 2r ở giữa
    được hai phía cùng "ngập" dần theo độ cao — hai bên gặp nhau ở sống cao
    nhất, tức nét mực viền vật. Cuối cùng nuốt luôn nửa ngoài nét mực để viền
    vàng nằm sát ngoài nét vẽ chứ không cắt đôi nét."""
    import heapq
    if r <= 0 or not mask.any():
        return mask
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1,) * 2)
    outer = cv2.dilate(mask, k)
    ys, xs = np.where(outer > 0)
    y0, y1 = max(0, ys.min() - 2), min(AH, ys.max() + 3)
    x0, x1 = max(0, xs.min() - 2), min(AW, xs.max() + 3)
    m = mask[y0:y1, x0:x1]
    e = elev[y0:y1, x0:x1]
    # Hạt giống "vật": lõi cách mép > r. Mảnh mảnh (cán cờ, chân micro) không
    # có lõi nào dày r → lấy nửa bề dày của chính mảnh đó.
    dt = cv2.distanceTransform(m, cv2.DIST_L2, 5)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m, 8)
    lbl = np.zeros(m.shape, np.int32)
    lbl[outer[y0:y1, x0:x1] == 0] = 2
    for i in range(1, n):
        comp = lab == i
        t = min(r, max(1.0, 0.5 * float(dt[comp].max())))
        lbl[comp & (dt > t)] = 1
    # Cán cờ / chân micro dính vào thân lớn: chính nó là một vạch tối (= "sống"
    # cao) nên lũ từ thân không leo vào được → giữ đường tâm của mọi phần mảnh
    # (nửa bề dày ≤ 6 px) làm hạt giống vật.
    ridge = (dt >= 1.5) & (dt <= 6) & (dt >= cv2.dilate(dt, np.ones((3, 3), np.uint8)))
    lbl[ridge] = 1
    # `keep`: vùng khai tay chắc chắn là vật (tóc tối sát cửa tối — nền tràn
    # qua mép mờ trước khi lũ từ thân vượt nét cổ áo).
    if keep is not None:
        lbl[(keep[y0:y1, x0:x1] > 0) & (m > 0)] = 1
    h, w = lbl.shape
    heap = []
    cnt = 0
    nb = ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1))
    seeds = np.argwhere((lbl > 0) & (cv2.dilate((lbl == 0).astype(np.uint8), np.ones((3, 3), np.uint8)) > 0))
    for y, x in seeds:
        for dy, dx in nb:
            yy, xx = y + dy, x + dx
            if 0 <= yy < h and 0 <= xx < w and lbl[yy, xx] == 0:
                heapq.heappush(heap, (e[yy, xx], cnt, yy, xx, lbl[y, x]))
                cnt += 1
    while heap:
        _, _, y, x, l = heapq.heappop(heap)
        if lbl[y, x]:
            continue
        lbl[y, x] = l
        for dy, dx in nb:
            yy, xx = y + dy, x + dx
            if 0 <= yy < h and 0 <= xx < w and lbl[yy, xx] == 0:
                heapq.heappush(heap, (e[yy, xx], cnt, yy, xx, l))
                cnt += 1
    fg = (lbl == 1).astype(np.uint8) * 255
    # Hai phía gặp nhau ở GIỮA nét mực → nuốt nốt nửa ngoài của nét.
    line = ((ink[y0:y1, x0:x1] > 0.22) & (outer[y0:y1, x0:x1] > 0)).astype(np.uint8) * 255
    for _ in range(3):
        fg |= cv2.dilate(fg, np.ones((3, 3), np.uint8)) & line
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    out = np.zeros_like(mask)
    out[y0:y1, x0:x1] = fill_holes(fg)
    return out


def build_mask(master, clean, spec, bare=None):
    mode = spec["mode"]
    if spec.get("whole"):
        # Diff không dùng được: Gemini vẽ người KHÁC vào chỗ vừa xoá (S04 đoàn
        # VN), hoặc bản bare chỉ xoá nửa vật (chân ghế S06). Lấy nguyên đa giác
        # (pixel master nếu là vật chuyển động), snap_edges kéo mép về nét mực.
        return poly_limit(spec), master if mode == "diff" else clean
    if mode == "diff":
        m = mask_diff(master, clean, spec)
        # Cảnh tối: quần áo sẫm trên nền sẫm → diff thủng lỗ. `refine` cho
        # GrabCut trên master kéo mép về đúng biên màu của người.
        if spec.get("refine"):
            m = refine_grab(master, m, spec)
        return m, master
    if mode == "bare":
        # Vật đứng yên: Gemini xoá nốt chúng ở bản `bare` → mặt nạ = clean ≠ bare,
        # pixel lấy từ clean (chính là nền) nên sprite trùng khít nền.
        if bare is None:
            raise ValueError("thiếu ảnh _bare cho mode bare")
        m = mask_diff(clean, bare, spec)
        if spec.get("refine", True):
            m = refine_grab(clean, m, spec)
        return m, clean
    src = clean
    if mode == "grab":
        return mask_grab(src, spec), src
    if mode == "poly":
        return poly_limit(spec), src
    if mode == "rect":
        return _rect_mask(spec["rect"]), src
    raise ValueError(mode)


def cut(img, mask, grow=2, feather=1.6):
    """Ảnh BGRA cắt theo bbox mặt nạ; mép mềm vài px để viền không răng cưa."""
    if grow:
        mask = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (grow * 2 + 1,) * 2))
    alpha = cv2.GaussianBlur(mask, (0, 0), feather) if feather else mask
    ys, xs = np.where(alpha > 8)
    if len(xs) == 0:
        raise ValueError("mặt nạ rỗng")
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    bgra = cv2.cvtColor(img[y0:y1, x0:x1], cv2.COLOR_BGR2BGRA)
    bgra[:, :, 3] = alpha[y0:y1, x0:x1]
    # Pixel trong suốt hẳn vẫn mang màu master → WebP vẫn mã hoá: ảnh phần dư
    # chỉ một viền mỏng mà nặng 40 KB. Xoá màu chỗ alpha = 0.
    bgra[bgra[:, :, 3] == 0, :3] = 0
    return bgra, (x0, y0, x1 - x0, y1 - y0)


def refine_sam(name, spec, mask, img, master, clean):
    """
    Mặt nạ cuối bám HÌNH VẼ của vật (MobileSAM, tools/sam.py) thay vì vùng
    diff / bare / đa giác — các vùng đó ăn cả mảng nền Gemini vẽ lại quanh vật,
    viền vàng và thẻ tư liệu lộ ra tường, sàn, đầu đám đông bị cắt thẳng.

    `sam` trong scenes.json: false = bỏ qua (vật là mặt đất — lối mòn, đường,
    hào — không có nét viền để SAM bám); hoặc {boxes: [[x0,y0,x1,y1]…] px thiết
    kế, pos / neg: [[x,y]…] điểm thuộc / không thuộc vật, pick: đầu ra decoder
    0–3, margin, reach: px thiết kế SAM được vượt ra ngoài mặt nạ cũ (mặc định
    8)}. Không khai `boxes` thì mỗi đa giác `poly` / `polys` là một khung (vật
    nhiều mảnh: hai cánh cổng, cổng hai trụ), không có đa giác thì một khung
    bao cả mặt nạ cũ. SAM chạy riêng từng khung rồi gộp.

    Vật chuyển động (diff) lấy pixel master, nền clean KHÔNG có nó: phần SAM bỏ
    sót mà master khác hẳn clean, nằm sát mép SAM, được giữ lại — không thì
    phần đó (tay, mũ) biến mất trong cảnh.
    """
    opt = spec.get("sam", {})
    if opt is False or not sam.available():
        return mask
    ys, xs = np.where(mask > 0)
    if len(xs) == 0:
        return mask
    if "boxes" in opt:
        boxes = [[to_art(v) for v in b] for b in opt["boxes"]]
    elif "poly" in spec or "polys" in spec:
        boxes = []
        for p in [spec["poly"]] if "poly" in spec else spec["polys"]:
            a = np.array([[to_art(x), to_art(y)] for x, y in p])
            boxes.append([a[:, 0].min(), a[:, 1].min(), a[:, 0].max(), a[:, 1].max()])
    else:
        boxes = [[xs.min(), ys.min(), xs.max() + 1, ys.max() + 1]]
    m = np.zeros_like(mask)
    clip = opt.get("clip")
    for box in boxes:
        inside = lambda x, y: box[0] <= x <= box[2] and box[1] <= y <= box[3]  # noqa: E731
        pos = [(to_art(x), to_art(y)) for x, y in opt.get("pos", []) if inside(to_art(x), to_art(y))]
        neg = [(to_art(x), to_art(y)) for x, y in opt.get("neg", []) if inside(to_art(x), to_art(y))]
        one = sam.segment(img, box, pos, neg, opt.get("margin", 0.25), opt.get("pick"))
        if clip is not None:
            # `clip`: px thiết kế SAM được tràn ra ngoài khung — đám đông dày
            # (S01 đoàn dự lễ) SAM hay ôm cả đầu người hàng sau sang khung bên.
            c = to_art(clip)
            r = np.zeros_like(one)
            r[max(0, box[1] - c):box[3] + c, max(0, box[0] - c):box[2] + c] = 255
            one = keep_big(one & r, 0.2)
        m |= one
    if opt.get("close"):
        # `close`: px thiết kế — gộp nhiều khung (từng người một) thành MỘT khối
        # liền, viền vàng chạy quanh cả đoàn thay vì luồn vào khe giữa từng thân.
        k = to_art(opt["close"]) | 1
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    reach = to_art(opt.get("reach", 8))
    limit = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * reach + 1,) * 2)) if reach >= 0 else 255
    m &= limit
    # `strict`: KHÔNG kéo lại phần diff mạnh sát mép SAM. Chỗ đó với cờ / đám
    # đông S01 là người phía sau Gemini vẽ lại — kéo vào là viền răng cưa ôm
    # đầu người nền. Phần bỏ ra vẫn hiện qua ảnh phần dư `rest_<id>`.
    if spec["mode"] == "diff" and not opt.get("strict"):
        d = cv2.GaussianBlur(cv2.absdiff(master, clean).max(axis=2), (5, 5), 0)
        strong = (d > 2 * spec.get("thr", DIFF_THRESHOLD)).astype(np.uint8) * 255
        near = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (to_art(6) * 2 + 1,) * 2))
        m |= mask & strong & near
    m = keep_big(m, 0.02)
    if spec["mode"] == "diff":
        m = fill_holes(m)
    else:
        # Vật đứng yên lấy pixel nền CLEAN: lấp lỗ (cửa hầm S03, sảnh Dinh S10
        # — viền vàng chui vào lòng cửa) trừ chỗ có vật chuyển động phía sau
        # (master ≠ clean). Lấp cả lòng quai giỏ S01 bằng nền clean là đè mất
        # chân đám đông phía sau thành một quầng đất sáng.
        d = cv2.GaussianBlur(cv2.absdiff(master, clean).max(axis=2), (5, 5), 0)
        moving = (d > DIFF_THRESHOLD).astype(np.uint8) * 255
        m |= fill_holes(m) & cv2.bitwise_not(moving)
        # Và không phủ lên chỗ master khác hẳn clean (người / cờ đang lộ ra ở
        # đó): sprite đứng yên mang pixel clean — không người — đè lên là
        # đám đông mất chân sau giỏ S01. Mở hình 5×5 để nhiễu vẽ lại của
        # Gemini không khoét lỗ lấm tấm vào vật. Chỉ ở dải MÉP (14 px thiết
        # kế): lõi vật có thể khác thật giữa hai bản (lịch S07: master có chữ
        # "Tết 1968", clean là trang trắng) — khoét lõi là thủng viền vàng.
        strong = cv2.morphologyEx((d > 2 * DIFF_THRESHOLD).astype(np.uint8) * 255, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
        core = cv2.erode(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (to_art(14) * 2 + 1,) * 2))
        m &= cv2.bitwise_not(strong & cv2.bitwise_not(core))
        m = keep_big(m, 0.02)
    if cv2.countNonZero(m) < 0.15 * cv2.countNonZero(mask):
        print(f"  ⚠ {name}: SAM chỉ giữ {100 * cv2.countNonZero(m) / cv2.countNonZero(mask):.0f}% mặt nạ cũ — soi lại")
    return m


def white_fg(img, tight=False):
    """
    Mặt nạ vật trên ảnh Gemini nền trắng phẳng. Nền = vùng gần trắng ít bão hoà
    NỐI VỚI MÉP ảnh (loang từ mép) — áo trắng / giấy trắng nằm trong nét mực
    không bị khoét.

    `tight` (`iso_tight` trong scenes.json): vật là giấy màu kem (bảng tên S04,
    min kênh ~232, bão hoà ~17) — ngưỡng thường coi là nền rồi loang vào qua
    khe nét mực hở. Nền Gemini thật bão hoà 0, ≥ 249 → siết ngưỡng.
    """
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    lo, sat = (244, 8) if tight else (228, 28)
    whiteish = ((img.min(axis=2) > lo) & (hsv[:, :, 1] < sat)).astype(np.uint8)
    n, lab = cv2.connectedComponents(whiteish, connectivity=4)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge)).astype(np.uint8) * 255
    # Nền lọt vào trong nét mực (khe giữa chân đoàn người, lòng quai giỏ S01):
    # trắng TINH như nền (Gemini ≥ 249) và đủ rộng — áo trắng, râu, giấy đều có
    # tô bóng nên không lọt ngưỡng này.
    strict = ((img.min(axis=2) > 244) & (hsv[:, :, 1] < 12)).astype(np.uint8)
    n2, lab2, st2, _ = cv2.connectedComponentsWithStats(strict, connectivity=4)
    for i in range(1, n2):
        if st2[i, cv2.CC_STAT_AREA] >= 150:
            bg[lab2 == i] = 255
    fg = keep_big(cv2.bitwise_not(bg), 0.02)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    return fg


ISO_LONG = 640  # cạnh dài ảnh isolate (px) — thẻ tư liệu 330 px, bộ sưu tập ~260


def isolate_asset(key, pkey, flip=False, tight=False):
    """
    Bản isolate của một vật: Gemini vẽ lại riêng vật đó, ĐỦ HÌNH (phần bị che
    trong cảnh được vẽ bù — cờ đủ cán không tay, Bác đủ chân) trên nền trắng
    phẳng → `art/gemini/<key>_iso_<id>.png`. Dùng cho thanh dưới, thẻ tư liệu,
    bộ sưu tập (sprite cắt từ cảnh đứng một mình lộ khúc cụt, mép răng cưa).

    Nền = vùng gần trắng ít bão hoà NỐI VỚI MÉP ảnh (loang từ mép) — áo trắng /
    giấy trắng nằm trong nét mực không bị khoét. Trả (file, w, h) hoặc None.
    """
    path = os.path.join(SRC, f"{key}_iso_{pkey}.png")
    if not os.path.exists(path):
        return None
    img = cv2.imread(path, cv2.IMREAD_COLOR)
    if flip:
        # `iso_flip`: Gemini vẽ ngược chiều cảnh (cờ S01: cán bên trái, vải bay
        # phải — trong cảnh cán bên phải) → lật ngang cho thẻ khớp với cảnh.
        img = cv2.flip(img, 1)
    fg = white_fg(img, tight)
    ys, xs = np.where(fg > 0)
    if len(xs) == 0:
        print(f"  ⚠ {key} iso {pkey}: không tách được nền")
        return None
    pad = 6
    x0, y0 = max(0, xs.min() - pad), max(0, ys.min() - pad)
    x1, y1 = min(img.shape[1], xs.max() + 1 + pad), min(img.shape[0], ys.max() + 1 + pad)
    alpha = cv2.GaussianBlur(cv2.erode(fg, np.ones((3, 3), np.uint8)), (0, 0), 1.0)
    bgra = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    bgra[:, :, 3] = alpha
    bgra = bgra[y0:y1, x0:x1]
    s = min(1.0, ISO_LONG / max(bgra.shape[:2]))
    if s < 1:
        bgra = cv2.resize(bgra, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
    bgra[bgra[:, :, 3] == 0, :3] = 0
    file = f"{key}/iso_{pkey}.webp"
    save_webp(os.path.join(OUT_ASSETS, file), bgra, WEBP_PROP)
    return file, bgra.shape[1], bgra.shape[0]


def save_webp(path, img, q):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    cv2.imwrite(path, img, [cv2.IMWRITE_WEBP_QUALITY, q])


def build_scene(key, cfg):
    master = load(os.path.join(SRC, f"{key}_master.png"))
    clean = load(os.path.join(SRC, f"{key}_clean.png"))
    # Dấu ✦ nằm cả trong master: sprite diff (lấy pixel master) đè qua góc phải
    # dưới sẽ mang theo dấu ✦ mà nền đã xoá.
    wm_rect = cfg.get("watermark", WATERMARK)
    master = cv2.inpaint(master, _wm_mask(master, cfg), 9, cv2.INPAINT_TELEA)
    bare_path = os.path.join(SRC, f"{key}_bare.png")
    bare = load(bare_path) if os.path.exists(bare_path) else None

    # ── Nền: clean, xoá dấu ✦ ─────────────────────────────────────────────
    bg = clean.copy()
    wm = _wm_mask(clean, cfg)
    bg = cv2.inpaint(bg, wm, 9, cv2.INPAINT_TELEA)
    for extra in cfg.get("inpaint", []):
        bg = cv2.inpaint(bg, _rect_mask(extra), 9, cv2.INPAINT_TELEA)
    out_dir = os.path.join(OUT_ASSETS, key)
    save_webp(os.path.join(out_dir, "bg.webp"), bg, WEBP_BG)
    # Phần dư `rest_*` chỉ sinh khi cần — xoá bản cũ để asset không còn dùng
    # khỏi bị nhúng vào bundle.
    for f in os.listdir(out_dir):
        if f.startswith(("rest_", "iso_")):
            os.remove(os.path.join(out_dir, f))

    layout = {"bg": f"{key}/bg.webp", "width": W, "height": H, "artScale": ART_SCALE, "props": {}, "actors": []}
    debug = master.copy()
    masks = {}
    elev_cache = {}

    def elev(img):
        if id(img) not in elev_cache:
            elev_cache[id(img)] = elevation(img)
        return elev_cache[id(img)]

    def emit(name, spec):
        # `src`: ảnh bare phụ (sNN_<src>.png) — Gemini xoá riêng vật khó xoá
        # chung một lượt (cột đèn mảnh, hào đất), cùng khung với clean.
        b = load(os.path.join(SRC, f"{key}_{spec['src']}.png")) if "src" in spec else bare
        mask, src = build_mask(master, clean if spec["mode"] in ("diff", "bare") else bg, spec, b)
        if spec["mode"] == "bare":
            src = bg
        # Vật không được ăn vào vùng của vật khác đã khai trước (ràng buộc
        # "không chồng nhau" — xem art/prompts/scenes.md).
        for other in spec.get("exclude", []):
            if other in masks:
                mask &= cv2.bitwise_not(cv2.dilate(masks[other], np.ones((5, 5), np.uint8)))
        shadow = None
        if spec["mode"] == "diff" and spec.get("shadow", True):
            mask, shadow = split_shadow(master, clean, mask, spec.get("shadow_top", 0.78))
            if cv2.countNonZero(shadow) < 400:
                shadow = None
        elif spec["mode"] == "bare" and spec.get("shadow", True) and b is not None:
            # Bóng đổ của vật đứng yên đã nằm sẵn trong nền — chỉ bỏ khỏi mặt
            # nạ để viền vàng không ôm vệt bóng trên đất.
            mask, _ = split_shadow(clean, b, mask)
        # Vật chuyển động (diff) KHÔNG snap mặc định: nền clean dưới nó không
        # có vật, snap lỡ tay là thủng lỗ thật trong game — S06 lũ từ nền nuốt
        # trọn cậu bé cầm mõ, tóc tối trên tán cây tối chỉ cứu lại được lổn
        # nhổn; S03 lính cầm cờ đứt chân. Vật nào cần thì khai `snap` riêng
        # và soi lại từng người (S02 O2, S04 O2, S06 O5, S07 O3).
        r = spec.get("snap", 0 if spec["mode"] == "diff" else SNAP)
        if r:
            keep = None
            if "keep" in spec:
                keep = np.zeros_like(mask)
                for p in spec["keep"]:
                    keep |= poly_mask(p)
            before = mask
            mask = snap_edges(*elev(src), mask, r, keep)
            if spec["mode"] == "diff" and not spec.get("whole"):
                # Vật chuyển động lấy pixel master, nền clean KHÔNG có nó: snap
                # cắt nhầm phần nào (đầu tóc tối trên cửa tối) là phần đó biến
                # mất trong game. Chỉ cho snap bỏ pixel master ≈ clean (bỏ đi
                # không lộ gì); nền Gemini vẽ lại khác hẳn thì khai `poly` tay.
                d = cv2.GaussianBlur(cv2.absdiff(master, clean).max(axis=2), (5, 5), 0)
                mask |= before & (d > spec.get("thr", DIFF_THRESHOLD)).astype(np.uint8) * 255
        if spec.get("close"):
            # `close: [rộng, cao]` px thiết kế — nối lại vật mảnh bị diff đứt
            # quãng (cột đèn S02: bare xoá sót một đoạn thân cột). Nhân dài
            # theo một trục để chỉ nối dọc thân, không lấp khe giữa hai cột.
            kw, kh = (to_art(v) | 1 for v in spec["close"])
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((kh, kw), np.uint8))
        if spec.get("smooth"):
            # Vùng đất (hào, lối mòn) không có nét viền rõ để snap bám: mép răng
            # cưa của diff trông như lỗi cắt → làm tròn thành một mảng liền.
            mask = (cv2.GaussianBlur(mask, (0, 0), spec["smooth"]) > 127).astype(np.uint8) * 255
        def post(m):
            for p in spec.get("add", []):
                # `add`: đa giác ÉP vào mặt nạ — đoạn vật bị vật đứng yên che
                # ngang (lan can trước chân Bác S01) không nằm trong diff.
                m = m | poly_mask(p)
            # Đa giác khai tay là biên CỨNG: snap chỉ được co mép về nét mực,
            # không được bò qua đường cắt ngang đất/bóng (chỗ không có nét nào
            # chặn lũ lại).
            if "poly" in spec or "polys" in spec:
                m = m & poly_limit(spec)
            for p in spec.get("cut", []):
                m = m & cv2.bitwise_not(poly_mask(p))
            for other in spec.get("exclude", []):
                if other in masks:
                    m = m & cv2.bitwise_not(masks[other])
            for p in spec.get("over", []):
                # `over`: đa giác ép vào SAU `cut` — phần vật bị nhân vật nền
                # che mà viền vàng vẫn phải chạy liền qua (cán cờ S01 qua bàn
                # tay người cầm). Pixel master ở đó trùng actor nên không lộ.
                m = m | poly_mask(p)
            return m

        before_sam = mask
        mask = post(refine_sam(name, spec, mask, master if spec["mode"] == "diff" else src, master, clean))
        # ── Phần dư (vật chuyển động) ────────────────────────────────────────
        # Mặt nạ SAM bám đúng hình vật (viền vàng, vùng bấm, nhịp thở theo nó),
        # nhưng nền clean đã XOÁ người: chỗ mặt nạ cũ có mà SAM bỏ (người phía
        # sau đoàn S06, người ngồi ghi chép S08, tay anh bộ đội S08, nền Gemini
        # vẽ lại) phải vẫn hiện, không thì biến mất khỏi cảnh. Xuất thành ảnh
        # tĩnh `rest_<id>` lấy pixel master, vẽ ngay dưới lớp vật — không viền,
        # không bấm được.
        rest = None
        full = mask
        if spec["mode"] == "diff":
            full = post(before_sam) | mask
            # Chỉ chỗ master khác clean thật (nới 3 px cho mép mềm): chỗ giống
            # nhau thì nền đã hiện đúng — mang theo chỉ tốn dung lượng (bản đầu
            # +670 KB cho cả 10 cảnh).
            d = cv2.GaussianBlur(cv2.absdiff(master, clean).max(axis=2), (5, 5), 0)
            differs = cv2.dilate((d > spec.get("thr", DIFF_THRESHOLD)).astype(np.uint8) * 255, np.ones((7, 7), np.uint8))
            # Không lấy vành quanh mép vật (mép mềm của sprite tự hoà vào nền như
            # trước) — vành 4–5 px quanh mọi người chiếm phần lớn dung lượng.
            rest = full & differs & cv2.bitwise_not(cv2.dilate(mask, np.ones((5, 5), np.uint8)))
            rest = cv2.morphologyEx(rest, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
            rest = keep_big(rest, 0.01) if cv2.countNonZero(rest) else rest
            if cv2.countNonZero(rest & cv2.bitwise_not(mask)) < 300:
                rest = None
        # Vật khai sau `exclude` vật này phải né cả phần dư (người đứng trước
        # chiến lũy S02 — kể cả phần không viền).
        masks[name] = full
        img, (x, y, w, h) = cut(src, mask, spec.get("grow", 1 if r else 2), spec.get("feather", 1.2 if r else 1.6))
        box = {"x": round(x / ART_SCALE, 2), "y": round(y / ART_SCALE, 2),
               "w": round(w / ART_SCALE, 2), "h": round(h / ART_SCALE, 2)}
        if rest is not None:
            rimg, (rx, ry, _, _) = cut(master, rest, 1, 1.6)
            rfile = f"{key}/rest_{name}.webp"
            save_webp(os.path.join(OUT_ASSETS, rfile), rimg, WEBP_PROP)
            box["rest"] = {"file": rfile, "x": round(rx / ART_SCALE, 2), "y": round(ry / ART_SCALE, 2)}
        if shadow is not None:
            # Bóng: chỉ giữ độ tối (đen + alpha), nền clean bên dưới tự lộ màu.
            simg, (sx, sy, sw, sh) = cut(master, shadow, 1, 2.5)
            m_crop = master[sy:sy + sh, sx:sx + sw].astype(np.float32)
            c_crop = clean[sy:sy + sh, sx:sx + sw].astype(np.float32)
            dark = np.clip(1 - (m_crop.mean(2) + 1) / (c_crop.mean(2) + 1), 0, 1)
            simg[:, :, :3] = 0
            simg[:, :, 3] = (simg[:, :, 3].astype(np.float32) * dark).astype(np.uint8)
            sfile = f"{key}/shadow_{name}.webp"
            save_webp(os.path.join(OUT_ASSETS, sfile), simg, WEBP_PROP)
            box["shadow"] = {"file": sfile, "x": round(sx / ART_SCALE, 2), "y": round(sy / ART_SCALE, 2)}
        return img, box, mask

    colors = [(0, 255, 255), (255, 0, 255), (0, 255, 0), (255, 128, 0), (0, 128, 255), (255, 255, 255)]
    for i, (pkey, spec) in enumerate(cfg["props"].items()):
        img, box, mask = emit(pkey, spec)
        file = f"{key}/prop_{pkey}.webp"
        save_webp(os.path.join(OUT_ASSETS, file), img, WEBP_PROP)
        layout["props"][pkey] = {"file": file, **box}
        iso = isolate_asset(key, pkey, spec.get("iso_flip", False), spec.get("iso_tight", False))
        if iso:
            layout["props"][pkey]["iso"] = {"file": iso[0], "w": iso[1], "h": iso[2]}
        cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(debug, cnts, -1, colors[i % len(colors)], 3)
        cv2.putText(debug, pkey, (to_art(box["x"]), max(30, to_art(box["y"]) - 8)),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.1, colors[i % len(colors)], 3)

    for k, spec in enumerate(cfg.get("actors", [])):
        img, box, mask = emit(f"actor_{k}", spec)
        file = f"{key}/actor_{k}.webp"
        save_webp(os.path.join(OUT_ASSETS, file), img, WEBP_PROP)
        layout["actors"].append({"file": file, **box})
        cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(debug, cnts, -1, (128, 128, 128), 2)

    # Kiểm tra chồng nhau giữa các vật tương tác — in cảnh báo, không chặn.
    keys = list(cfg["props"].keys())
    for a in range(len(keys)):
        for b in range(a + 1, len(keys)):
            inter = cv2.countNonZero(masks[keys[a]] & masks[keys[b]])
            if inter > 0:
                small = min(cv2.countNonZero(masks[keys[a]]), cv2.countNonZero(masks[keys[b]]))
                print(f"  ⚠ {key}: {keys[a]} ∩ {keys[b]} = {inter} px ({100 * inter / small:.1f}% vật nhỏ)")

    os.makedirs(DEBUG, exist_ok=True)
    cv2.imwrite(os.path.join(DEBUG, f"{key}_cut.jpg"), cv2.resize(debug, (W, H)), [cv2.IMWRITE_JPEG_QUALITY, 82])
    return layout


def main():
    # Console Windows mặc định cp1252 — in "⚠ … ∩ …" là vỡ.
    sys.stdout.reconfigure(encoding="utf-8")
    cfg = json.load(open(CFG, encoding="utf8"))
    only = sys.argv[1:]
    layout = {}
    if os.path.exists(OUT_LAYOUT):
        layout = json.load(open(OUT_LAYOUT, encoding="utf8"))
    for key, sc in cfg.items():
        if key.startswith("_") or (only and key not in only):
            continue
        if not os.path.exists(os.path.join(SRC, f"{key}_clean.png")):
            print(f"{key}: chưa có ảnh — bỏ qua")
            continue
        print(f"{key} …")
        layout[key] = build_scene(key, sc)
    layout = dict(sorted(layout.items()))
    os.makedirs(os.path.dirname(OUT_LAYOUT), exist_ok=True)
    json.dump(layout, open(OUT_LAYOUT, "w", encoding="utf8"), ensure_ascii=False, indent=2)
    print("→", OUT_LAYOUT)


if __name__ == "__main__":
    main()
