import { Assets } from "pixi.js";

export async function loadPixiTexture(src) {
    const tex = await Assets.load(src);
    return tex;
}