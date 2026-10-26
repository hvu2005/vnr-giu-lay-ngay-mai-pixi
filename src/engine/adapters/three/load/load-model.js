import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";


export async function loadModel(src) {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(src);
    return gltf;
}