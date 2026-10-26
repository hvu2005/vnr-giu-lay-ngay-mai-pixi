

export class EventEmitter {
    constructor() {
        this._listeners = {};
    }

    on(event, callback) {
        if (!this._listeners[event]) {
            this._listeners[event] = [];
        }
        this._listeners[event].push(callback);
    }

    emit(event, ...args) {
        if (this._listeners[event]) {
            for (const callback of this._listeners[event]) {
                callback(...args);
            }
        }   
    }

    off(event, callback) {
        if (this._listeners[event]) {
            const index = this._listeners[event].indexOf(callback);
            if (index !== -1) {
                this._listeners[event].splice(index, 1);
            }
        }
    }
}