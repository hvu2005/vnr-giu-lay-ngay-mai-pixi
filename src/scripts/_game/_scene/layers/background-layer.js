import { Container, Rectangle, Sprite, Texture } from "pixi.js";

import { AMBIENCE } from "../../data/ambience";
import LAYOUT from "../../data/layout.generated.json";
import { assetByPath } from "../../_shared/asset-path";
import { createRippleFilter } from "../../_shared/ripple-filter";

/**
 * Ảnh nền của cảnh (bản CLEAN của Gemini — người, cờ… đã được xoá và vẽ lại
 * nền phía sau), cộng các vùng GỢN (mặt nước, khói…).
 *
 * Mỗi vùng gợn là một sprite cắt ĐÚNG mảnh nền đó (texture con cùng source,
 * không tốn thêm bộ nhớ ảnh), đặt đè lên chính chỗ cũ rồi cho qua
 * `ripple-filter`. Filter tắt dần biên độ về 0 ở mép nên không lộ khung.
 */
export class BackgroundLayer {
    /**
     * @param {import("../game-scene").GameScene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.view = new Container();

        /** @type {Array<{ sprite: Sprite, filter: import("pixi.js").Filter }>} */
        this.ripples = [];
    }

    init() {
        this.scene.stage.world.addChild(this.view);
    }

    /** @param {string} key */
    enter(key) {
        const layout = LAYOUT[key];
        const texture = assetByPath(layout.bg);
        // Ảnh nền xuất ở `artScale` (1.5×) — thu về khung thiết kế 1376×768.
        const art = layout.artScale ?? 1;

        const bg = new Sprite(texture);
        bg.scale.set(1 / art);
        this.view.addChild(bg);

        for (const cfg of AMBIENCE[key]?.ripples ?? []) {
            const [x0, y0, x1, y1] = cfg.rect;
            const crop = new Texture({
                source: texture.source,
                frame: new Rectangle(x0 * art, y0 * art, (x1 - x0) * art, (y1 - y0) * art),
            });
            const sprite = new Sprite(crop);
            const filter = createRippleFilter({ ...cfg, amp: cfg.amp * art });

            sprite.scale.set(1 / art);
            sprite.position.set(x0, y0);
            sprite.filters = [filter];

            this.view.addChild(sprite);
            this.ripples.push({ sprite, filter });
        }
    }

    leave() {
        for (const { sprite } of this.ripples) {
            // Texture con do layer này dựng → huỷ khung, KHÔNG huỷ source dùng chung.
            sprite.texture.destroy(false);
        }

        this.ripples.length = 0;

        for (const child of this.view.removeChildren()) child.destroy();
    }

    /** @param {number} dt */
    update(dt) {
        for (const { filter } of this.ripples) {
            filter.resources.rippleUniforms.uniforms.uTime += dt;
        }
    }

    resize() {
    }

    dispose() {
        this.leave();
        this.view.destroy();
    }
}
