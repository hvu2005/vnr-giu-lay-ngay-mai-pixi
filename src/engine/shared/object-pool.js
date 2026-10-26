



export class ObjectPool {
    constructor(createFunc, size = 2) {
        this.createFunc = createFunc;
        this.pool = [];

        for (let i = 0; i < size; i++) {
            this.pool.push(this.createFunc());
        }
    }

    get() {
        if (this.pool.length > 0) {
            return this.pool.pop();
        }
        return this.createFunc();
    }

    release(obj) {
        this.pool.push(obj);
    }
}