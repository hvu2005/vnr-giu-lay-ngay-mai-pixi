import { Container, Sprite } from "pixi.js";

import { birdTexture, moteTexture, petalTexture, softTexture, wispTexture } from "./textures";

/**
 * Hệ hạt tối giản cho hiệu ứng nền — không kéo thêm thư viện particle nào.
 *
 * Hai kiểu sống:
 *
 *  · PHUN (`smoke`, `steam`, `wisp`): sinh liên tục từ một điểm theo `rate`
 *    hạt/giây, mỗi hạt có vòng đời riêng rồi chết. Khói ống tàu, hơi nồi.
 *  · THƯỜNG TRỰC (`snow`, `petals`, `dust`, `fireflies`, `fog`, `birds`):
 *    đúng `count` hạt sống mãi trong một vùng, ra khỏi vùng thì quay vòng lại.
 *    Không sinh/huỷ mỗi frame nên không rác GC.
 *
 * Toạ độ là pixel ảnh nền (container này nằm trong khung 1376×768).
 */

const TAU = Math.PI * 2;

/**
 * @typedef {{
 *   sprite: Sprite,
 *   age: number, life: number,
 *   x: number, y: number, vx: number, vy: number,
 *   size: number, grow: number,
 *   spin: number, seed: number,
 *   alpha: number,
 * }} Particle
 */

export class Emitter {
    /**
     * @param {any} cfg một mục trong `AMBIENCE[scene].emitters`
     */
    constructor(cfg) {
        this.cfg = cfg;
        this.view = new Container();

        /** @type {Particle[]} */
        this.particles = [];

        this._acc = 0;
        this._time = 0;

        const behaviour = BEHAVIOURS[cfg.type];

        if (!behaviour) {
            console.warn(`[particles] không có loại "${cfg.type}"`);
            this.behaviour = null;
            return;
        }

        this.behaviour = behaviour;

        if (behaviour.persistent) {
            for (let i = 0; i < (cfg.count ?? 20); i++) {
                const p = this._spawn();
                // Rải sẵn khắp vùng: không thì frame đầu toàn bộ tuyết dồn ở mép trên.
                behaviour.init(p, cfg, true);
            }
        } else {
            // Chạy nhanh vài giây để lúc vào cảnh khói đã có sẵn cột, không mọc từ số 0.
            for (let i = 0; i < 40; i++) this.update(0.1);
        }
    }

    /** @param {number} dt */
    update(dt) {
        const b = this.behaviour;
        if (!b) return;

        this._time += dt;

        if (!b.persistent) {
            this._acc += dt * (this.cfg.rate ?? 3);

            while (this._acc >= 1) {
                this._acc -= 1;
                b.init(this._spawn(), this.cfg, false);
            }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.age += dt;

            const alive = b.step(p, dt, this.cfg, this._time);

            if (!alive) {
                if (b.persistent) {
                    b.init(p, this.cfg, false);
                } else {
                    p.sprite.destroy();
                    this.particles.splice(i, 1);
                    continue;
                }
            }

            p.sprite.position.set(p.x, p.y);
        }
    }

    _spawn() {
        const sprite = new Sprite(this.behaviour.texture());
        sprite.anchor.set(0.5);
        this.view.addChild(sprite);

        /** @type {Particle} */
        const p = {
            sprite, age: 0, life: 1, x: 0, y: 0, vx: 0, vy: 0,
            size: 1, grow: 0, spin: 0, seed: Math.random() * 1000, alpha: 1,
        };

        this.particles.push(p);

        return p;
    }

    dispose() {
        this.view.destroy({ children: true });
        this.particles.length = 0;
    }
}

// ══ HÀNH VI TỪNG LOẠI ════════════════════════════════════════════════════════

/** Độ mờ theo tuổi: hiện dần 20% đầu, tắt dần 40% cuối. */
function _fade(t) {
    if (t < 0.2) return t / 0.2;
    if (t > 0.6) return Math.max(0, (1 - t) / 0.4);
    return 1;
}

function _rand(a, b) {
    return a + Math.random() * (b - a);
}

/** Khói / hơi nước bốc lên, nở dần, trôi theo gió. */
function _plume({ riseMin, riseMax, lifeMin, lifeMax, grow, baseAlpha }) {
    return {
        persistent: false,
        texture: softTexture,
        init(p, cfg) {
            p.age = 0;
            p.life = _rand(lifeMin, lifeMax);
            p.x = cfg.x + _rand(-4, 4);
            p.y = cfg.y + _rand(-2, 2);
            p.vx = (cfg.drift ?? 0) * _rand(0.6, 1.2);
            p.vy = -_rand(riseMin, riseMax);
            p.size = (cfg.size ?? 30) * _rand(0.5, 0.8);
            p.grow = (cfg.size ?? 30) * grow;
            p.alpha = (cfg.alpha ?? baseAlpha) * _rand(0.7, 1);
            p.sprite.tint = cfg.color ?? 0xffffff;
            p.sprite.rotation = Math.random() * TAU;
            p.spin = _rand(-0.3, 0.3);
        },
        step(p, dt, cfg, time) {
            const t = p.age / p.life;
            // Gió thổi mạnh dần theo độ cao — cột khói ngả nghiêng chứ không dựng thẳng.
            p.vx += (cfg.drift ?? 0) * 0.35 * dt;
            p.x += (p.vx + Math.sin(time * 1.3 + p.seed) * 6) * dt;
            p.y += p.vy * dt;
            p.vy *= 1 - 0.25 * dt;

            const s = (p.size + p.grow * t) / 64;
            p.sprite.scale.set(s);
            p.sprite.rotation += p.spin * dt;
            p.sprite.alpha = p.alpha * _fade(t);

            return t < 1;
        },
    };
}

const BEHAVIOURS = {
    smoke: _plume({ riseMin: 26, riseMax: 40, lifeMin: 4, lifeMax: 6, grow: 3.2, baseAlpha: 0.55 }),
    steam: _plume({ riseMin: 22, riseMax: 34, lifeMin: 2.4, lifeMax: 3.6, grow: 2.2, baseAlpha: 0.35 }),

    /** Khói thuốc lá — sợi mảnh, uốn lượn, rất mờ. */
    wisp: {
        persistent: false,
        texture: wispTexture,
        init(p, cfg) {
            p.age = 0;
            p.life = _rand(3, 4.5);
            p.x = cfg.x + _rand(-2, 2);
            p.y = cfg.y;
            p.vx = 0;
            p.vy = -_rand(14, 20);
            p.size = _rand(0.18, 0.26);
            p.alpha = _rand(0.18, 0.28);
            p.sprite.tint = 0xd8d4cc;
        },
        step(p, dt, cfg, time) {
            const t = p.age / p.life;
            p.x += Math.sin(time * 2 + p.seed + t * 5) * 9 * dt;
            p.y += p.vy * dt;
            p.sprite.scale.set(p.size * (1 + t * 1.5), p.size * (1 + t * 0.8));
            p.sprite.rotation = Math.sin(time + p.seed) * 0.4;
            p.sprite.alpha = p.alpha * _fade(t);

            return t < 1;
        },
    },

    snow: {
        persistent: true,
        texture: moteTexture,
        init(p, cfg, scatter) {
            const [x0, y0, x1, y1] = cfg.rect;
            p.x = _rand(x0, x1);
            p.y = scatter ? _rand(y0, y1) : y0 - 10;
            p.vy = _rand(28, 60);
            p.size = _rand(0.12, 0.3);
            p.alpha = _rand(0.55, 0.95);
            p.sprite.scale.set(p.size);
            p.sprite.alpha = p.alpha;
        },
        step(p, dt, cfg, time) {
            p.y += p.vy * dt;
            p.x += (Math.sin(time * 0.9 + p.seed) * 14 - 6) * dt;

            return p.y < cfg.rect[3] + 10;
        },
    },

    petals: {
        persistent: true,
        texture: petalTexture,
        init(p, cfg, scatter) {
            const [x0, y0, x1, y1] = cfg.rect;
            p.x = _rand(x0, x1);
            p.y = scatter ? _rand(y0, 768) : _rand(y0, y1);
            p.vx = -_rand(14, 30);
            p.vy = _rand(24, 42);
            p.size = _rand(0.45, 0.8);
            p.spin = _rand(-2, 2);
            p.sprite.alpha = 0.95;
        },
        step(p, dt, cfg, time) {
            p.x += (p.vx + Math.sin(time * 1.5 + p.seed) * 18) * dt;
            p.y += p.vy * dt;
            p.sprite.rotation += p.spin * dt;
            // Lật cánh: bóp trục ngang theo sin — trông như cánh xoay trong gió.
            p.sprite.scale.set(p.size * Math.abs(Math.sin(time * 2.2 + p.seed)) + 0.08, p.size);

            return p.y < 780 && p.x > -20;
        },
    },

    dust: {
        persistent: true,
        texture: moteTexture,
        init(p, cfg) {
            const [x0, y0, x1, y1] = cfg.rect;
            p.x = _rand(x0, x1);
            p.y = _rand(y0, y1);
            p.size = _rand(0.08, 0.18);
            p.alpha = _rand(0.25, 0.6);
            p.age = 0;
            p.life = _rand(5, 9);
            p.sprite.tint = cfg.color ?? 0xffffff;
            p.sprite.scale.set(p.size);
            p.sprite.blendMode = "add";
        },
        step(p, dt, cfg, time) {
            const t = p.age / p.life;
            p.x += Math.sin(time * 0.4 + p.seed) * 5 * dt;
            p.y += (Math.cos(time * 0.3 + p.seed) * 4 - 1.5) * dt;
            p.sprite.alpha = p.alpha * Math.sin(Math.PI * t);

            return t < 1;
        },
    },

    fireflies: {
        persistent: true,
        texture: moteTexture,
        init(p, cfg) {
            const [x0, y0, x1, y1] = cfg.rect;
            p.x = _rand(x0, x1);
            p.y = _rand(y0, y1);
            p.age = 0;
            p.life = _rand(3, 6);
            p.size = _rand(0.2, 0.35);
            p.sprite.tint = 0xfff3a0;
            p.sprite.blendMode = "add";
            p.sprite.scale.set(p.size);
        },
        step(p, dt, cfg, time) {
            const t = p.age / p.life;
            p.x += Math.sin(time * 0.8 + p.seed) * 12 * dt;
            p.y += Math.cos(time * 0.6 + p.seed * 1.7) * 10 * dt;
            p.sprite.alpha = Math.sin(Math.PI * t) * (0.6 + 0.4 * Math.sin(time * 6 + p.seed));

            return t < 1;
        },
    },

    /** Dải sương trôi ngang — vài đốm mờ rất lớn. */
    fog: {
        persistent: true,
        texture: softTexture,
        init(p, cfg, scatter) {
            const [x0, y0, x1, y1] = cfg.rect;
            p.x = scatter ? _rand(x0, x1) : x0;
            p.y = _rand(y0, y1);
            p.vx = _rand(6, 14);
            p.size = _rand(4, 6.5);
            p.sprite.tint = cfg.color ?? 0xffffff;
            p.sprite.scale.set(p.size * 1.8, p.size * 0.7);
            p.sprite.alpha = cfg.alpha ?? 0.2;
        },
        step(p, dt, cfg) {
            p.x += p.vx * dt;

            return p.x < cfg.rect[2];
        },
    },

    birds: {
        persistent: true,
        texture: birdTexture,
        init(p, cfg, scatter) {
            const [x0, y0, x1, y1] = cfg.rect;
            p.x = scatter ? _rand(x0, x1) : x0 - _rand(20, 400);
            p.y = _rand(y0, y1);
            p.vx = _rand(22, 38);
            p.size = _rand(0.35, 0.6);
            p.sprite.alpha = 0.75;
        },
        step(p, dt, cfg, time) {
            p.x += p.vx * dt;
            p.y += Math.sin(time * 0.7 + p.seed) * 4 * dt;
            // Vỗ cánh: bóp trục dọc.
            p.sprite.scale.set(p.size, p.size * (0.45 + 0.55 * Math.abs(Math.sin(time * 5 + p.seed))));

            return p.x < cfg.rect[2] + 30;
        },
    },
};
