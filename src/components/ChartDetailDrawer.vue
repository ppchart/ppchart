<script setup lang="ts">
import ChartPreview from '@/components/ChartPreview.vue';
import MonacoEditor from '@/components/MonacoEditor.vue';
import type { ChartDetail } from '@/types/chart';
import { formatCount, formatDate } from '@/utils/format';

defineProps<{
  detail: ChartDetail | null;
  code: string;
  loading: boolean;
  error: string;
}>();

const emit = defineEmits<{
  close: [];
  'update:code': [value: string];
}>();
</script>

<template>
  <div class="drawer-mask" @click.self="emit('close')">
    <aside class="detail-drawer" aria-label="图表详情">
      <button class="drawer-close" type="button" aria-label="关闭详情" @click="emit('close')">×</button>

      <div v-if="loading" class="drawer-state">正在读取图表代码...</div>
      <div v-else-if="error" class="drawer-state error">{{ error }}</div>

      <template v-else-if="detail">
        <header class="detail-header">
          <p>{{ detail.cid }}</p>
          <h2>{{ detail.title || '未命名图表' }}</h2>
          <dl>
            <div>
              <dt>版本</dt>
              <dd>{{ detail.echartsVersion || '-' }}</dd>
            </div>
            <div>
              <dt>浏览</dt>
              <dd>{{ formatCount(detail.viewCount) }}</dd>
            </div>
            <div>
              <dt>日期</dt>
              <dd>{{ formatDate(detail.createTime) }}</dd>
            </div>
          </dl>
        </header>

        <div class="workspace">
          <section class="editor-panel" aria-label="代码区">
            <div class="panel-title">
              <span>代码</span>
              <small>Monaco Editor</small>
            </div>
            <MonacoEditor :model-value="code" @update:model-value="emit('update:code', $event)" />
          </section>

          <section class="preview-panel" aria-label="预览区">
            <ChartPreview :code="code" />
          </section>
        </div>
      </template>
    </aside>
  </div>
</template>
