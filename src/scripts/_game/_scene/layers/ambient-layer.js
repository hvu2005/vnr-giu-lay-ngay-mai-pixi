import { Container, Sprite } from "pixi.js";

import { AMBIENCE } from "../../data/ambience";
import { Emitter } from "../../_shared/particles";
import { softTexture } from "../../_shared/textures";

/**
 * Hiệu ứng "sống" của khung cảnh: khói, hơi nước, tuyết, cánh hoa, bụi trong
 * nắng, chim bay — và quầng đèn chập chờn.
 *
 * Nằm TRÊN lớp vật thể: khói phải bốc lên phủ qua miệng ống khói (vốn là một
 * sprite vật thể), quầng đèn cộng sáng lên cả người đứng dưới đèn. Toàn bộ lớp
 * này không nhận chuột (`eventMode: "none"`) nên không che vật thể.
 */
export class AmbientLayer {
    /**
     * @param {import("../game-scene").GameScene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.view = new Container({ eventMode: "none" });

        /** @type {Emitter[]} */
        this.emitters = [];

        /** @type {Array<{ sprite: Sprite, alpha: number, flicker: number, seed: number }>} */
        this.halos = [];

        this._time = 0;
    }

    init() {
        this.scene.stage.world.addChild(this.view);
    }

    /** @param {string} key */
    enter(key) {
        const amb = AMBIENCE[key] ?? {};

        for (const cfg of amb.halos ?? []) {
            const sprite = new Sprite(softTexture());
            sprite.anchor.set(0.5);
            sprite.position.set(cfg.x, cfg.y);
            sprite.scale.set((cfg.r * 2) / 128);
            sprite.tint = cfg.color ?? 0xffffff;
            sprite.blendMode = "add";
            sprite.alpha = cfg.alpha ?? 0.4;

            this.view.addChild(sprite);
            this.halos.push({ sprite, alpha: sprite.alpha, flicker: cfg.flicker ?? 0, seed: Math.random() * 100 });
        }

        for (const cfg of amb.emitters ?? []) {
            const emitter = new Emitter(cfg);
            this.view.addChild(emitter.view);
            this.emitters.push(emitter);
        }
    }

    leave() {
        for (const emitter of this.emitters) emitter.dispose();
        this.emitters.length = 0;
        this.halos.length = 0;

        for (const child of this.view.removeChildren()) child.destroy();
    }

    /** @param {number} dt */
    update(dt) {
        this._time += dt;
        const t = this._time;

        for (const e of this.emitters) e.update(dt);

        for (const h of this.halos) {
            // Hai sin lệch tần số nhân nhau → chập chờn không đều như lửa thật.
            const n = 0.5 + 0.5 * Math.sin(t * 7.3 + h.seed) * Math.sin(t * 3.1 + h.seed * 2);
            h.sprite.alpha = h.alpha * (1 - h.flicker * n);
        }
    }

    resize() {
    }

    dispose() {
        this.leave();
        this.view.destroy();
    }
}
