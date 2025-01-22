<script setup lang="ts">
import { computed } from 'vue';
import { useAppStore } from '@/store/modules/app';

const appStore = useAppStore();

const gap = computed(() => (appStore.isMobile ? 0 : 16));
</script>

<template>
  <NSpace vertical :size="16">
    <!-- <NAlert :title="$t('common.warning')" type="warning">
      {{ $t('page.home.branchDesc') }}
    </NAlert> -->
    <!-- <HeaderBanner /> -->
    <CardData />
    <NGrid :x-gap="gap" :y-gap="16" responsive="screen" item-responsive>
      <NGi span="24 s:24 m:14">
        <NCard :bordered="false" class="card-wrapper">
          1
        </NCard>
      </NGi>
      <NGi span="24 s:24 m:10">
        <NCard :bordered="false" class="card-wrapper">
          2
        </NCard>
      </NGi>
    </NGrid>
    <NGrid :x-gap="gap" :y-gap="16" responsive="screen" item-responsive>
      <NGi span="24 s:24 m:14">
        3
      </NGi>
      <NGi span="24 s:24 m:10">
        4
      </NGi>
    </NGrid>
  </NSpace>
</template>

<style scoped></style>
