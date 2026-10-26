import { 
    ClampToEdgeWrapping, 
    LinearFilter, 
    LinearMipMapLinearFilter, 
    SRGBColorSpace, 
    Texture 
} from "three"


function isPowerOfTwo(v) {
    return (v & (v - 1)) === 0;
}

export async function loadThreeTexture(src, options = {}) {
    const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src; // base64 hoặc url
    });

    const tex = new Texture(image);

    tex.flipY = true;

    // color space
    tex.colorSpace = options.colorSpace ?? SRGBColorSpace;

    // wrapping
    tex.wrapS = options.wrapS ?? ClampToEdgeWrapping;
    tex.wrapT = options.wrapT ?? ClampToEdgeWrapping;

    // filter + mipmap
    const pot = isPowerOfTwo(image.width) && isPowerOfTwo(image.height);

    tex.magFilter = options.magFilter ?? LinearFilter;
    tex.minFilter =
        options.minFilter ??
        (pot ? LinearMipMapLinearFilter : LinearFilter);

    tex.generateMipmaps = pot;

    tex.needsUpdate = true;


    return tex;
}

