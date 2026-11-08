"""
MobileSAM (ONNX) cho prepare-assets.py — tách đúng hình một vật từ khung gợi ý.

Mặt nạ diff / bare / đa giác tay ăn lan ra nền quanh vật (Gemini vẽ lại cả vùng
xung quanh khi xoá), nên viền vàng ôm cả mảng tường, sàn, cắt ngang đầu đám
đông. SAM nhìn chính hình vẽ: cho khung bao (+ điểm dương / âm nếu cần) là trả
mặt nạ bám nét mực của vật.

Model (không commit, ~45 MB) ở art/models/:
    mobile_sam_encoder.onnx  ← huggingface.co/Acly/MobileSAM  mobile_sam_image_encoder.onnx
    mobile_sam_decoder.onnx  ← huggingface.co/Acly/MobileSAM  sam_mask_decoder_multi.onnx
Cần `pip install onnxruntime`.

Chạy SAM trên VÙNG CẮT quanh vật (không phải cả cảnh): encoder thu ảnh về cạnh
dài 1024, cả cảnh 2064 px thì vật nhỏ (lịch, micro) chỉ còn vài chục px.
"""
import os

import cv2
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MODELS = os.path.join(ROOT, "art", "models")
LONG = 1024

_sessions = None


def _load():
    global _sessions
    if _sessions is None:
        import onnxruntime as ort
        opt = ort.SessionOptions()
        opt.log_severity_level = 3
        enc = ort.InferenceSession(os.path.join(MODELS, "mobile_sam_encoder.onnx"), opt)
        dec = ort.InferenceSession(os.path.join(MODELS, "mobile_sam_decoder.onnx"), opt)
        _sessions = (enc, dec)
    return _sessions


def available():
    return all(os.path.exists(os.path.join(MODELS, f)) for f in
               ("mobile_sam_encoder.onnx", "mobile_sam_decoder.onnx"))


def segment(img_bgr, box, pos=(), neg=(), margin=0.25, pick=None):
    """
    Mặt nạ (uint8 0/255, cùng cỡ `img_bgr`) của vật trong `box` = [x0, y0, x1, y1]
    (px của `img_bgr`). `pos` / `neg`: điểm (px ảnh) chắc chắn thuộc / không thuộc
    vật. `pick`: chọn đầu ra thứ mấy của decoder (0–3); mặc định lấy IoU dự đoán
    cao nhất.
    """
    enc, dec = _load()
    h, w = img_bgr.shape[:2]
    x0, y0, x1, y1 = box
    bw, bh = x1 - x0, y1 - y0
    mx, my = max(48, bw * margin), max(48, bh * margin)
    cx0, cy0 = int(max(0, x0 - mx)), int(max(0, y0 - my))
    cx1, cy1 = int(min(w, x1 + mx)), int(min(h, y1 + my))
    crop = img_bgr[cy0:cy1, cx0:cx1]
    ch, cw = crop.shape[:2]
    s = LONG / max(ch, cw)
    rw, rh = max(1, round(cw * s)), max(1, round(ch * s))
    rgb = cv2.cvtColor(cv2.resize(crop, (rw, rh), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2RGB)
    emb = enc.run(None, {"input_image": rgb.astype(np.float32)})[0]

    def tr(x, y):
        return [(x - cx0) * s, (y - cy0) * s]

    pts = [tr(x0, y0), tr(x1, y1)]
    labels = [2, 3]
    for x, y in pos:
        pts.append(tr(x, y))
        labels.append(1)
    for x, y in neg:
        pts.append(tr(x, y))
        labels.append(0)
    masks, iou, _ = dec.run(None, {
        "image_embeddings": emb,
        "point_coords": np.array([pts], np.float32),
        "point_labels": np.array([labels], np.float32),
        "mask_input": np.zeros((1, 1, 256, 256), np.float32),
        "has_mask_input": np.zeros(1, np.float32),
        "orig_im_size": np.array([rh, rw], np.float32),
    })
    i = int(np.argmax(iou[0])) if pick is None else pick
    m = (masks[0, i] > 0).astype(np.uint8) * 255
    m = cv2.resize(m, (cw, ch), interpolation=cv2.INTER_LINEAR)
    m = (m > 127).astype(np.uint8) * 255
    out = np.zeros((h, w), np.uint8)
    out[cy0:cy1, cx0:cx1] = m
    return out
