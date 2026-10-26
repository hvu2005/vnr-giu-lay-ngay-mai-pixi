/**
 * Hợp đồng của mọi renderer. `Scene` chỉ biết đến type này, không biết
 * Pixi hay Three tồn tại.
 *
 * Vòng đời do Scene gọi: init → (resize, update)* → dispose
 *
 * @abstract
 */
export class RendererPort {
    /**
     * @returns {Promise<void>}
     */
    async init() {
        throw new Error("RendererPort.init chưa hiện thực");
    }

    /**
     * @param {number} dt giây, đã clamp bởi bootstrap
     */
    update(dt) {
        throw new Error("RendererPort.update chưa hiện thực");
    }

    /**
     * Kích thước LOGIC (design space), KHÔNG phải pixel màn hình.
     * Adapter tự lo phần CSS pixel của canvas.
     *
     * @param {number} width
     * @param {number} height
     */
    resize(width, height) {
    }

    /**
     * `object` là type của adapter (Container của pixi, Object3D của three).
     * Scene chỉ chuyển tiếp chứ KHÔNG đọc thuộc tính nào của nó — đó là điều
     * kiện để đánh đổi này chấp nhận được.
     *
     * @param {*} object
     * @returns {*} chính object đó, để gọi chuỗi
     */
    add(object) {
        throw new Error("RendererPort.add chưa hiện thực");
    }

    /**
     * @param {*} object
     */
    remove(object) {
        throw new Error("RendererPort.remove chưa hiện thực");
    }

    dispose() {
    }
}
