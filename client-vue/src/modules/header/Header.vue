<script setup lang="ts">
import { useRoute } from "vue-router";
import { InputSearch } from "@arco-design/web-vue";
import { computed, reactive, onBeforeUnmount, onMounted } from "vue";

import Bus from "@/bus";
import Logo from '@/components/logo/Logo.vue'
import Theme from '@/modules/theme/Theme.vue'
import Online from '@/modules/online/Online.vue'
import Github from '@/components/github/Github.vue'

import { isSearchEnabled } from "./queries";

// 搜索输入框
const pageData = reactive({
    loaded: false,
});
const searchData = reactive({
    loading: false,
    content: "",
});
const route = useRoute();
const showSearch = computed<boolean>(
    () => isSearchEnabled(pageData.loaded, route.name)
);
const searchClick = () => {
    Bus.$emit("home-search", searchData.content);
};

onMounted(() => {
    pageData.loaded = true;
    // 接收搜索 loading 变化事件
    Bus.$on("search-loading", (loading: boolean) => {
        searchData.loading = loading;
    });
})
onBeforeUnmount(() => {
    Bus.$off("home-search");
    Bus.$off("search-loading");
});

</script>
<template>
    <div class="nav-bar_wrapper">
        <div class="nav-bar_content">
            <div class="nav-bar_left">
                <Logo></Logo>
            </div>
            <div class="nav-bar_right">
                <div class="menu">
                    <InputSearch class="search-input" v-model="searchData.content" v-if="showSearch"
                        placeholder="输入关键词，空格分割" button-text="搜索" search-button @search="searchClick"
                        :loading="searchData.loading" allow-clear @press-enter="searchClick" />
                </div>
                <div class="link-list">
                    <Theme class="theme"></Theme>
                    <Github></Github>
                    <Online class="online"></Online>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.nav-bar_wrapper {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 999;
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-bg-2);
}

.nav-bar_content {
    position: relative;
    display: flex;
    width: 100%;
    height: 60px;
    min-height: 60px;
    max-height: 60px;
    box-sizing: border-box;
    z-index: 999;
}

.nav-bar_left {
    width: 180px;
    height: 60px;
    font-size: 30px;
}

.nav-bar_right {
    height: 100%;
    display: flex;
    flex: 1;
    height: 60px;
    align-items: center;
    padding-right: 1rem;

    .menu {
        flex: 1;

        .search-input {
            width: 320px;
        }
    }

    .link-list {
        height: 100%;
        display: flex;
        justify-content: flex-start;
        align-items: center;

        .theme {
            margin-right: 16px;
        }

        .online {
            margin-left: 10px;
        }
    }
}
</style>