<script setup>
import { nextTick, reactive, ref, } from "vue";
import { Spin, Drawer } from "@arco-design/web-vue";

const chatRef = ref(null);
const settimeoutRef = ref(null)

const chatData = reactive({
    visible: false,
    loading: false,
    onLoad: () => {
        chatData.loading = false;
    },
});
const mustCloseWhenDelay = () => {
    if (settimeoutRef.value) {
        clearTimeout(settimeoutRef)
    }
    nextTick(() => {
        settimeoutRef.value = setTimeout(() => {
            if (chatData.loading) {
                chatData.loading = false;
            }
            settimeoutRef.value = null
        }, 3500);
    })
}
const handleClick = () => {
    chatData.visible = true;
    chatData.loading = true;
    mustCloseWhenDelay()
};
const handleOkk = () => {
    chatData.visible = false;
};
const handleCancel = () => {
    chatData.visible = false;
};

</script>
<template>
    <a v-show="!chatData.visible" class="gitter-door" @click="handleClick">
        建议/反馈
    </a>
    <Drawer width="45%" :visible="chatData.visible" @ok="handleOkk" @cancel="handleCancel" unmountOnClose
        :footer="false" class="chat-drawer" :closed="false">
        <template #title> 建议/反馈 </template>
        <Spin class="gitter-loading" :loading="chatData.loading" tip="初始化...">
            <iframe ref="chatRef" class="gitter-iframe" src="https://gitter.im/ppchart/community/~embed" frameborder="0"
                :onload="chatData.onLoad"></iframe>
        </Spin>
    </Drawer>
</template>

<style lang="scss" scoped>
.gitter-door {
    position: fixed;
    bottom: 0;
    left: 10px;
    z-index: 1111;
    background-color: #36bc98;
    padding: 8px 18px;
    border: 0;
    color: #ffffff;
    border-top-left-radius: 14px;
    border-top-right-radius: 14px;
    font-family: sans-serif;
    font-size: 16px;
}

.chat-drawer {

    .gitter-loading,
    .gitter-iframe {
        width: 100%;
        height: 100%
    }
}
</style>

<style lang="scss">
.chat-drawer {
    .arco-drawer-header {
        display: none;
    }

    .arco-drawer-body {
        padding: 0;
        overflow: hidden;
    }
}
</style>