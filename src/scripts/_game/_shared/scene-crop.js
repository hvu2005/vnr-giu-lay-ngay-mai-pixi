import { Container, Graphics, Sprite } from "pixi.js";

import { AMBIENCE } from "../data/ambience";
import LAYOUT from "../data/layout.generated.json";
import { LAYOUT_OVERRIDES } from "../data/layout-overrides";
import { assetByPath } from "./asset-path";

/**
 * Ảnh của một vật trong thẻ tư liệu / bộ sưu tập = KHUNG CẢNH quanh vật, cắt
 * từ chính cảnh trong game — không phải sprite cắt rời.
 *
 * Sprite cắt rời đứng một mình trên giấy lộ mọi lỗi mặt nạ: mép răng cưa, mảng
 * nền dính theo, chỗ bị vật khác che thành khúc cụt (góp ý duyệt 11/2026: "ảnh
 * trong popup bị cắt một khúc, vỡ"). Khung cảnh thì vật luôn nguyên vẹn vì đứng
 * đúng chỗ của nó giữa nền.
 *
 * Nền `bg.webp` là ảnh CLEAN — người, cờ đã bị xoá. Nên dựng lại đủ lớp như
 * prop-layer (nền → phần dư → bóng → nhân vật nền → vật theo chiều sâu), không thì khung
 * quanh nhóm biệt động thiếu cánh cửa đè đúng, khung quanh micro mất Bác.
 */

/**
 * Cả cảnh dựng lại, toạ độ thiết kế (1376×768). Tĩnh: không thở, không cờ bay.
 *
 * @param {string} key
 * @returns {Container}
 */
export function sceneComposite(key) {
    const layout = LAYOUT[key];
    const base = 1 / (layout.artScale ?? 1);
    const amb = AMBIENCE[key] ?? {};
    const overrides = LAYOUT_OVERRIDES[key] ?? {};

    const root = new Container();
    const bg = new Sprite(assetByPath(layout.bg));
    bg.scale.set(base);
    const rests = new Container();
    const shadows = new Container();
    const bodies = new Container();
    root.addChild(bg, rests, shadows, bodies);

    const place = (info) => {
        if (info.rest) {
            const rest = new Sprite(assetByPath(info.rest.file));
            rest.scale.set(base);
            rest.position.set(info.rest.x, info.rest.y);
            rests.addChild(rest);
        }
        if (info.shadow) {
            const shadow = new Sprite(assetByPath(info.shadow.file));
            shadow.scale.set(base);
            shadow.position.set(info.shadow.x, info.shadow.y);
            shadows.addChild(shadow);
        }
        const sprite = new Sprite(assetByPath(info.file));
        sprite.scale.set(base);
        sprite.position.set(info.x, info.y);
        return sprite;
    };

    for (const info of layout.actors ?? []) bodies.addChild(place(info));

    // Thứ tự vẽ giống prop-layer: chân thấp hơn vẽ sau; `z` của ambience ưu tiên.
    Object.entries(layout.props)
        .map(([id, info]) => {
            const moved = overrides[id];
            const p = moved ? { ...info, x: moved.x, y: moved.y } : info;
            return { sprite: place(p), depth: amb.props?.[id]?.z ?? p.y + p.h };
        })
        .sort((a, b) => a.depth - b.depth)
        .forEach((e) => bodies.addChild(e.sprite));

    return root;
}

/**
 * Khung `w × h` px cắt quanh vật `id`: vật chiếm ~1/pad khung, ở giữa; khung
 * chạm mép cảnh thì trượt vào trong (vật lệch tâm) chứ không lộ khoảng trống.
 *
 * @param {string} key
 * @param {string} id
 * @param {number} w
 * @param {number} h
 * @param {{ pad?: number, min?: number }} [opt]
 *   pad: khung rộng gấp mấy lần cạnh dài của vật (mặc định 1.35);
 *   min: cạnh ngắn nhất của khung, px thiết kế — vật nhỏ (lịch, micro) không
 *   bị phóng vỡ hạt (mặc định 170).
 * @returns {Container} gốc (0, 0), cỡ đúng w × h, đã gắn mask
 */
export function sceneCrop(key, id, w, h, opt = {}) {
    const layout = LAYOUT[key];
    const info = { ...layout.props[id], ...(LAYOUT_OVERRIDES[key]?.[id] ?? {}) };
    const pad = opt.pad ?? 1.35;
    const aspect = w / h;

    let ch = Math.max(info.h * pad, (info.w * pad) / aspect, opt.min ?? 170);
    let cw = ch * aspect;
    const fit = Math.min(1, layout.width / cw, layout.height / ch);
    cw *= fit;
    ch *= fit;

    const cx = Math.min(Math.max(info.x + info.w / 2 - cw / 2, 0), layout.width - cw);
    const cy = Math.min(Math.max(info.y + info.h / 2 - ch / 2, 0), layout.height - ch);

    const k = w / cw;
    const scene = sceneComposite(key);
    scene.scale.set(k);
    scene.position.set(-cx * k, -cy * k);

    const mask = new Graphics().rect(0, 0, w, h).fill(0xffffff);
    const box = new Container();
    box.addChild(scene, mask);
    box.mask = mask;
    return box;
}

/**
 * File ảnh đại diện của vật: bản ISOLATE nếu có (Gemini vẽ lại riêng vật, đủ
 * hình — tools/prepare-assets.py `isolate_asset`), không thì sprite cắt từ cảnh.
 * Dùng cho bóng đen / ảnh nhỏ ở thanh dưới và bộ sưu tập.
 *
 * @param {string} key
 * @param {string} id
 * @returns {string}
 */
export function itemImageFile(key, id) {
    const info = LAYOUT[key].props[id];
    return info.iso?.file ?? info.file;
}

/**
 * Ảnh vật trong thẻ tư liệu / bộ sưu tập, cỡ `w × h`. Có bản isolate → vật đứng
 * một mình, đủ hình, trên nền giấy ngà (góp ý 11/2026: "isolate nhìn đẹp hơn");
 * chưa có → khung cảnh quanh vật (`sceneCrop`).
 *
 * @param {string} key
 * @param {string} id
 * @param {number} w
 * @param {number} h
 * @param {{ pad?: number, min?: number }} [opt] chỉ dùng khi về `sceneCrop`
 * @returns {{ view: Container, isolated: boolean }}
 */
export function itemPhoto(key, id, w, h, opt = {}) {
    const iso = LAYOUT[key].props[id].iso;
    if (!iso) return { view: sceneCrop(key, id, w, h, opt), isolated: false };

    const box = new Container();
    box.addChild(new Graphics().rect(0, 0, w, h).fill(0xf1e6cb));
    // Quầng sáng giữa khung cho vật nổi lên khỏi giấy.
    box.addChild(new Graphics().ellipse(w / 2, h / 2, w * 0.42, h * 0.42).fill({ color: 0xfbf4e2, alpha: 0.7 }));
    const sprite = new Sprite(assetByPath(iso.file));
    const k = Math.min((w * 0.86) / iso.w, (h * 0.86) / iso.h);
    sprite.anchor.set(0.5);
    sprite.scale.set(k);
    sprite.position.set(w / 2, h / 2);
    box.addChild(sprite);
    return { view: box, isolated: true };
}
