<script setup>
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    reactive,
    ref,
} from "vue";
import axios from "axios";
import { getAxiosBase } from "@/utils";

const axiosBase = getAxiosBase()

const visitNumber = reactive({
    UV: 0,
    online: 0,
    threeUV: 0,
});

onMounted(() => {
    axios
        .get(`${axiosBase}/api/visit`)
        .then((res) => {
            const { code, online, UV, threeUV } = res.data;
            if (code === 0) {
                visitNumber.UV = UV;
                visitNumber.online = online;
                visitNumber.threeUV = threeUV;
            } else throw new Error("error");
        })
        .catch(() => {
            visitNumber.UV = UV;
            visitNumber.online = online;
            visitNumber.threeUV = threeUV;
        });
})
</script>
<template>
    <div class="online">
        <strong>ONLINE：{{ visitNumber.online }}</strong>
        <strong>UV：{{ visitNumber.UV }}</strong>
    </div>
</template>

<style lang="scss" scoped>
.online {
    display: flex;
    flex-direction: column;
    color: var(--color-text-1);
}
</style>