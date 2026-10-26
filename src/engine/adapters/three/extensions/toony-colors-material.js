import {
    BackSide,
    Color,
    FrontSide,
    ShaderMaterial,
    UniformsLib,
    UniformsUtils,
} from "three";

/**
 * Port của Toony Colors Pro 2 / Hybrid Shader 2 (URP) sang three.
 *
 * Mọi property của bản Unity đều có uniform + accessor. Phần ĐÃ render: albedo,
 * alpha test, normal map, ramp (Default / Crisp / Bands / BandsCrisp / Texture),
 * tint shadow↔highlight, shadow albedo texture, indirect (GI), occlusion,
 * specular (GGX / Stylized / Crisp), reflection + fresnel, rim, matcap, emission.
 *
 * CHƯA render, chỉ giữ uniform để config được:
 * - **outline**: bản gốc là 1 render pass RIÊNG (extrude mesh theo normal, vẽ mặt
 *   sau) — không nhét vào 1 material được, phải thêm mesh vỏ mới có;
 * - **reflection envmap thật** (hiện chỉ là tint theo fresnel, có texture thì nhân
 *   thêm texture phẳng);
 * - light cookies.
 *
 * Chạy được với `Mesh`, `InstancedMesh` và `BatchedMesh`.
 */

// ═══════════════════════════════════════════════════════════════════
// Vertex
// ═══════════════════════════════════════════════════════════════════
const vertexShader = /* glsl */`
    #include <common>
    #include <batching_pars_vertex>
    #include <uv_pars_vertex>
    #include <color_pars_vertex>
    #include <shadowmap_pars_vertex>
    #include <fog_pars_vertex>

    varying vec3 vNormalWS;
    varying vec3 vNormalVS;
    varying vec3 vPositionWS;
    varying vec3 vViewDirWS;

    // UV riêng cho các map phụ (bump / occlusion / spec / emission / matcapMask).
    // KHÔNG dùng vMapUv của three được: varying đó chỉ tồn tại khi có USE_MAP, nên
    // dùng bumpMap mà không có albedo map là lỗi compile.
    varying vec2 vTcpUv;

    #ifdef USE_NORMALMAP_TCP2
        attribute vec4 tangent;
        varying vec3 vTangentWS;
        varying vec3 vBitangentWS;
    #endif

    void main() {
        #include <uv_vertex>

        // Bắt buộc đi cặp với <color_fragment> ở fragment: đây là chỗ vColor được
        // khai + ghi (và nhân instanceColor / batching color vào). Thiếu nó thì
        // fragment khai một varying không ai ghi -> link fail "vColor does not
        // match any VERTEX varying", và mất sạch màu riêng của từng instance.
        #include <color_vertex>

        #include <beginnormal_vertex>

        // <batching_vertex> khai báo mat4 batchingMatrix — phải nằm trước mọi chỗ
        // dùng nó bên dưới.
        #include <batching_vertex>
        #include <begin_vertex>

        vTcpUv = uv;

        // KHÔNG sửa transformed / objectNormal: <worldpos_vertex> và
        // <shadowmap_vertex> ở cuối TỰ nhân batchingMatrix rồi instanceMatrix theo
        // transformed. Nhân sẵn ở đây là batched/instanced mesh bị nhân 2 lần →
        // shadow coord lệch hẳn chỗ. Nên chỉ nhân vào biến cục bộ.
        vec4 instancePosition = vec4(transformed, 1.0);
        vec3 instanceNormal = objectNormal;

        // Thứ tự batching → instancing, khớp đúng thứ tự trong <worldpos_vertex>
        #ifdef USE_BATCHING
            instancePosition = batchingMatrix * instancePosition;
            instanceNormal = mat3(batchingMatrix) * instanceNormal;
        #endif

        #ifdef USE_INSTANCING
            instancePosition = instanceMatrix * instancePosition;

            // Scale instance trong game này luôn đều nên khỏi cần inverse-transpose;
            // scale lệch trục thì normal sẽ hơi sai.
            instanceNormal = mat3(instanceMatrix) * instanceNormal;
        #endif

        vec4 worldPos = modelMatrix * instancePosition;

        vPositionWS = worldPos.xyz;
        vNormalWS = normalize(mat3(modelMatrix) * instanceNormal);
        vNormalVS = normalize(normalMatrix * instanceNormal);

        // Cam ortho không có tâm phối cảnh: hướng nhìn CỐ ĐỊNH cho mọi pixel. Lấy
        // theo cameraPosition như perspective thì rim / spec / fresnel loe ra theo
        // hình nan quạt. isOrthographic là uniform sẵn có của three.
        if (isOrthographic) {
            vViewDirWS = normalize(vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]));
        } else {
            vViewDirWS = normalize(cameraPosition - vPositionWS);
        }

        #ifdef USE_NORMALMAP_TCP2
            vTangentWS = normalize(mat3(modelMatrix) * tangent.xyz);
            vBitangentWS = cross(vNormalWS, vTangentWS) * tangent.w;
        #endif

        gl_Position = projectionMatrix * viewMatrix * worldPos;

        #include <worldpos_vertex>
        #include <shadowmap_vertex>
        #include <fog_vertex>
    }
`;

// ═══════════════════════════════════════════════════════════════════
// Fragment
// ═══════════════════════════════════════════════════════════════════
const fragmentShader = /* glsl */`
    #include <common>
    #include <packing>
    #include <uv_pars_fragment>
    #include <map_pars_fragment>
    #include <color_pars_fragment>
    #include <fog_pars_fragment>
    #include <lights_pars_begin>
    #include <shadowmap_pars_fragment>
    #include <shadowmask_pars_fragment>

    // ─── Base / albedo ──────────────────────────────────────────────
    uniform vec3  diffuse;
    uniform float opacity;
    uniform float alphaCutoff;
    uniform float useAlphaTest;

    // ─── Shadow albedo texture (TCP2_SHADOW_TEXTURE) ────────────────
    uniform float useShadowTexture;
    #ifdef USE_SHADOW_TEXTURE
        uniform sampler2D shadowBaseMap;
    #endif

    // ─── Tint shadow ↔ highlight ────────────────────────────────────
    uniform vec3  highlightColor;
    uniform vec3  shadowColor;
    uniform float shadowColorLightAtten;

    // ─── Ramp ───────────────────────────────────────────────────────
    uniform float rampType;            // 0=Default, 1=Crisp, 2=Bands, 3=BandsCrisp, 4=Texture
    uniform float rampThreshold;
    uniform float rampSmoothing;
    uniform float rampBands;
    uniform float rampBandsSmoothing;
    uniform float rampScale;           // ramp texture scale
    uniform float rampOffset;          // ramp texture offset
    uniform float useRampBands;        // legacy compat (overrides rampType to Bands)
    #ifdef USE_RAMP_TEXTURE
        uniform sampler2D rampTexture;
    #endif

    // ─── Normal Map (TCP2_NORMALMAP / _NORMALMAP) ───────────────────
    uniform float useNormalMap;
    uniform float bumpScale;
    #ifdef USE_NORMALMAP_TCP2
        uniform sampler2D bumpMap;
        varying vec3 vTangentWS;
        varying vec3 vBitangentWS;
    #endif

    // ─── Specular ───────────────────────────────────────────────────
    uniform float useSpecular;
    uniform float specularType;        // 0=GGX, 1=Stylized, 2=Crisp
    uniform vec3  specularColor;
    uniform float specularToonSize;
    uniform float specularToonSmoothness;
    uniform float specularRoughness;
    uniform float specularMapType;     // 0=Disabled, 1..5=channel
    #ifdef USE_SPEC_MAP
        uniform sampler2D specGlossMap;
    #endif

    // ─── Emission ───────────────────────────────────────────────────
    uniform float useEmission;
    uniform float emissionChannel;     // 5=NoTex, 0=R, 1=G, 2=B, 3=A, 4=RGB
    uniform vec3  emissive;
    uniform float emissiveIntensity;
    #ifdef USE_EMISSION_MAP
        uniform sampler2D emissionMap;
    #endif

    // ─── Rim ────────────────────────────────────────────────────────
    uniform float useRim;
    uniform vec3  rimColor;
    uniform float rimMin;
    uniform float rimMax;
    uniform float useRimLightMask;

    // ─── MatCap ─────────────────────────────────────────────────────
    uniform float useMatCap;
    uniform float matcapType;          // 0=Additive, 1=Replace
    uniform vec3  matcapColor;
    uniform float useMatCapMask;
    uniform float matcapMaskChannel;   // 0=R, 1=G, 2=B, 3=A
    #ifdef USE_MATCAP
        uniform sampler2D matcap;
    #endif
    #ifdef USE_MATCAP_MASK
        uniform sampler2D matcapMask;
    #endif

    // ─── Indirect / GI ──────────────────────────────────────────────
    uniform float indirectIntensity;
    uniform float singleIndirectColor;  // toggle: lock indirect to ambient avg

    // ─── Reflections ────────────────────────────────────────────────
    uniform float useReflections;
    uniform vec3  reflectionColor;
    uniform float reflectionSmoothness;
    uniform float reflectionMapType;
    uniform float useFresnelReflections;
    uniform float fresnelMin;
    uniform float fresnelMax;
    #ifdef USE_REFLECTION_MAP
        uniform sampler2D reflectionTex;
    #endif

    // ─── Occlusion ──────────────────────────────────────────────────
    uniform float useOcclusion;
    uniform float occlusionStrength;
    uniform float occlusionChannel;     // 0=AlbedoA, 1..4=R/G/B/A custom
    #ifdef USE_OCCLUSION_MAP
        uniform sampler2D occlusionMap;
    #endif

    // ─── Receive shadows toggle ─────────────────────────────────────
    uniform float receiveShadows;

    varying vec3 vNormalWS;
    varying vec3 vNormalVS;
    varying vec3 vPositionWS;
    varying vec3 vViewDirWS;
    varying vec2 vTcpUv;

    // ─── Helpers ────────────────────────────────────────────────────
    float channelSelect(vec4 c, float ch) {
        // ch: 0=R, 1=G, 2=B, 3=A
        if (ch < 0.5)      return c.r;
        else if (ch < 1.5) return c.g;
        else if (ch < 2.5) return c.b;
        else               return c.a;
    }

    void main() {
        // ── 1. Albedo ─────────────────────────────────────────────────
        vec4 diffuseColor = vec4(diffuse, opacity);
        #include <map_fragment>

        // Màu instance (InstancedMesh.setColorAt / BatchedMesh) vào qua vColor
        #include <color_fragment>
        vec3 albedo = diffuseColor.rgb;

        // Alpha test (TCP2 _UseAlphaTest)
        if (useAlphaTest > 0.5) {
            if (diffuseColor.a < alphaCutoff) discard;
        }

        // ── 2. Normal ─────────────────────────────────────────────────
        vec3 N = normalize(vNormalWS);
        #ifdef USE_NORMALMAP_TCP2
            if (useNormalMap > 0.5) {
                vec3 nMap = texture2D(bumpMap, vTcpUv).xyz * 2.0 - 1.0;
                nMap.xy *= bumpScale;
                mat3 TBN = mat3(normalize(vTangentWS), normalize(vBitangentWS), N);
                N = normalize(TBN * nMap);
            }
        #endif
        vec3 V  = normalize(vViewDirWS);
        vec3 Nv = normalize(vNormalVS);

        // ── 3. Main directional light[0] ───────────────────────────────
        vec3 lightDir = vec3(0.0, 1.0, 0.0);
        vec3 lightCol = vec3(1.0);
        #if NUM_DIR_LIGHTS > 0
            lightDir = directionalLights[0].direction;     // view space
            lightCol = directionalLights[0].color;
        #endif
        float ndl        = dot(Nv, lightDir);
        float ndlWrapped = ndl * 0.5 + 0.5;
        ndl = clamp(ndl, 0.0, 1.0);

        // Shadow atten
        float atten = 1.0;
        #if defined(USE_SHADOWMAP) && (NUM_DIR_LIGHT_SHADOWS > 0)
            if (receiveShadows > 0.5) atten = getShadowMask();
        #endif

        // ── 4. Ramp — multi-variant ───────────────────────────────────
        float ramp;
        // legacy useRampBands forces Bands path
        float rtype = (useRampBands > 0.5 && rampType < 0.5) ? 2.0 : rampType;

        #ifdef USE_RAMP_TEXTURE
            if (rtype > 3.5) {
                // Texture ramp
                float u = clamp(ndlWrapped * rampScale + rampOffset, 0.0, 1.0);
                ramp = texture2D(rampTexture, vec2(u, 0.5)).r;
            } else
        #endif
        if (rtype > 2.5) {
            // Bands Crisp: floor only, no smoothing
            float bands = max(rampBands, 1.0);
            float s = max(rampSmoothing, 0.0001) * 0.5;
            float x = smoothstep(rampThreshold - s, rampThreshold + s, ndlWrapped);
            ramp = clamp(floor(x * bands) / bands, 0.0, 1.0);
        } else if (rtype > 1.5) {
            // Bands (smooth bands)
            float bands = max(rampBands, 1.0);
            float rs = max(rampSmoothing, 0.0001) * 0.5;
            float x = smoothstep(rampThreshold - rs, rampThreshold + rs, ndlWrapped);
            float xb = x * bands;
            float bandIdx  = floor(xb);
            float bandFrac = xb - bandIdx;
            float bandsSmooth = max(rampBandsSmoothing, 0.001) * 0.5;
            float bandSm = smoothstep(0.5 - bandsSmooth, 0.5 + bandsSmooth, bandFrac);
            ramp = clamp((bandSm + bandIdx) / bands, 0.0, 1.0);
        } else if (rtype > 0.5) {
            // Crisp (no smoothing)
            ramp = step(rampThreshold, ndlWrapped);
        } else {
            // Default
            float s = max(rampSmoothing, 0.0001);
            ramp = smoothstep(rampThreshold - s * 0.5, rampThreshold + s * 0.5, ndlWrapped);
        }
        ramp *= atten;

        // ── 5. Tint shadow ↔ highlight ─────────────────────────────
        vec3 hiTint = (shadowColorLightAtten > 0.5) ? highlightColor : highlightColor * lightCol;

        // Shadow albedo texture (TCP2_SHADOW_TEXTURE)
        vec3 shadowAlbedoTint = shadowColor;
        #ifdef USE_SHADOW_TEXTURE
            if (useShadowTexture > 0.5) {
                vec3 shadowTex = texture2D(shadowBaseMap, vTcpUv).rgb;
                shadowAlbedoTint = shadowColor * shadowTex;
            }
        #endif

        vec3 rampColor = mix(shadowAlbedoTint, hiTint, ramp);
        if (shadowColorLightAtten > 0.5) rampColor *= lightCol;

        // ── 6. color = albedo × ramp ───────────────────────────────
        vec3 color = albedo * rampColor;

        // ── 7. Indirect (ambient SH × albedo × _IndirectIntensity) ─
        vec3 indirect = ambientLightColor;
        #if NUM_HEMI_LIGHTS > 0
            for (int i = 0; i < NUM_HEMI_LIGHTS; i++) {
                float w = 0.5 * dot(N, hemisphereLights[i].direction) + 0.5;
                indirect += mix(hemisphereLights[i].groundColor, hemisphereLights[i].skyColor, w);
            }
        #endif
        // Single indirect color: clamp to grayscale average
        if (singleIndirectColor > 0.5) {
            float avg = (indirect.r + indirect.g + indirect.b) / 3.0;
            indirect = vec3(avg);
        }
        color += albedo * indirect * indirectIntensity;

        // ── 8. Occlusion (TCP2_OCCLUSION) ──────────────────────────
        float ao = 1.0;
        #ifdef USE_OCCLUSION_MAP
            if (useOcclusion > 0.5) {
                vec4 occSample = texture2D(occlusionMap, vTcpUv);
                float occCh = (occlusionChannel < 0.5) ? diffuseColor.a : channelSelect(occSample, occlusionChannel - 1.0);
                ao = mix(1.0, occCh, clamp(occlusionStrength, 0.0, 1.0));
            }
        #endif
        color *= ao;

        // ── 9. Specular ───────────────────────────────────────────
        vec3 emission = vec3(0.0);
        if (useSpecular > 0.5) {
            vec3 Lw = normalize(transpose(mat3(viewMatrix)) * lightDir);
            vec3 Hw = normalize(Lw + V);
            float nh = clamp(dot(N, Hw), 0.0, 1.0);

            // Spec map mask
            float specMask = 1.0;
            #ifdef USE_SPEC_MAP
                if (specularMapType > 0.5) {
                    vec4 specSample = texture2D(specGlossMap, vTcpUv);
                    if (specularMapType < 1.5)      specMask = diffuseColor.a;  // 1 = AlbedoA
                    else                            specMask = channelSelect(specSample, specularMapType - 2.0);
                }
            #endif

            float spec = 0.0;
            if (specularType < 0.5) {
                // GGX
                float roughness = max(specularRoughness, 0.001);
                float a = roughness * roughness;
                float a2 = a * a;
                float denom = (nh * nh) * (a2 - 1.0) + 1.0;
                spec = a2 / max(PI * denom * denom, 0.0001);
                spec = clamp(spec, 0.0, 4.0);
            } else if (specularType < 1.5) {
                // Stylized
                float specSize  = 1.0 - clamp(specularToonSize, 0.001, 0.999);
                float nhRemap   = clamp((nh - specSize) / max(1.0 - specSize, 0.001), 0.0, 1.0);
                spec            = smoothstep(0.0, max(specularToonSmoothness, 0.001), nhRemap);
            } else {
                // Crisp
                float specSize = 1.0 - clamp(specularToonSize, 0.001, 0.999);
                spec = step(specSize, nh);
            }
            emission += spec * specMask * atten * ndl * lightCol * specularColor;
        }

        // ── 10. Reflections + Fresnel ─────────────────────────────
        if (useReflections > 0.5) {
            // Fresnel mask
            float ndv = clamp(dot(V, N), 0.0, 1.0);
            float fresnel = 1.0;
            if (useFresnelReflections > 0.5) {
                fresnel = smoothstep(fresnelMin, max(fresnelMax, fresnelMin + 0.001), 1.0 - ndv);
            }
            // Simple reflection placeholder: tint by smoothness × fresnel × color.
            // Full envmap reflection có thể wire envmap sau qua define USE_REFLECTION_MAP.
            vec3 reflContrib = reflectionColor * reflectionSmoothness * fresnel;
            #ifdef USE_REFLECTION_MAP
                // Sample reflection texture as alpha-blended approximation
                reflContrib *= texture2D(reflectionTex, vTcpUv).rgb;
            #endif
            emission += reflContrib;
        }

        // ── 11. Rim ───────────────────────────────────────────────
        if (useRim > 0.5) {
            float ndv = 1.0 - clamp(dot(V, N), 0.0, 1.0);
            float rim = smoothstep(rimMin, rimMax, ndv);
            vec3 rimMask = (useRimLightMask > 0.5) ? ramp * lightCol : vec3(1.0);
            emission += rimMask * rim * rimColor;
        }

        // ── 12. MatCap ────────────────────────────────────────────
        #ifdef USE_MATCAP
            if (useMatCap > 0.5) {
                vec2 matcapUV = Nv.xy * 0.5 + 0.5;
                vec3 matcapSample = texture2D(matcap, matcapUV).rgb * matcapColor;
                float mcMask = 1.0;
                #ifdef USE_MATCAP_MASK
                    if (useMatCapMask > 0.5) {
                        vec4 maskSample = texture2D(matcapMask, vTcpUv);
                        mcMask = channelSelect(maskSample, matcapMaskChannel);
                    }
                #endif
                if (matcapType < 0.5) {
                    // Additive
                    emission += matcapSample * mcMask;
                } else {
                    // Replace (lerp into color)
                    color = mix(color, matcapSample, mcMask);
                }
            }
        #endif

        // ── 13. Emission ──────────────────────────────────────────
        if (useEmission > 0.5) {
            vec3 emCol = emissive * emissiveIntensity;
            #ifdef USE_EMISSION_MAP
                if (emissionChannel < 4.5) {
                    vec4 emSample = texture2D(emissionMap, vTcpUv);
                    if (emissionChannel < 3.5) emCol *= channelSelect(emSample, emissionChannel);
                    else                       emCol *= emSample.rgb;  // 4 = RGB
                }
            #endif
            emission += emCol;
        }

        color += emission;

        gl_FragColor = vec4(color, diffuseColor.a);

        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
    }
`;

// ═══════════════════════════════════════════════════════════════════
// JS
// ═══════════════════════════════════════════════════════════════════

/**
 * @param {Color | number | string} [value]
 * @param {number} [fallback]
 */
const toColor = (value, fallback) => (value instanceof Color ? value : new Color(value ?? fallback));

/** Toggle trong shader là float 0/1 — bool uniform trong GLSL không tiện đổi lúc chạy */
const b2f = (value) => (value ? 1 : 0);

export class ToonyColorsMaterial extends ShaderMaterial {
    /**
     * @param {object} [params] xem khối `opt` bên dưới để biết đủ bộ knob
     */
    constructor(params = {}) {
        const opt = {
            // ─ Base
            color: new Color(0xffffff),
            map: null,
            opacity: 1,
            transparent: false,
            side: FrontSide,
            useAlphaTest: false,
            alphaCutoff: 0.5,

            // ─ Shadow texture
            useShadowTexture: false,
            shadowBaseMap: null,

            // ─ Tint
            highlightColor: new Color(0xffffff),
            shadowColor: new Color(0x333333),
            shadowColorLightAtten: true,

            // ─ Ramp
            rampType: 0,
            rampThreshold: 0.75,
            rampSmoothing: 0.1,
            rampScale: 1,
            rampOffset: 0,
            rampBands: 4,
            rampBandsSmoothing: 0.1,
            rampTexture: null,
            useRampBands: false,

            // ─ Normal map
            useNormalMap: false,
            bumpMap: null,
            bumpScale: 1,

            // ─ Specular
            useSpecular: false,
            specularType: 0,
            specularColor: new Color(0xbfbfbf),
            specularToonSize: 0.25,
            specularToonSmoothness: 0.05,
            specularRoughness: 0.5,
            specularMapType: 0,
            specGlossMap: null,

            // ─ Emission
            useEmission: false,
            emissionChannel: 4,
            emissive: new Color(0x000000),
            emissiveIntensity: 1,
            emissionMap: null,

            // ─ Rim
            useRim: false,
            rimColor: new Color(0xcccccc),
            rimMin: 0.5,
            rimMax: 1,
            useRimLightMask: true,

            // ─ MatCap
            useMatCap: false,
            matcapType: 0,
            matcap: null,
            matcapColor: new Color(0xffffff),
            useMatCapMask: false,
            matcapMask: null,
            matcapMaskChannel: 0,

            // ─ Indirect / GI
            indirectIntensity: 1,
            singleIndirectColor: false,

            // ─ Reflections
            useReflections: false,
            reflectionColor: new Color(0xffffff),
            reflectionSmoothness: 0.5,
            reflectionMapType: 0,
            reflectionTex: null,
            useFresnelReflections: true,
            fresnelMin: 0,
            fresnelMax: 1.5,

            // ─ Occlusion
            useOcclusion: false,
            occlusionStrength: 1,
            occlusionMap: null,
            occlusionChannel: 0,

            // ─ Outline (uniform giữ chỗ, render pass riêng chưa làm)
            useOutline: false,
            outlineColor: new Color(0x000000),
            outlineWidth: 1,
            outlinePixelSizeType: 0,
            outlineMinWidth: 1,
            outlineMaxWidth: 1,
            outlineTextureType: 0,
            outlineTextureLOD: 5,
            normalsSource: 0,
            normalsUVType: 0,
            outlineLightingType: 0,
            directIntensityOutline: 1,
            indirectIntensityOutline: 0,

            // ─ Misc
            receiveShadows: true,

            ...params,
        };

        // Phải merge `UniformsLib.common`: nó mang theo `mapTransform` (Matrix3) mà
        // <uv_vertex> cần. ShaderMaterial KHÔNG được renderer tự refresh transform
        // uniform, thiếu nó thì mapTransform = ma trận 0 và texture chỉ lấy 1 pixel.
        const uniforms = UniformsUtils.merge([
            UniformsLib.lights,
            UniformsLib.fog,
            UniformsLib.common,
            {
                diffuse: { value: toColor(opt.color, 0xffffff) },
                map: { value: opt.map },
                opacity: { value: opt.opacity },
                useAlphaTest: { value: b2f(opt.useAlphaTest) },
                alphaCutoff: { value: opt.alphaCutoff },

                useShadowTexture: { value: b2f(opt.useShadowTexture && !!opt.shadowBaseMap) },
                shadowBaseMap: { value: opt.shadowBaseMap },

                highlightColor: { value: toColor(opt.highlightColor, 0xffffff) },
                shadowColor: { value: toColor(opt.shadowColor, 0x333333) },
                shadowColorLightAtten: { value: b2f(opt.shadowColorLightAtten) },

                rampType: { value: opt.rampType },
                rampThreshold: { value: opt.rampThreshold },
                rampSmoothing: { value: opt.rampSmoothing },
                rampScale: { value: opt.rampScale },
                rampOffset: { value: opt.rampOffset },
                rampBands: { value: opt.rampBands },
                rampBandsSmoothing: { value: opt.rampBandsSmoothing },
                rampTexture: { value: opt.rampTexture },
                useRampBands: { value: b2f(opt.useRampBands) },

                useNormalMap: { value: b2f(opt.useNormalMap && !!opt.bumpMap) },
                bumpMap: { value: opt.bumpMap },
                bumpScale: { value: opt.bumpScale },

                useSpecular: { value: b2f(opt.useSpecular) },
                specularType: { value: opt.specularType },
                specularColor: { value: toColor(opt.specularColor, 0xbfbfbf) },
                specularToonSize: { value: opt.specularToonSize },
                specularToonSmoothness: { value: opt.specularToonSmoothness },
                specularRoughness: { value: opt.specularRoughness },
                specularMapType: { value: opt.specularMapType },
                specGlossMap: { value: opt.specGlossMap },

                useEmission: { value: b2f(opt.useEmission) },
                emissionChannel: { value: opt.emissionChannel },
                emissive: { value: toColor(opt.emissive, 0x000000) },
                emissiveIntensity: { value: opt.emissiveIntensity },
                emissionMap: { value: opt.emissionMap },

                useRim: { value: b2f(opt.useRim) },
                rimColor: { value: toColor(opt.rimColor, 0xcccccc) },
                rimMin: { value: opt.rimMin },
                rimMax: { value: opt.rimMax },
                useRimLightMask: { value: b2f(opt.useRimLightMask) },

                useMatCap: { value: b2f(opt.useMatCap && !!opt.matcap) },
                matcapType: { value: opt.matcapType },
                matcap: { value: opt.matcap },
                matcapColor: { value: toColor(opt.matcapColor, 0xffffff) },
                useMatCapMask: { value: b2f(opt.useMatCapMask && !!opt.matcapMask) },
                matcapMask: { value: opt.matcapMask },
                matcapMaskChannel: { value: opt.matcapMaskChannel },

                indirectIntensity: { value: opt.indirectIntensity },
                singleIndirectColor: { value: b2f(opt.singleIndirectColor) },

                useReflections: { value: b2f(opt.useReflections) },
                reflectionColor: { value: toColor(opt.reflectionColor, 0xffffff) },
                reflectionSmoothness: { value: opt.reflectionSmoothness },
                reflectionMapType: { value: opt.reflectionMapType },
                reflectionTex: { value: opt.reflectionTex },
                useFresnelReflections: { value: b2f(opt.useFresnelReflections) },
                fresnelMin: { value: opt.fresnelMin },
                fresnelMax: { value: opt.fresnelMax },

                useOcclusion: { value: b2f(opt.useOcclusion && !!opt.occlusionMap) },
                occlusionStrength: { value: opt.occlusionStrength },
                occlusionMap: { value: opt.occlusionMap },
                occlusionChannel: { value: opt.occlusionChannel },

                useOutline: { value: b2f(opt.useOutline) },
                outlineColor: { value: toColor(opt.outlineColor, 0x000000) },
                outlineWidth: { value: opt.outlineWidth },
                outlinePixelSizeType: { value: opt.outlinePixelSizeType },
                outlineMinWidth: { value: opt.outlineMinWidth },
                outlineMaxWidth: { value: opt.outlineMaxWidth },
                outlineTextureType: { value: opt.outlineTextureType },
                outlineTextureLOD: { value: opt.outlineTextureLOD },
                normalsSource: { value: opt.normalsSource },
                normalsUVType: { value: opt.normalsUVType },
                outlineLightingType: { value: opt.outlineLightingType },
                directIntensityOutline: { value: opt.directIntensityOutline },
                indirectIntensityOutline: { value: opt.indirectIntensityOutline },

                receiveShadows: { value: b2f(opt.receiveShadows) },
            },
        ]);

        const defines = {};

        // USE_MAP do three tự thêm (nó đọc `material.map` qua accessor), ở đây chỉ
        // cần USE_UV để <uv_vertex> nhả varying uv ra.
        if (opt.map) defines.USE_UV = "";
        if (opt.useNormalMap && opt.bumpMap) defines.USE_NORMALMAP_TCP2 = "";
        if (opt.useShadowTexture && opt.shadowBaseMap) defines.USE_SHADOW_TEXTURE = "";
        if (opt.rampTexture) defines.USE_RAMP_TEXTURE = "";
        if (opt.useMatCap && opt.matcap) defines.USE_MATCAP = "";
        if (opt.useMatCapMask && opt.matcapMask) defines.USE_MATCAP_MASK = "";
        if (opt.useReflections && opt.reflectionTex) defines.USE_REFLECTION_MAP = "";
        if (opt.useOcclusion && opt.occlusionMap) defines.USE_OCCLUSION_MAP = "";
        if (opt.useEmission && opt.emissionMap) defines.USE_EMISSION_MAP = "";
        if (opt.specularMapType > 0 && opt.specGlossMap) defines.USE_SPEC_MAP = "";

        super({
            uniforms,
            vertexShader,
            fragmentShader,
            defines,
            lights: true,
            fog: true,
            transparent: opt.transparent,
            opacity: opt.opacity,
            side: opt.side,
        });

        this.isToonyColorsMaterial = true;
    }

    /**
     * @private Lật define rồi bắt compile lại
     */
    _toggleDefine(name, on) {
        if (on) this.defines[name] = "";
        else delete this.defines[name];

        this.needsUpdate = true;
    }

    /**
     * @private Đổi texture. CÓ / KHÔNG có texture là 2 shader khác nhau nên phải
     * lật define; còn đổi từ texture này sang texture khác thì không cần compile lại.
     */
    _setTexture(uniformName, defineName, value) {
        const had = !!this.uniforms[uniformName].value;

        this.uniforms[uniformName].value = value;

        if (!!value !== had) this._toggleDefine(defineName, !!value);
    }

    // ─── Base ─────────────────────────────────────────────────────
    get color() { return this.uniforms.diffuse.value; }
    set color(value) { this.uniforms.diffuse.value = toColor(value); }

    get map() { return this.uniforms.map.value; }
    set map(value) { this._setTexture("map", "USE_UV", value); }

    get useAlphaTest() { return this.uniforms.useAlphaTest.value > 0.5; }
    set useAlphaTest(value) { this.uniforms.useAlphaTest.value = b2f(value); }

    get alphaCutoff() { return this.uniforms.alphaCutoff.value; }
    set alphaCutoff(value) { this.uniforms.alphaCutoff.value = value; }

    // ─── Shadow texture ───────────────────────────────────────────
    get useShadowTexture() { return this.uniforms.useShadowTexture.value > 0.5; }
    set useShadowTexture(value) {
        this.uniforms.useShadowTexture.value = b2f(value && this.uniforms.shadowBaseMap.value);
    }

    get shadowBaseMap() { return this.uniforms.shadowBaseMap.value; }
    set shadowBaseMap(value) { this._setTexture("shadowBaseMap", "USE_SHADOW_TEXTURE", value); }

    // ─── Tint ─────────────────────────────────────────────────────
    get highlightColor() { return this.uniforms.highlightColor.value; }
    set highlightColor(value) { this.uniforms.highlightColor.value = toColor(value); }

    get shadowColor() { return this.uniforms.shadowColor.value; }
    set shadowColor(value) { this.uniforms.shadowColor.value = toColor(value); }

    get shadowColorLightAtten() { return this.uniforms.shadowColorLightAtten.value > 0.5; }
    set shadowColorLightAtten(value) { this.uniforms.shadowColorLightAtten.value = b2f(value); }

    // ─── Ramp ─────────────────────────────────────────────────────
    get rampType() { return this.uniforms.rampType.value; }
    set rampType(value) { this.uniforms.rampType.value = value; }

    get rampThreshold() { return this.uniforms.rampThreshold.value; }
    set rampThreshold(value) { this.uniforms.rampThreshold.value = value; }

    get rampSmoothing() { return this.uniforms.rampSmoothing.value; }
    set rampSmoothing(value) { this.uniforms.rampSmoothing.value = value; }

    get rampScale() { return this.uniforms.rampScale.value; }
    set rampScale(value) { this.uniforms.rampScale.value = value; }

    get rampOffset() { return this.uniforms.rampOffset.value; }
    set rampOffset(value) { this.uniforms.rampOffset.value = value; }

    get rampBands() { return this.uniforms.rampBands.value; }
    set rampBands(value) { this.uniforms.rampBands.value = value; }

    get rampBandsSmoothing() { return this.uniforms.rampBandsSmoothing.value; }
    set rampBandsSmoothing(value) { this.uniforms.rampBandsSmoothing.value = value; }

    get useRampBands() { return this.uniforms.useRampBands.value > 0.5; }
    set useRampBands(value) { this.uniforms.useRampBands.value = b2f(value); }

    get rampTexture() { return this.uniforms.rampTexture.value; }
    set rampTexture(value) { this._setTexture("rampTexture", "USE_RAMP_TEXTURE", value); }

    // ─── Normal map ───────────────────────────────────────────────
    get useNormalMap() { return this.uniforms.useNormalMap.value > 0.5; }
    set useNormalMap(value) {
        this.uniforms.useNormalMap.value = b2f(value && this.uniforms.bumpMap.value);
    }

    get bumpMap() { return this.uniforms.bumpMap.value; }
    set bumpMap(value) { this._setTexture("bumpMap", "USE_NORMALMAP_TCP2", value); }

    get bumpScale() { return this.uniforms.bumpScale.value; }
    set bumpScale(value) { this.uniforms.bumpScale.value = value; }

    // ─── Specular ─────────────────────────────────────────────────
    get useSpecular() { return this.uniforms.useSpecular.value > 0.5; }
    set useSpecular(value) { this.uniforms.useSpecular.value = b2f(value); }

    get specularType() { return this.uniforms.specularType.value; }
    set specularType(value) { this.uniforms.specularType.value = value; }

    get specularColor() { return this.uniforms.specularColor.value; }
    set specularColor(value) { this.uniforms.specularColor.value = toColor(value); }

    get specularToonSize() { return this.uniforms.specularToonSize.value; }
    set specularToonSize(value) { this.uniforms.specularToonSize.value = value; }

    get specularToonSmoothness() { return this.uniforms.specularToonSmoothness.value; }
    set specularToonSmoothness(value) { this.uniforms.specularToonSmoothness.value = value; }

    get specularRoughness() { return this.uniforms.specularRoughness.value; }
    set specularRoughness(value) { this.uniforms.specularRoughness.value = value; }

    get specularMapType() { return this.uniforms.specularMapType.value; }
    set specularMapType(value) { this.uniforms.specularMapType.value = value; }

    get specGlossMap() { return this.uniforms.specGlossMap.value; }
    set specGlossMap(value) { this._setTexture("specGlossMap", "USE_SPEC_MAP", value); }

    // ─── Emission ─────────────────────────────────────────────────
    get useEmission() { return this.uniforms.useEmission.value > 0.5; }
    set useEmission(value) { this.uniforms.useEmission.value = b2f(value); }

    get emissionChannel() { return this.uniforms.emissionChannel.value; }
    set emissionChannel(value) { this.uniforms.emissionChannel.value = value; }

    get emissive() { return this.uniforms.emissive.value; }
    set emissive(value) { this.uniforms.emissive.value = toColor(value); }

    get emissiveIntensity() { return this.uniforms.emissiveIntensity.value; }
    set emissiveIntensity(value) { this.uniforms.emissiveIntensity.value = value; }

    get emissionMap() { return this.uniforms.emissionMap.value; }
    set emissionMap(value) { this._setTexture("emissionMap", "USE_EMISSION_MAP", value); }

    // ─── Rim ──────────────────────────────────────────────────────
    get useRim() { return this.uniforms.useRim.value > 0.5; }
    set useRim(value) { this.uniforms.useRim.value = b2f(value); }

    get rimColor() { return this.uniforms.rimColor.value; }
    set rimColor(value) { this.uniforms.rimColor.value = toColor(value); }

    get rimMin() { return this.uniforms.rimMin.value; }
    set rimMin(value) { this.uniforms.rimMin.value = value; }

    get rimMax() { return this.uniforms.rimMax.value; }
    set rimMax(value) { this.uniforms.rimMax.value = value; }

    get useRimLightMask() { return this.uniforms.useRimLightMask.value > 0.5; }
    set useRimLightMask(value) { this.uniforms.useRimLightMask.value = b2f(value); }

    // ─── MatCap ───────────────────────────────────────────────────
    get useMatCap() { return this.uniforms.useMatCap.value > 0.5; }
    set useMatCap(value) {
        this.uniforms.useMatCap.value = b2f(value && this.uniforms.matcap.value);
    }

    get matcapType() { return this.uniforms.matcapType.value; }
    set matcapType(value) { this.uniforms.matcapType.value = value; }

    get matcap() { return this.uniforms.matcap.value; }
    set matcap(value) {
        this._setTexture("matcap", "USE_MATCAP", value);
        this.uniforms.useMatCap.value = b2f(value);
    }

    get matcapColor() { return this.uniforms.matcapColor.value; }
    set matcapColor(value) { this.uniforms.matcapColor.value = toColor(value); }

    get useMatCapMask() { return this.uniforms.useMatCapMask.value > 0.5; }
    set useMatCapMask(value) {
        this.uniforms.useMatCapMask.value = b2f(value && this.uniforms.matcapMask.value);
    }

    get matcapMask() { return this.uniforms.matcapMask.value; }
    set matcapMask(value) { this._setTexture("matcapMask", "USE_MATCAP_MASK", value); }

    get matcapMaskChannel() { return this.uniforms.matcapMaskChannel.value; }
    set matcapMaskChannel(value) { this.uniforms.matcapMaskChannel.value = value; }

    // ─── Indirect / GI ────────────────────────────────────────────
    get indirectIntensity() { return this.uniforms.indirectIntensity.value; }
    set indirectIntensity(value) { this.uniforms.indirectIntensity.value = value; }

    get singleIndirectColor() { return this.uniforms.singleIndirectColor.value > 0.5; }
    set singleIndirectColor(value) { this.uniforms.singleIndirectColor.value = b2f(value); }

    // ─── Reflections ──────────────────────────────────────────────
    get useReflections() { return this.uniforms.useReflections.value > 0.5; }
    set useReflections(value) { this.uniforms.useReflections.value = b2f(value); }

    get reflectionColor() { return this.uniforms.reflectionColor.value; }
    set reflectionColor(value) { this.uniforms.reflectionColor.value = toColor(value); }

    get reflectionSmoothness() { return this.uniforms.reflectionSmoothness.value; }
    set reflectionSmoothness(value) { this.uniforms.reflectionSmoothness.value = value; }

    get reflectionMapType() { return this.uniforms.reflectionMapType.value; }
    set reflectionMapType(value) { this.uniforms.reflectionMapType.value = value; }

    get reflectionTex() { return this.uniforms.reflectionTex.value; }
    set reflectionTex(value) { this._setTexture("reflectionTex", "USE_REFLECTION_MAP", value); }

    get useFresnelReflections() { return this.uniforms.useFresnelReflections.value > 0.5; }
    set useFresnelReflections(value) { this.uniforms.useFresnelReflections.value = b2f(value); }

    get fresnelMin() { return this.uniforms.fresnelMin.value; }
    set fresnelMin(value) { this.uniforms.fresnelMin.value = value; }

    get fresnelMax() { return this.uniforms.fresnelMax.value; }
    set fresnelMax(value) { this.uniforms.fresnelMax.value = value; }

    // ─── Occlusion ────────────────────────────────────────────────
    get useOcclusion() { return this.uniforms.useOcclusion.value > 0.5; }
    set useOcclusion(value) {
        this.uniforms.useOcclusion.value = b2f(value && this.uniforms.occlusionMap.value);
    }

    get occlusionStrength() { return this.uniforms.occlusionStrength.value; }
    set occlusionStrength(value) { this.uniforms.occlusionStrength.value = value; }

    get occlusionMap() { return this.uniforms.occlusionMap.value; }
    set occlusionMap(value) { this._setTexture("occlusionMap", "USE_OCCLUSION_MAP", value); }

    get occlusionChannel() { return this.uniforms.occlusionChannel.value; }
    set occlusionChannel(value) { this.uniforms.occlusionChannel.value = value; }

    // ─── Outline (uniform giữ chỗ, chưa có render pass) ───────────
    get useOutline() { return this.uniforms.useOutline.value > 0.5; }
    set useOutline(value) { this.uniforms.useOutline.value = b2f(value); }

    get outlineColor() { return this.uniforms.outlineColor.value; }
    set outlineColor(value) { this.uniforms.outlineColor.value = toColor(value); }

    get outlineWidth() { return this.uniforms.outlineWidth.value; }
    set outlineWidth(value) { this.uniforms.outlineWidth.value = value; }

    get outlinePixelSizeType() { return this.uniforms.outlinePixelSizeType.value; }
    set outlinePixelSizeType(value) { this.uniforms.outlinePixelSizeType.value = value; }

    get outlineMinWidth() { return this.uniforms.outlineMinWidth.value; }
    set outlineMinWidth(value) { this.uniforms.outlineMinWidth.value = value; }

    get outlineMaxWidth() { return this.uniforms.outlineMaxWidth.value; }
    set outlineMaxWidth(value) { this.uniforms.outlineMaxWidth.value = value; }

    get outlineTextureType() { return this.uniforms.outlineTextureType.value; }
    set outlineTextureType(value) { this.uniforms.outlineTextureType.value = value; }

    get outlineTextureLOD() { return this.uniforms.outlineTextureLOD.value; }
    set outlineTextureLOD(value) { this.uniforms.outlineTextureLOD.value = value; }

    get normalsSource() { return this.uniforms.normalsSource.value; }
    set normalsSource(value) { this.uniforms.normalsSource.value = value; }

    get normalsUVType() { return this.uniforms.normalsUVType.value; }
    set normalsUVType(value) { this.uniforms.normalsUVType.value = value; }

    get outlineLightingType() { return this.uniforms.outlineLightingType.value; }
    set outlineLightingType(value) { this.uniforms.outlineLightingType.value = value; }

    get directIntensityOutline() { return this.uniforms.directIntensityOutline.value; }
    set directIntensityOutline(value) { this.uniforms.directIntensityOutline.value = value; }

    get indirectIntensityOutline() { return this.uniforms.indirectIntensityOutline.value; }
    set indirectIntensityOutline(value) { this.uniforms.indirectIntensityOutline.value = value; }

    // ─── Misc ─────────────────────────────────────────────────────
    get receiveShadows() { return this.uniforms.receiveShadows.value > 0.5; }
    set receiveShadows(value) { this.uniforms.receiveShadows.value = b2f(value); }
}

// ═══════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════

/** Tên cũ trong bản gốc — giữ để code cũ import không gãy */
export const ToonShadowMaterial = ToonyColorsMaterial;
export const ToonShaderMaterial = ToonyColorsMaterial;

/**
 * @param {object} [options] như constructor, thêm alias `albedoMap` cho `map`
 */
export function createToonMaterial(options = {}) {
    const { albedoMap, ...rest } = options;

    return new ToonyColorsMaterial({
        ...rest,
        map: rest.map ?? albedoMap ?? null,
    });
}

/**
 * Material cho MESH VỎ dùng làm outline: phình đỉnh theo normal rồi vẽ mặt sau.
 *
 * Đây là material THỨ HAI, không phải một phần của `ToonyColorsMaterial` — bản
 * Unity làm outline bằng 1 render pass riêng nên ở three cũng phải thêm 1 mesh
 * nữa (clone geometry, gán material này, add cạnh mesh gốc).
 *
 * @param {{ thickness?: number, color?: number | Color }} [options]
 */
export function createOutlineShellMaterial({ thickness = 0.02, color = 0x000000 } = {}) {
    return new ShaderMaterial({
        uniforms: {
            thickness: { value: thickness },
            outlineColor: { value: toColor(color, 0x000000) },
        },
        vertexShader: /* glsl */`
            uniform float thickness;

            void main() {
                vec3 extruded = position + normalize(normal) * thickness;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(extruded, 1.0);
            }
        `,
        fragmentShader: /* glsl */`
            uniform vec3 outlineColor;

            void main() {
                gl_FragColor = vec4(outlineColor, 1.0);
            }
        `,
        side: BackSide,
        depthWrite: true,
        depthTest: true,
    });
}

export const ToonShader = {
    createMaterial: createToonMaterial,
    createOutlineShell: createOutlineShellMaterial,
    Material: ToonyColorsMaterial,
};

export default ToonShader;
