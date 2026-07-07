<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{
  code: string;
}>();

const frameRef = ref<HTMLIFrameElement | null>(null);
const error = ref('');
const version = ref(0);

const frameSource = computed(() => `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <style>
      html, body, #chart {
        width: 100%;
        height: 100%;
        margin: 0;
        background: #f8fafc;
      }
      #error {
        position: fixed;
        inset: 16px;
        display: none;
        overflow: auto;
        border: 1px solid rgba(185, 28, 28, .18);
        border-radius: 14px;
        background: #fff1f2;
        color: #991b1b;
        padding: 14px;
        font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
        white-space: pre-wrap;
      }
    </style>
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"><\/script>
    <script src="https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js"><\/script>
  </head>
  <body>
    <div id="chart"></div>
    <pre id="error"></pre>
    <script>
      const chartNode = document.getElementById('chart');
      const errorNode = document.getElementById('error');
      const chart = echarts.init(chartNode);
      const jquery = typeof window.jQuery === 'function'
        ? window.jQuery
        : function missingJquery() {
            throw new Error('jQuery 加载失败，当前图表依赖 $ 方法，暂时无法预览。');
          };

      function reportError(message) {
        errorNode.style.display = 'block';
        errorNode.textContent = message;
        parent.postMessage({ source: 'ppchart-preview', type: 'error', message }, '*');
      }

      function render(code) {
        errorNode.style.display = 'none';
        errorNode.textContent = '';
        chart.clear();

        try {
          window.chart = chart;
          window.myChart = chart;
          window.echarts = echarts;
          window.option = {};
          window.$ = jquery;
          const runner = new Function('echarts', 'chart', 'myChart', '$', code + '\\n;if (typeof option !== "undefined") { chart.setOption(option); }');
          runner(echarts, chart, chart, jquery);
          parent.postMessage({ source: 'ppchart-preview', type: 'success' }, '*');
        } catch (error) {
          reportError(error && error.stack ? error.stack : String(error));
        }
      }

      window.addEventListener('message', event => {
        if (event.data && event.data.source === 'ppchart-host') {
          render(event.data.code || '');
        }
      });

      window.addEventListener('resize', () => chart.resize());
    <\/script>
  </body>
</html>`);

function run() {
  error.value = '';
  frameRef.value?.contentWindow?.postMessage(
    {
      source: 'ppchart-host',
      code: props.code
    },
    '*'
  );
}

function reloadAndRun() {
  version.value += 1;
  nextTick(() => {
    window.setTimeout(run, 300);
  });
}

function handlePreviewMessage(event: MessageEvent) {
  if (event.data?.source !== 'ppchart-preview') {
    return;
  }

  error.value = event.data.type === 'error' ? event.data.message : '';
}

onMounted(() => {
  window.addEventListener('message', handlePreviewMessage);
});

onBeforeUnmount(() => {
  window.removeEventListener('message', handlePreviewMessage);
});

watch(
  () => props.code,
  () => {
    error.value = '';
  }
);
</script>

<template>
  <div class="preview-shell">
    <div class="preview-toolbar">
      <span>隔离预览</span>
      <button type="button" @click="reloadAndRun">运行代码</button>
    </div>
    <iframe
      :key="version"
      ref="frameRef"
      title="图表预览"
      sandbox="allow-scripts"
      :srcdoc="frameSource"
      @load="run"
    ></iframe>
    <p v-if="error" class="preview-error">{{ error }}</p>
  </div>
</template>
