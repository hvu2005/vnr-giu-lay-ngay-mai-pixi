"""Xem nhanh cặp master/clean: ảnh ghép + mặt nạ khác biệt (để soi trước khi cắt)."""
import sys, cv2, numpy as np
key, out = sys.argv[1], sys.argv[2]
a = cv2.imread(f"art/gemini/{key}_master.png"); b = cv2.imread(f"art/gemini/{key}_clean.png")
d = (cv2.absdiff(a, b).max(2) > 30).astype(np.uint8) * 255
d = cv2.cvtColor(d, cv2.COLOR_GRAY2BGR)
top = np.hstack([a, b]); bot = np.hstack([d, cv2.addWeighted(a, 0.5, d, 0.5, 0)])
cv2.imwrite(out, cv2.resize(np.vstack([top, bot]), (1376, 768)), [cv2.IMWRITE_JPEG_QUALITY, 80])
