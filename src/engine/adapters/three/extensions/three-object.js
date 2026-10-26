import { Group, Object3D } from "three";
import { Scene } from "../../../domain/scene";


export class ThreeObject extends Group {
    /**
     *
     * @param {Scene} scene
     */
    constructor(scene) {
        super();
        this.scene = scene;
    }

    /**
     *
     * @param {...Object3D} child
     */
    add(...child) {
        return super.add(...child);
    }

    /**
     *
     * @param {...Object3D} child
     */
    remove(...child) {
        return super.remove(...child);
    }

    /**
     *
     * @param {Object3D} child
     */
    attach(child) {
        return super.attach(child);
    }

    get cannon() {
        return this.scene.cannon;
    }

    get three() {
        return this.scene.three;
    }
}
