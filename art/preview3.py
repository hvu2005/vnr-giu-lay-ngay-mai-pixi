"""Soi bộ ba master / clean / bare: trên = master | bare, dưới = diff(master,clean) | diff(clean,bare)."""
import sys, cv2, numpy as np
key, out = sys.argv[1], sys.argv[2]
L = lambda n: cv2.resize(cv2.imread(f"art/gemini/{key}_{n}.png"), (1376, 768))
a, b, c = L("master"), L("clean"), L("bare")
d = lambda x, y: cv2.cvtColor((cv2.absdiff(x, y).max(2) > 30).astype(np.uint8) * 255, cv2.COLOR_GRAY2BGR)
img = np.vstack([np.hstack([a, c]), np.hstack([d(a, b), d(b, c)])])
cv2.imwrite(out, cv2.resize(img, (1376, 768)), [cv2.IMWRITE_JPEG_QUALITY, 80])
