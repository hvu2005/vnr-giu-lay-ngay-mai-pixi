import { Graphics } from "pixi.js";

const COLOR = {
    /** Body động, đang thức */
    awake: 0x00e676,
    /** Body động, matter đã ru ngủ (enableSleeping) */
    sleeping: 0x9e9e9e,
    /** Body tĩnh: sàn, tường */
    static: 0x40c4ff,
    /** Sensor: có va chạm nhưng không sinh phản lực */
    sensor: 0xffd54f,
    /** Kim chỉ hướng quay */
    angle: 0xff5252,
};

/**
 * Vẽ debug vật lý 2D bằng `Graphics` của Pixi, KHÔNG dùng `Render` của matter-js.
 *
 * Vì sao đổi — bản cũ dùng `Render.create()` của matter và gặp đủ vấn đề:
 *
 *  · Nó tự dựng canvas RIÊNG, tự chạy vòng lặp riêng qua `Render.run()`. Hai
 *    vòng lặp độc lập nghĩa là wireframe và sprite không bao giờ chắc chắn cùng
 *    một frame.
 *  · Canvas riêng thì phải tự đồng bộ `bounds` + `Render.lookAt` với không gian
 *    logic, và bản cũ phải HUỶ RỒI TẠO LẠI toàn bộ render mỗi lần resize.
 *  · Thêm một canvas nữa chồng lên hai canvas sẵn có, phải tự lo z-index,
 *    pointer-events, tỉ lệ CSS.
 *
 * Vẽ bằng Pixi thì tất cả biến mất: body của matter và stage của pixi DÙNG CHUNG
 * hệ toạ độ logic, nên chỉ cần một `Graphics` nằm trong stage. Resize không phải
 * làm gì cả — pixi đã lo. Không canvas mới, không vòng lặp mới.
 *
 * Hợp đồng: `render(bodies)` + `dispose()` — xem `PhysicsPort.setDebugRenderer`.
 */
export class MatterDebugRender {
    /**
     * @param {{
     *   renderer: import("../pixi/pixi-renderer").PixiRenderer,
     *   showAngle?: boolean,
     *   showVelocity?: boolean,
     *   lineWidth?: number,
     * }} options
     */
    constructor(options) {
        this.renderer = options.renderer;
        this.showAngle = options.showAngle ?? true;
        this.showVelocity = options.showVelocity ?? false;
        this.lineWidth = options.lineWidth ?? 1.5;

        this.graphics = new Graphics();

        // Nằm trên mọi thứ game vẽ, kể cả object thêm vào sau này.
        this.graphics.zIndex = 999999;
        this.graphics.eventMode = "none";

        this.renderer.stage.sortableChildren = true;
        this.renderer.add(this.graphics);
    }

    /**
     * @param {import("matter-js").Body[]} bodies
     */
    render(bodies) {
        const g = this.graphics;

        g.clear();

        for (const body of bodies) {
            // Compound body: parts[0] chính là body cha (bao ngoài), các part
            // thật nằm từ index 1. Vẽ cả parts[0] sẽ ra một khung thừa bao quanh.
            const parts = body.parts.length > 1 ? body.parts.slice(1) : [body];

            const color = body.isSensor ? COLOR.sensor
                : body.isStatic ? COLOR.static
                    : body.isSleeping ? COLOR.sleeping
                        : COLOR.awake;

            for (const part of parts) {
                this._drawPart(g, part, color);
            }

            if (this.showAngle && !body.isStatic) {
                this._drawAngle(g, body);
            }

            if (this.showVelocity && !body.isStatic) {
                this._drawVelocity(g, body);
            }
        }
    }

    /**
     * @private
     * @param {Graphics} g
     * @param {import("matter-js").Body} part
     * @param {number} color
     */
    _drawPart(g, part, color) {
        if (part.circleRadius) {
            g.circle(part.position.x, part.position.y, part.circleRadius);
        } else {
            // `vertices` của matter đã ở world space và theo đúng thứ tự vòng.
            g.poly(part.vertices, true);
        }

        g.stroke({ width: this.lineWidth, color, alpha: 0.95 });
        g.fill({ color, alpha: 0.08 });
    }

    /**
     * @private Kim từ tâm ra mép theo `angle` — nhìn được vật có đang xoay không,
     * thứ mà khung đa giác đối xứng không cho thấy.
     *
     * @param {Graphics} g
     * @param {import("matter-js").Body} body
     */
    _drawAngle(g, body) {
        const radius = body.circleRadius
            ?? Math.max(
                body.bounds.max.x - body.bounds.min.x,
                body.bounds.max.y - body.bounds.min.y,
            ) / 2;

        g.moveTo(body.position.x, body.position.y);
        g.lineTo(
            body.position.x + Math.cos(body.angle) * radius,
            body.position.y + Math.sin(body.angle) * radius,
        );

        g.stroke({ width: this.lineWidth, color: COLOR.angle, alpha: 0.9 });
    }

    /**
     * @private
     * @param {Graphics} g
     * @param {import("matter-js").Body} body
     */
    _drawVelocity(g, body) {
        g.moveTo(body.position.x, body.position.y);
        g.lineTo(
            body.position.x + body.velocity.x * 5,
            body.position.y + body.velocity.y * 5,
        );

        g.stroke({ width: this.lineWidth, color: 0xffffff, alpha: 0.6 });
    }

    /**
     * Không cần làm gì: Graphics nằm trong stage của pixi nên đã ở đúng không
     * gian logic. Bản cũ (matter `Render`) phải huỷ và dựng lại toàn bộ canvas.
     *
     * @param {number} width @param {number} height
     */
    resize(width, height) {
    }

    dispose() {
        this.renderer.remove(this.graphics);
        this.graphics.destroy();
    }
}
