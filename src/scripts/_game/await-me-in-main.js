import { bootstrap } from "../../engine/domain/bootstrap";
import { GameScene } from "./_scene/game-scene";
import { DESIGN_HEIGHT, DESIGN_WIDTH } from "./data/scene-config";

/**
 * Điểm vào của game — `main.js` chỉ cần `await runGame()`.
 *
 * `designWidth` / `designHeight` là cỡ ảnh nền 1376×768, không phải cỡ cửa
 * sổ. Engine quy đổi cửa sổ thật về không gian logic (màn ngang: giữ chiều
 * cao 768) rồi `_scene/stage-view.js` đặt khung ảnh vào giữa.
 */
export async function runGame() {
    return bootstrap(GameScene, {
        designWidth: DESIGN_WIDTH,
        designHeight: DESIGN_HEIGHT,
    });
}
