<script setup lang="ts">
import { LayoutContent, Layout } from "@arco-design/web-vue";

import Header from '@/modules/header/Header.vue'
import MonocoInit from '@/components/monoco/Init.vue'
</script>

<template>
  <Layout style="height: calc(100% - 60px); padding-top: 60px">
    <Header></Header>
    <LayoutContent class="content">
      <router-view></router-view>
    </LayoutContent>
    <MonocoInit></MonocoInit>
  </Layout>
</template>

<style lang="scss">
html,
body {
  height: 100%;
  --color-logo: rgb(85, 26, 139);
  --color-logo-1: rgb(237, 221, 249);
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  height: 100%;
}

// .arco-modal-body {
//   padding: 0 20px !important;
// }

.content {
  background-color: var(--color-bg-5);

  // .arco-card-meta-title {
  //   margin: 8px 0 8px 0;
  //   font-size: 18px;
  // }
}


body[arco-theme="dark"] {
  --color-logo: var(--color-text-1);
  --color-logo-1: var(--color-bg-5);
}
</style>
