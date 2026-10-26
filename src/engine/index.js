/**
 * PUBLIC API của engine. Game chỉ nên import từ file này.
 *
 * ⛔ KHÔNG export bất cứ thứ gì trong `adapters/`: game import thẳng adapter thì
 *    thư viện tương ứng vào bundle bất kể cờ trong `module.config.json` — cờ mất
 *    tác dụng. Cần một năng lực của adapter thì đưa nó lên `ports/`
 *    (ví dụ `PhysicsPort.createCollider`).
 */

export { bootstrap } from "./domain/bootstrap";
export { Scene } from "./domain/scene";
export { computeLogicalSize } from "./domain/viewport-policy";

export { RendererPort } from "./ports/renderer";
export { PhysicsPort } from "./ports/physics";
export { ProfilerPort } from "./ports/profiler";

// Asset tự sinh từ `drop-assets-in-me/`. `assets.js` do tooling/auto-assets.js
// viết ra — thả file vào thư mục đó rồi `npm run app` là có key mới ở đây.
export { ASSET, ASSET_SKIPPED, loadAssets } from "./tooling/assets";

export { EventEmitter } from "./shared/event-emitter";
export { ObjectPool } from "./shared/object-pool";
export { CurvePathSampler } from "./shared/curve-path-sampler";

// `createRoundedRectCurve` KHÔNG ở đây: nó cần `CatmullRomCurve3` nên nằm ở
// `adapters/three/extensions/rounded-rect-curve.js`. Export nó từ public API
// sẽ kéo three vào MỌI build, kể cả bản 2D thuần.
