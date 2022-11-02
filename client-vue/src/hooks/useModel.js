import { ref, watch, getCurrentInstance } from "vue";

function useModel(props, key = "modelValue", emit) {
    const proxy = ref(props[key]);
    const _emit = emit || getCurrentInstance()?.emit;
    watch(
        () => proxy.value,
        (v) => _emit(`update:${key}`, v)

    );
    return proxy;
}

export default useModel 