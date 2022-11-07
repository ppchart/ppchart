import { ref, watch, getCurrentInstance, ExtractPropTypes } from "vue";

type EmitFn = (event: string, ...args: any[]) => void

function useModel(props: Readonly<ExtractPropTypes<{ [k: string]: StringConstructor }>>, key = "modelValue", emit?: EmitFn) {
    const proxy = ref(props[key]);
    const _emit = emit || getCurrentInstance()?.emit;
    watch(
        () => proxy.value,
        (v) => _emit && _emit(`update:${key}`, v)

    );
    return proxy;
}

export default useModel 