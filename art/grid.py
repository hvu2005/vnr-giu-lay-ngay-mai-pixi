"""Ảnh master 1376×768 kẻ lưới 50 px có số — để đọc toạ độ khung cắt bằng mắt."""
import sys, cv2
key, out = sys.argv[1], sys.argv[2]
which = sys.argv[3] if len(sys.argv) > 3 else "master"
a = cv2.resize(cv2.imread(f"art/gemini/{key}_{which}.png"), (1376, 768), interpolation=cv2.INTER_AREA)
for x in range(0, 1376, 50):
    cv2.line(a, (x, 0), (x, 767), (0, 255, 255) if x % 100 == 0 else (0, 160, 160), 1)
    if x % 100 == 0: cv2.putText(a, str(x), (x + 2, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1)
for y in range(0, 768, 50):
    cv2.line(a, (0, y), (1375, y), (0, 255, 255) if y % 100 == 0 else (0, 160, 160), 1)
    if y % 100 == 0: cv2.putText(a, str(y), (2, y - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1)
cv2.imwrite(out, a, [cv2.IMWRITE_JPEG_QUALITY, 85])
