import { Sprite, Texture, SpriteOptions } from "pixi.js";

/**
 * @typedef {Omit<SpriteOptions, "texture">} SimpleSpriteOptions
 */

export class SimpleSprite extends Sprite {
    /**
     * 
     * @param {Texture} texture 
     * @param {SimpleSpriteOptions} options 
     */
    constructor(texture, options = {}) {
        const defaultOptions = {
            anchor: { x: 0.5, y: 0.5 },
        };

        super({ texture, ...defaultOptions, ...options });
    }
}