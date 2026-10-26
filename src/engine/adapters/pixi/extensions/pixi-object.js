import { Container } from "pixi.js";
import { Scene } from "../../../domain/scene";


export class PixiObject extends Container {
    /**
     * 
     * @param {Scene} scene 
     * @param {import("pixi.js").ContainerOptions} options
     */
    constructor(scene, options) {
        super(options);
        this.scene = scene;
    }

    /**
     * 
     * @param {...import("pixi.js").DisplayObject[]} child 
     */
    add(...child) {
        return super.addChild(...child);
    }

    /**
     * 
     * @param {...import("pixi.js").DisplayObject[]} child 
     */
    remove(...child) {
        return super.removeChild(...child);
    }

    /**
     * 
     * @param {import("pixi.js").DisplayObject} child 
     */
    attach(child) {
        const worldPos = child.getGlobalPosition();
        super.addChild(child);
        const localPos = this.toLocal(worldPos);
        child.position.copyFrom(localPos);

        return child;
    }

    get matter() {
        return this.scene.matter;
    }

    get pixi() {
        return this.scene.pixi;
    }

}
