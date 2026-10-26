import { GlowFilter, OutlineFilter } from "pixi-filters";

import { HOVER_GLOW } from "../data/scene-config";

/**
 * Viền vàng phát sáng cho vật thể đang được trỏ vào.
 *
 * DÙNG CHUNG một cặp filter cho cả game chứ không mỗi vật một cặp: tại một
 * thời điểm chỉ có một vật được trỏ (cộng tối đa một vật đang được gợi ý), và
 * `GlowFilter` biên dịch shader theo `quality` — dựng mỗi vật một cái là mỗi
 * vật một lần biên dịch. Hai filter tự nới `padding` theo `distance` /
 * `thickness`, nên quầng không bị cắt vuông ở mép sprite.
 *
 * Gắn/gỡ bằng cách gán `sprite.filters`, KHÔNG để filter nằm sẵn với
 * `enabled = false`: vật không sáng thì không tốn một render pass nào.
 */
export class GlowOutline {
    constructor() {
        this.outline = new OutlineFilter({
            thickness: HOVER_GLOW.outlineThickness,
            color: HOVER_GLOW.outlineColor,
            quality: 0.25,
        });

        this.glow = new GlowFilter({
            distance: HOVER_GLOW.glowDistance,
            outerStrength: HOVER_GLOW.glowStrengthMax,
            innerStrength: 0,
            color: HOVER_GLOW.glowColor,
            quality: 0.25,
        });

        /** Thứ tự: nét viền trước, quầng loang ra từ nét viền. */
        this.filters = [this.outline, this.glow];

        this._time = 0;
    }

    /** @param {number} dt */
    update(dt) {
        this._time += dt;

        const k = 0.5 + 0.5 * Math.sin((this._time / HOVER_GLOW.pulsePeriod) * Math.PI * 2);

        this.glow.outerStrength = HOVER_GLOW.glowStrengthMin
            + (HOVER_GLOW.glowStrengthMax - HOVER_GLOW.glowStrengthMin) * k;
    }
}
