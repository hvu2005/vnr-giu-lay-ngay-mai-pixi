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
WATERMARK = [1290, 680, 1352, 742]

# Ngưỡng khác biệt master↔clean (0–255, kênh lớn nhất). Gemini vẽ lại cả ảnh
# khi sửa nên nền "giống" vẫn lệch vài đơn vị ở mọi pixel — dưới 28 là nhiễu.
DIFF_THRESHOLD = 28


def to_art(v):
    return int(round(v * ART_SCALE))


def load(path):
    img = cv2.imread(path, cv2.IMREAD_COLOR)
    if img is None:
        raise FileNotFoundError(path)
    return cv2.resize(img, (AW, AH), interpolation=cv2.INTER_AREA)


def rect_art(r):
    x0, y0, x1, y1 = r
    return max(0, to_art(x0)), max(0, to_art(y0)), min(AW, to_art(x1)), min(AH, to_art(y1))


def poly_mask(poly):
    m = np.zeros((AH, AW), np.uint8)
    pts = np.array([[to_art(x), to_art(y)] for x, y in poly], np.int32)
    cv2.fillPoly(m, [pts], 255)
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


def split_shadow(master, clean, mask):
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
    ys = np.where(mask.any(axis=1))[0]
    if len(ys):
        top, bot = ys.min(), ys.max()
        shade[: int(top + (bot - top) * 0.78)] = 0
    shade = cv2.morphologyEx(shade, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    body = cv2.subtract(mask, shade)
    body = cv2.morphologyEx(body, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    body = keep_big(body, 0.04)
    body = fill_holes(body)
    shadow = cv2.subtract(mask, body)
    shadow = cv2.morphologyEx(shadow, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    return body, shadow


def build_mask(master, clean, spec, bare=None):
    mode = spec["mode"]
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
        return poly_mask(spec["poly"]), src
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
    return bgra, (x0, y0, x1 - x0, y1 - y0)


def save_webp(path, img, q):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    cv2.imwrite(path, img, [cv2.IMWRITE_WEBP_QUALITY, q])


def build_scene(key, cfg):
    master = load(os.path.join(SRC, f"{key}_master.png"))
    clean = load(os.path.join(SRC, f"{key}_clean.png"))
    bare_path = os.path.join(SRC, f"{key}_bare.png")
    bare = load(bare_path) if os.path.exists(bare_path) else None

    # ── Nền: clean, xoá dấu ✦ ─────────────────────────────────────────────
    bg = clean.copy()
    wm = _rect_mask(WATERMARK)
    bg = cv2.inpaint(bg, wm, 9, cv2.INPAINT_TELEA)
    for extra in cfg.get("inpaint", []):
        bg = cv2.inpaint(bg, _rect_mask(extra), 9, cv2.INPAINT_TELEA)
    out_dir = os.path.join(OUT_ASSETS, key)
    save_webp(os.path.join(out_dir, "bg.webp"), bg, WEBP_BG)

    layout = {"bg": f"{key}/bg.webp", "width": W, "height": H, "artScale": ART_SCALE, "props": {}, "actors": []}
    debug = master.copy()
    masks = {}

    def emit(name, spec):
        mask, src = build_mask(master, clean if spec["mode"] in ("diff", "bare") else bg, spec, bare)
        if spec["mode"] == "bare":
            src = bg
        # Vật không được ăn vào vùng của vật khác đã khai trước (ràng buộc
        # "không chồng nhau" — xem art/prompts/scenes.md).
        for other in spec.get("exclude", []):
            if other in masks:
                mask &= cv2.bitwise_not(cv2.dilate(masks[other], np.ones((5, 5), np.uint8)))
        shadow = None
        if spec["mode"] == "diff" and spec.get("shadow", True):
            mask, shadow = split_shadow(master, clean, mask)
            if cv2.countNonZero(shadow) < 400:
                shadow = None
        masks[name] = mask
        img, (x, y, w, h) = cut(src, mask, spec.get("grow", 2), spec.get("feather", 1.6))
        box = {"x": round(x / ART_SCALE, 2), "y": round(y / ART_SCALE, 2),
               "w": round(w / ART_SCALE, 2), "h": round(h / ART_SCALE, 2)}
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
