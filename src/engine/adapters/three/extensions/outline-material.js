import { BackSide, Color, ShaderMaterial } from "three";

/**
 * Outline kiểu INVERTED HULL: vẽ lại chính geometry đó, đùn mỗi đỉnh ra ngoài theo
 * normal rồi chỉ vẽ MẶT SAU (`BackSide`).
 *
 * Vì sao chạy được: cái vỏ phồng ra chỉ lộ đúng phần rìa — phần trước mặt bị chính
 * model che (depth test loại), nên còn lại là một đường viền đều quanh silhouette.
 * Không cần post-process, không cần render target, và mỗi con dice chỉ thêm 1 draw
 * call.
 *
 * ĐÙN THEO NORMAL, KHÔNG PHẢI SCALE TO LÊN: scale to thì viền dày theo khoảng cách
 * tới tâm — góc dice sẽ dày hơn giữa mặt rõ rệt. Đùn theo normal cho bề dày đều.
 * Cách này chỉ hở mối ở chỗ normal bị tách (mỗi mặt một normal riêng), mà
 * `Dice.glb` đo được 0 đỉnh như vậy nên dùng thẳng được.
 *
 * `outlineWidth` tính theo KHÔNG GIAN LOCAL của mesh mang nó. Mesh dice nằm trong
 * `modelPivot` (scale `1/maxSize`) rồi trong tray (scale `tray.size`), nên bề dày
 * world = `outlineWidth / maxSize × tray.size` — `TrayView` nhân sẵn `maxSize` để
 * knob ngoài config là "phần của kích thước dice".
 */
export class OutlineMaterial extends ShaderMaterial {
    /**
     * @param {{ color?: number, width?: number }} [options]
     */
    constructor(options = {}) {
        super({
            uniforms: {
                outlineColor: { value: new Color(options.color ?? 0x000000) },
                outlineWidth: { value: options.width ?? 1 },
            },

            vertexShader: /* glsl */ `
                uniform float outlineWidth;

                void main() {
                    // normalize lại: normal trong buffer có thể chưa chuẩn hoá, mà
                    // lệch độ dài là bề dày viền lệch theo.
                    vec3 offset = position + normalize(normal) * outlineWidth;

                    gl_Position = projectionMatrix * modelViewMatrix * vec4(offset, 1.0);
                }
            `,

            fragmentShader: /* glsl */ `
                uniform vec3 outlineColor;

                void main() {
                    gl_FragColor = vec4(outlineColor, 1.0);

                    // PHẢI có 2 include này: ShaderMaterial không tự thêm, thiếu là
                    // màu ghi ra bỏ qua output color space của renderer. Đen thì
                    // không thấy khác, nhưng viền màu sẽ sai tông ngay.
                    #include <tonemapping_fragment>
                    #include <colorspace_fragment>
                }
            `,

            // Chỉ mặt sau: mặt trước của vỏ phồng mà vẽ ra là nó trùm kín model.
            side: BackSide,
        });
    }

    get color() {
        return this.uniforms.outlineColor.value;
    }

    get width() {
        return this.uniforms.outlineWidth.value;
    }

    set width(value) {
        this.uniforms.outlineWidth.value = value;
    }
}
