// Simple Queue implementation for job management
class Queue {
    constructor() {
        this.items = [];
        this.waitingResolvers = [];
    }

    enqueue(item) {
        if (this.waitingResolvers.length > 0) {
            const resolve = this.waitingResolvers.shift();
            resolve(item);
        } else {
            this.items.push(item);
        }
    }

    async dequeue() {
        if (this.items.length > 0) {
            return this.items.shift();
        } else {
            return new Promise((resolve) => {
                this.waitingResolvers.push(resolve);
            });
        }
    }

    size() {
        return this.items.length;
    }

    isEmpty() {
        return this.items.length === 0;
    }
}

module.exports = { Queue };
