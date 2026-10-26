/**
 * Hợp đồng của công cụ đo hiệu năng. `Scene` gọi `begin()` đầu frame và
 * `end()` cuối frame — khoảng giữa hai lời gọi CHÍNH LÀ thứ được đo.
 *
 * @abstract
 */
export class ProfilerPort {
    /** Mốc bắt đầu frame. */
    begin() {
        throw new Error("ProfilerPort.begin chưa hiện thực");
    }

    /** Mốc kết thúc frame — chênh lệch với `begin()` là thời gian một frame. */
    end() {
        throw new Error("ProfilerPort.end chưa hiện thực");
    }

    dispose() {
    }
}

/**
 * Null object dùng khi build `__PROFILER__: false`.
 *
 * Nhờ nó mà `Scene.update()` gọi thẳng `this.profiler.begin()` không cần `if`,
 * và `domain/` không phải biết cờ `__PROFILER__` tồn tại. Giá phải trả là hai
 * lời gọi rỗng mỗi frame — không đáng kể so với việc để domain đọc cờ.
 */
export const NULL_PROFILER = Object.freeze({
    begin() { },
    end() { },
    dispose() { },
});
