<script setup>
import { onMounted, ref, } from "vue";
import { IconSunFill, IconMoonFill } from "@arco-design/web-vue/es/icon";

const size = 24
const theme = ref("light");
const themeChange = (value) => {
    theme.value = value;
    localStorage.setItem("theme", value);
    themeJudge(value);
};

const themeJudge = (theme) => {
    if (theme === "dark") {
        document.body.setAttribute("arco-theme", "dark");
    } else {
        document.body.removeAttribute("arco-theme");
    }
};

// 加载数据
onMounted(() => {
    // 主题色初始化
    const themeValue = localStorage.getItem("theme") || "light";
    themeJudge(themeValue);
    theme.value = themeValue;
});
</script>
<template>
    <IconMoonFill v-if="theme === 'dark'" class="moon theme-icon" :size="size" @click="() => themeChange('light')" />
    <IconSunFill v-else class="sun theme-icon" :size="size" @click="() => themeChange('dark')" />
</template>


<style lang="scss" scoped>
.moon {
    color: var(--color-text-1)
}

.theme-icon {
    cursor: pointer
}
</style>