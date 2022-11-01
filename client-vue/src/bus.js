// 为保持和vue2版本中使用bus一致，emit,on,off前面都加了$
class Bus {
    list = {}
    constructor() {
        // 收集订阅信息,调度中心
        this.list = {};
    }

    // 订阅
    $on(name, fn) {
        this.list[name] = this.list[name] || [];
        this.list[name].push(fn);
    }

    // 发布
    $emit(name, data) {
        if (this.list[name]) {
            this.list[name].forEach((fn) => {
                fn(data);
            });
        }
    }

    // 取消订阅
    $off(name) {
        if (this.list[name]) {
            delete this.list[name];
        }
    }
}
export default new Bus();
