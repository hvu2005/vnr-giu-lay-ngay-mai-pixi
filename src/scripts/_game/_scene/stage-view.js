import { Container, Graphics } from "pixi.js";

import { DESIGN_HEIGHT, DESIGN_WIDTH } from "../data/scene-config";

/**
 * Cầu nối DUY NHẤT giữa pixel ảnh nền (1376×768) và pixel logic của pixi.
 *
 * Mọi layer dựng nội dung trong `frame` bằng đúng toạ độ của ảnh nền — cùng hệ
 * với `manifest.json` và `layout.generated.json` — rồi class này co giãn cả
 * khung vào màn hình theo kiểu CONTAIN (vừa khít, giữ tỉ lệ, dư thì chừa viền).
 * Không layer nào tự nhân chia tỉ lệ màn hình.
 *
 * ── VÌ SAO CONTAIN CHỨ KHÔNG COVER ─────────────────────────────────────────
 *
 * Vật thể nằm sát mép ảnh (thùng thư scene 2 ở x≈1350, cột mốc chiếm cả mép
 * dưới scene 10). Cover trên màn 4:3 sẽ cắt mất gần 1/4 bề ngang — tức cắt
 * mất vật người chơi PHẢI tìm. Viền đen hai bên là cái giá rẻ hơn.
 *
 * Hai lớp con:
 *   · `world` — khung cảnh, có mặt nạ đúng khung ảnh: khói, chim, cánh hoa
 *     bay ra ngoài khung thì bị cắt thay vì tràn lên viền đen.
 *   · `ui`    — HUD và các màn phủ, cũng trong toạ độ ảnh nền nhưng không bị cắt.
 */
export class StageView {
    constructor() {
        this.root = new Container();

        /** Nền viền (letterbox) — phủ toàn màn logic, nằm dưới khung. */
        this.letterbox = new Graphics();

        this.frame = new Container();
        this.world = new Container();
        this.ui = new Container();

        const clip = new Graphics().rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT).fill(0xffffff);
        this.world.addChild(clip);
        this.world.mask = clip;

        this.frame.addChild(this.world, this.ui);
        this.root.addChild(this.letterbox, this.frame);

        this.scale = 1;
        this.width = DESIGN_WIDTH;
        this.height = DESIGN_HEIGHT;
    }

    /**
     * @param {number} width kích thước LOGIC từ `Scene.resize`
     * @param {number} height
     */
    resize(width, height) {
        this.width = width;
        this.height = height;

        const s = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);

        this.scale = s;
        this.frame.scale.set(s);
        this.frame.position.set((width - DESIGN_WIDTH * s) / 2, (height - DESIGN_HEIGHT * s) / 2);

        this.letterbox.clear().rect(0, 0, width, height).fill(0x120c08);
    }

    /**
     * Toạ độ màn hình (event.global) → pixel ảnh nền.
     *
     * @param {import("pixi.js").PointData} global
     */
    toArt(global) {
        return this.frame.toLocal(global);
    }
}
