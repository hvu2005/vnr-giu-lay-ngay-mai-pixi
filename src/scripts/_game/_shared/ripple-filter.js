import { Filter, GlProgram } from "pixi.js";

/**
 * Làm gợn một mảnh ảnh nền — mặt nước lăn tăn, lá cờ bay.
 *
 * Không dùng `DisplacementFilter` của pixi: nó cần một sprite bản đồ nhiễu
 * nằm trong display list và một texture lặp — hai thứ nữa phải giữ đồng bộ vị
 * trí với vùng bị gợn. Ở đây độ lệch là tổng vài sóng sin tính thẳng trong
 * shader, không cần texture nào.
 *
 * ── VÌ SAO KHÔNG CÓ ĐƯỜNG NỐI ───────────────────────────────────────────────
 *
 * Filter gắn vào một sprite là BẢN SAO của đúng mảnh nền đó, đặt đè lên chính
 * nó. Độ lệch được nhân với một hệ số tắt dần về 0 ở cả bốn mép (`fall`), nên
 * mép mảnh bản sao trùng khít với nền bên dưới — không lộ khung chữ nhật.
 *
 * Kiểu `cloth` thì khác: lá cờ neo ở CỘT, nên biên độ tăng dần từ 0 ở mép
 * cột ra đuôi cờ, thay vì tắt ở cả bốn phía. `anchor: "right"` cho cờ có cột
 * bên phải (người cầm cờ ở Ba Đình, cờ trên nóc hầm Đờ Cát).
 *
 * Gắn được lên SPRITE VẬT THỂ (không chỉ mảnh nền): sprite lá cờ cắt từ ảnh
 * master kèm cả cán cờ dài xuống tay người cầm — `yMax` (0..1 theo chiều cao
 * sprite) giới hạn sóng trong phần vải, cán cờ phía dưới đứng yên.
 */

const vertex = `
in vec2 aPosition;

out vec2 vTextureCoord;
out vec2 vUV;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition(void) {
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;

    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

void main(void) {
    gl_Position = filterVertexPosition();
    vTextureCoord = aPosition * (uOutputFrame.zw * uInputSize.zw);
    vUV = aPosition;
}
`;

const fragment = `
precision highp float;

in vec2 vTextureCoord;
in vec2 vUV;

out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec4 uInputSize;

uniform float uTime;
uniform float uAmp;
uniform float uFreq;
uniform float uSpeed;
uniform float uCloth;
uniform float uDir;
uniform float uYMax;

void main(void) {
    vec2 uv = vUV;

    float fall = smoothstep(0.0, 0.2, uv.x) * smoothstep(1.0, 0.8, uv.x)
               * smoothstep(0.0, 0.2, uv.y) * smoothstep(1.0, 0.8, uv.y);

    vec2 off;

    if (uCloth > 0.5) {
        // Sóng chạy từ cột cờ ra đuôi, biên độ lớn dần theo x.
        float x = uDir > 0.0 ? uv.x : 1.0 - uv.x;
        float y = uv.y / uYMax;
        float k = x * x;
        off = vec2(
            sin(x * uFreq - uTime * uSpeed * 1.3) * 0.35 * uDir,
            sin(x * uFreq - uTime * uSpeed)
        ) * uAmp * k * smoothstep(1.0, 0.85, y) * smoothstep(0.0, 0.15, y);
    } else {
        // Hai sóng lệch tần số cộng lại — một sóng đơn trông như gương uốn.
        float a = sin(uv.y * uFreq + uTime * uSpeed);
        float b = sin(uv.y * uFreq * 2.3 - uTime * uSpeed * 1.4 + uv.x * 6.0);
        float c = cos(uv.x * uFreq * 0.6 + uTime * uSpeed * 0.7);
        off = vec2(a * 0.6 + b * 0.4, c * 0.35) * uAmp * fall;
    }

    finalColor = texture(uTexture, vTextureCoord + off * uInputSize.zw);
}
`;

/**
 * @param {{ mode: "water" | "cloth", amp: number, freq: number, speed: number,
 *   anchor?: "left" | "right", yMax?: number }} cfg
 *   `amp` tính bằng pixel của texture
 */
export function createRippleFilter(cfg) {
    return new Filter({
        glProgram: GlProgram.from({ vertex, fragment, name: "ripple" }),
        resources: {
            rippleUniforms: {
                uTime: { value: Math.random() * 10, type: "f32" },
                uAmp: { value: cfg.amp, type: "f32" },
                uFreq: { value: cfg.freq, type: "f32" },
                uSpeed: { value: cfg.speed, type: "f32" },
                uCloth: { value: cfg.mode === "cloth" ? 1 : 0, type: "f32" },
                uDir: { value: cfg.anchor === "right" ? -1 : 1, type: "f32" },
                uYMax: { value: cfg.yMax ?? 1, type: "f32" },
            },
        },
    });
}
