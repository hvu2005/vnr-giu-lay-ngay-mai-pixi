import { CurvePathSampler } from "../shared/curve-path-sampler.js";
import { computeLogicalSize } from "../domain/viewport-policy.js";
import { ObjectPool } from "../shared/object-pool.js";
import { EventEmitter } from "../shared/event-emitter.js";

let fail = 0;
const ok = (name, cond, extra = "") => {
    console.log(`${cond ? "  ok  " : "  FAIL"} ${name} ${extra}`);
    if (!cond) fail++;
};

// --- viewport-policy: portrait fit-width, landscape fit-height
const p = computeLogicalSize(500, 1000, 1028, 783);
ok("portrait giữ nguyên designWidth", p.width === 1028);
ok("portrait cao gấp đôi rộng", Math.abs(p.height - 2056) < 0.01, `h=${p.height.toFixed(1)}`);

const l = computeLogicalSize(1600, 800, 1028, 783);
ok("landscape giữ nguyên designHeight", l.height === 783);
ok("landscape rộng = 2x cao", Math.abs(l.width - 1566) < 1, `w=${l.width.toFixed(1)}`);

// --- CurvePathSampler trên hình vuông cạnh 10, không cần three
const square = [{ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }, { x: 10, y: 10, z: 0 }, { x: 0, y: 10, z: 0 }];
const path = new CurvePathSampler(square, { loop: true });

ok("chu vi = 40", Math.abs(path.totalLength - 40) < 1e-9, `=${path.totalLength}`);

const pos = { x: 0, y: 0, z: 0 }, tan = { x: 0, y: 0, z: 0 };
path.sampleByDistance(5, pos, tan);
ok("d=5 → giữa cạnh dưới", Math.abs(pos.x - 5) < 1e-9 && Math.abs(pos.y) < 1e-9, `(${pos.x},${pos.y})`);
ok("tiếp tuyến hướng +x", Math.abs(tan.x - 1) < 1e-9, `(${tan.x},${tan.y})`);

path.sampleByDistance(15, pos, tan);
ok("d=15 → giữa cạnh phải", Math.abs(pos.x - 10) < 1e-9 && Math.abs(pos.y - 5) < 1e-9, `(${pos.x},${pos.y})`);

ok("wrap 45 → 5", Math.abs(path.wrapDistance(45) - 5) < 1e-9);
ok("wrap -5 → 35", Math.abs(path.wrapDistance(-5) - 35) < 1e-9);
ok("nearest của (10,10)", path.findNearestDistance({ x: 10, y: 10, z: 0 }) === 20);
ok("boundsX = 0..10", path.getBoundsX().min === 0 && path.getBoundsX().max === 10);

// --- ObjectPool / EventEmitter
const pool = new ObjectPool(() => ({ n: 0 }), 2);
const a = pool.get(); pool.release(a);
ok("pool tái dùng object", pool.get() === a);

let got = null;
const bus = new EventEmitter();
const handler = (v) => (got = v);
bus.on("hit", handler);
bus.emit("hit", 42);
bus.off("hit", handler);
bus.emit("hit", 7);
ok("emitter on/emit/off", got === 42);

console.log(fail ? `\n${fail} test HỎNG` : "\nTất cả test đạt — chạy trong node, không DOM, không WebGL");
process.exit(fail ? 1 : 0);
