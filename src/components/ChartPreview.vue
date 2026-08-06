<script setup lang="ts">
import echartsBundle from 'echarts/dist/echarts.min.js?raw';
import echartsGlBundle from 'echarts-gl/dist/echarts-gl.min.js?raw';
import echartsLiquidfillBundle from 'echarts-liquidfill/dist/echarts-liquidfill.min.js?raw';
import echartsWordcloudBundle from 'echarts-wordcloud/dist/echarts-wordcloud.min.js?raw';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{
  code: string;
}>();

const frameRef = ref<HTMLIFrameElement | null>(null);
const error = ref('');
const version = ref(0);
const ASSET_BASE =
  import.meta.env.VITE_ASSET_BASE || (import.meta.env.DEV ? '/chart-assets' : 'https://api.ppmark.cn/chart-assets');
const previewBundles = [echartsBundle, echartsGlBundle, echartsLiquidfillBundle, echartsWordcloudBundle]
  .join('\n')
  .replace(/<\/script/gi, '<\\/script');

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
    <script>${previewBundles}<\/script>
  </head>
  <body>
    <div id="chart"></div>
    <pre id="error"></pre>
    <script>
      const chartNode = document.getElementById('chart');
      const errorNode = document.getElementById('error');
      const chart = echarts.init(chartNode);
      const assetBase = ${JSON.stringify(ASSET_BASE)};
      let activeRunId = 0;
      let hasSuccessfulRender = false;
      const trackedTimers = new Set();
      const nativeSetTimeout = window.setTimeout.bind(window);
      const nativeSetInterval = window.setInterval.bind(window);
      const nativeClearTimeout = window.clearTimeout.bind(window);
      const nativeClearInterval = window.clearInterval.bind(window);
      const jquery = typeof window.jQuery === 'function'
        ? window.jQuery
        : function missingJquery() {
            throw new Error('jQuery 加载失败，当前图表依赖 $ 方法，暂时无法预览。');
          };

      window.setTimeout = function guardedSetTimeout(callback, delay, ...args) {
        const runId = activeRunId;
        const timer = nativeSetTimeout(() => {
          trackedTimers.delete(timer);
          if (runId === activeRunId && typeof callback === 'function') {
            callback(...args);
          }
        }, delay);
        trackedTimers.add(timer);
        return timer;
      };

      window.setInterval = function guardedSetInterval(callback, delay, ...args) {
        const runId = activeRunId;
        const timer = nativeSetInterval(() => {
          if (runId === activeRunId && typeof callback === 'function') {
            callback(...args);
          }
        }, delay);
        trackedTimers.add(timer);
        return timer;
      };

      window.clearTimeout = function guardedClearTimeout(timer) {
        trackedTimers.delete(timer);
        return nativeClearTimeout(timer);
      };

      window.clearInterval = function guardedClearInterval(timer) {
        trackedTimers.delete(timer);
        return nativeClearInterval(timer);
      };

      function clearTrackedTimers() {
        trackedTimers.forEach(timer => {
          nativeClearTimeout(timer);
          nativeClearInterval(timer);
        });
        trackedTimers.clear();
      }

      function withAssetBase(path) {
        return assetBase.replace(/\\/$/, '') + '/' + path.replace(/^\\/+/, '');
      }

      function normalizeLegacyAssetPath(path) {
        return path.replace(/\.(?:geo)?json(?=$|[?#])/i, match => match.toLowerCase());
      }

      function normalizeAssetUrl(value) {
        if (typeof value !== 'string') {
          return value;
        }

        if (/^image:\\/\\//i.test(value)) {
          const imagePath = value.slice('image://'.length);
          const normalizedImagePath = normalizeAssetUrl(imagePath);
          return normalizedImagePath === imagePath ? value : 'image://' + normalizedImagePath;
        }

        if (/^(?:https?:|data:|blob:)/i.test(value)) {
          return value.replace(
            /^https?:\\/\\/(?:www\\.|api\\.|img\\.)?isqqw\\.com\\/(asset\\/get\\/s\\/.*)$/i,
            (_, path) => withAssetBase(path)
          );
        }

        const legacyPath = value.replace(/^(?:\\.\\.\\/|\\.\\/)+/, '').replace(/^\\/+/, '');
        if (/^(?:asset\\/get\\/s|ecg-storage)\\//i.test(legacyPath)) {
          return withAssetBase(normalizeLegacyAssetPath(legacyPath));
        }

        return value;
      }

      function normalizePreviewCode(code) {
        return code.replace(/image:\\/\\/((?:\\.\\.\\/|\\.\\/)*\\/?asset\\/get\\/s\\/[^'"\\s)]+)/gi, (_, path) => {
          return 'image://' + normalizeAssetUrl(path);
        });
      }

      const nativeFetch = window.fetch.bind(window);
      window.fetch = function previewFetch(input, init) {
        if (typeof input === 'string') {
          return nativeFetch(normalizeAssetUrl(input), init);
        }

        if (input instanceof URL) {
          return nativeFetch(normalizeAssetUrl(input.toString()), init);
        }

        return nativeFetch(input, init);
      };

      function normalizeJqueryArgs(args) {
        const requestRunId = activeRunId;
        const nextArgs = Array.prototype.slice.call(args);
        const firstArg = nextArgs[0];

        if (typeof firstArg === 'string') {
          nextArgs[0] = normalizeAssetUrl(firstArg);
        } else if (firstArg && typeof firstArg === 'object' && typeof firstArg.url === 'string') {
          nextArgs[0] = Object.assign({}, firstArg, {
            url: normalizeAssetUrl(firstArg.url),
            success: typeof firstArg.success === 'function'
              ? function guardedSuccess() {
                  if (requestRunId === activeRunId) {
                    return firstArg.success.apply(this, arguments);
                  }
                }
              : firstArg.success,
            error: typeof firstArg.error === 'function'
              ? function guardedError() {
                  if (requestRunId === activeRunId) {
                    return firstArg.error.apply(this, arguments);
                  }
                }
              : firstArg.error
          });
        }

        for (let index = 1; index < nextArgs.length; index += 1) {
          if (typeof nextArgs[index] === 'function') {
            const callback = nextArgs[index];
            nextArgs[index] = function guardedJqueryCallback() {
              if (requestRunId === activeRunId) {
                return callback.apply(this, arguments);
              }
            };
          }
        }

        return nextArgs;
      }

      ['ajax', 'get', 'getJSON'].forEach(method => {
        if (typeof jquery[method] !== 'function') {
          return;
        }

        const nativeMethod = jquery[method];
        jquery[method] = function normalizedJqueryRequest() {
          return nativeMethod.apply(this, normalizeJqueryArgs(arguments));
        };
      });

      if (jquery.fn) {
        ['resize', 'show', 'hide'].forEach(method => {
          if (typeof jquery.fn[method] !== 'function') {
            jquery.fn[method] = function noopJqueryPlugin() {
              return this;
            };
          }
        });
      }

      window.require = function previewRequire(name) {
        if (name === 'echarts') {
          return echarts;
        }
        if (name === 'jquery' || name === '$') {
          return jquery;
        }
        if (/echarts/i.test(name || '')) {
          return {};
        }
        throw new Error('当前预览沙箱暂不支持 require("' + name + '")。');
      };

      window.module = { exports: {} };
      window.exports = window.module.exports;
      window.app = window.app || {};
      window.axios = window.axios || {
        get(url) {
          return window.fetch(url).then(response => response.json()).then(data => ({ data }));
        }
      };
      window.dat = window.dat || {
        GUI: function GUI() {
          return {
            add() { return this; },
            addColor() { return this; },
            onChange() { return this; },
            name() { return this; },
            close() { return this; }
          };
        }
      };
      window._ = window._ || {
        map(collection, iterator) {
          return Array.prototype.map.call(collection || [], iterator);
        },
        each(collection, iterator) {
          Array.prototype.forEach.call(collection || [], iterator);
          return collection;
        },
        cloneDeep(value) {
          return JSON.parse(JSON.stringify(value));
        }
      };
      window.moment = window.moment || function moment(value) {
        const date = value ? new Date(value) : new Date();
        return {
          format() {
            return Number.isNaN(date.getTime()) ? '' : date.toISOString();
          },
          valueOf() {
            return date.valueOf();
          }
        };
      };
      const defaultChinaMapUrl = normalizeAssetUrl('asset/get/s/data-1528971808162-BkOXf61WX.json');
      let defaultMapsReady;

      function ensureDefaultMaps() {
        if (!defaultMapsReady) {
          defaultMapsReady = window.fetch(defaultChinaMapUrl)
            .then(response => response.json())
            .then(data => {
              ['china', '中国', '中华人民共和国'].forEach(name => {
                echarts.registerMap(name, data);
              });
            })
            .catch(() => {});
        }

        return defaultMapsReady;
      }

      function isMissingDefaultMapError(error) {
        const message = error && error.stack ? error.stack : String(error);
        return /geoJson|regions|getMap/i.test(message);
      }

      function shouldPreloadDefaultMaps(code) {
        return /map\\s*:\\s*['"](?:china|中国|中华人民共和国)['"]|mapType\\s*:\\s*['"](?:china|中国|中华人民共和国)['"]|geoIndex\\s*:|coordinateSystem\\s*:\\s*['"]geo['"]/i.test(code);
      }

      function runChartCode(code) {
        const runner = new Function('echarts', 'chart', 'myChart', '$', code + '\\n;if (typeof option !== "undefined") { chart.setOption(option); }');
        runner(echarts, chart, chart, jquery);
      }

      function hasRenderedSeries() {
        try {
          const currentOption = chart.getOption ? chart.getOption() : {};
          return Array.isArray(currentOption && currentOption.series) && currentOption.series.length > 0;
        } catch {
          return false;
        }
      }

      function reportError(message) {
        errorNode.style.display = 'block';
        errorNode.textContent = message;
        parent.postMessage({ source: 'ppchart-preview', type: 'error', message }, '*');
      }

      function reportRuntimeError(message) {
        if (hasRenderedSeries()) {
          return;
        }
        reportError(message);
      }

      window.addEventListener('error', event => {
        reportRuntimeError(event.error && event.error.stack ? event.error.stack : event.message);
      });

      window.addEventListener('unhandledrejection', event => {
        const reason = event.reason;
        reportRuntimeError(reason && reason.stack ? reason.stack : String(reason));
      });

      async function render(code) {
        activeRunId += 1;
        hasSuccessfulRender = false;
        clearTrackedTimers();
        errorNode.style.display = 'none';
        errorNode.textContent = '';
        chart.clear();

        try {
          window.chart = chart;
          window.myChart = chart;
          window.echarts = echarts;
          window.option = {};
          window.$ = jquery;
          const normalizedCode = normalizePreviewCode(code);
          if (shouldPreloadDefaultMaps(normalizedCode)) {
            await ensureDefaultMaps();
          }
          try {
            runChartCode(normalizedCode);
          } catch (error) {
            if (!isMissingDefaultMapError(error)) {
              throw error;
            }
            chart.clear();
            await ensureDefaultMaps();
            runChartCode(normalizedCode);
          }
          hasSuccessfulRender = true;
          parent.postMessage({ source: 'ppchart-preview', type: 'success' }, '*');
        } catch (error) {
          reportError(error && error.stack ? error.stack : String(error));
        }
      }

      window.addEventListener('message', event => {
        if (event.data && event.data.source === 'ppchart-host') {
          if (event.data.type === 'capture') {
            try {
              if (!hasSuccessfulRender) {
                throw new Error('图表尚未成功渲染');
              }
              const dataUrl = chart.getDataURL({
                type: 'png',
                pixelRatio: 1,
                backgroundColor: '#f8fafc'
              });
              parent.postMessage({
                source: 'ppchart-preview',
                type: 'capture-success',
                requestId: event.data.requestId,
                dataUrl
              }, '*');
            } catch (error) {
              parent.postMessage({
                source: 'ppchart-preview',
                type: 'capture-error',
                requestId: event.data.requestId,
                message: error && error.message ? error.message : String(error)
              }, '*');
            }
            return;
          }
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

interface PendingCapture {
  resolve: (dataUrl: string) => void;
  reject: (error: Error) => void;
  timer: number;
}

const pendingCaptures = new Map<string, PendingCapture>();
let captureSequence = 0;

function settleCapture(
  requestId: string,
  handler: (pending: PendingCapture) => void
) {
  const pending = pendingCaptures.get(requestId);
  if (!pending) {
    return;
  }
  window.clearTimeout(pending.timer);
  pendingCaptures.delete(requestId);
  handler(pending);
}

function capture(): Promise<string> {
  const contentWindow = frameRef.value?.contentWindow;
  if (!contentWindow) {
    return Promise.reject(new Error('图表预览尚未加载'));
  }

  const requestId = `capture-${Date.now()}-${++captureSequence}`;
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      settleCapture(requestId, pending => {
        pending.reject(new Error('缩略图生成超时，请重新运行预览后重试'));
      });
    }, 5000);
    pendingCaptures.set(requestId, { resolve, reject, timer });
    contentWindow.postMessage(
      {
        source: 'ppchart-host',
        type: 'capture',
        requestId
      },
      '*'
    );
  });
}

function handlePreviewMessage(event: MessageEvent) {
  if (
    event.source !== frameRef.value?.contentWindow ||
    event.data?.source !== 'ppchart-preview'
  ) {
    return;
  }

  if (
    event.data.type === 'capture-success' &&
    typeof event.data.requestId === 'string' &&
    typeof event.data.dataUrl === 'string'
  ) {
    settleCapture(event.data.requestId, pending => {
      pending.resolve(event.data.dataUrl);
    });
    return;
  }

  if (
    event.data.type === 'capture-error' &&
    typeof event.data.requestId === 'string'
  ) {
    settleCapture(event.data.requestId, pending => {
      pending.reject(
        new Error(event.data.message || '缩略图生成失败')
      );
    });
    return;
  }

  error.value = event.data.type === 'error' ? event.data.message : '';
}

onMounted(() => {
  window.addEventListener('message', handlePreviewMessage);
});

onBeforeUnmount(() => {
  window.removeEventListener('message', handlePreviewMessage);
  pendingCaptures.forEach(pending => {
    window.clearTimeout(pending.timer);
    pending.reject(new Error('图表预览已关闭'));
  });
  pendingCaptures.clear();
});

watch(
  () => props.code,
  () => {
    error.value = '';
  }
);

defineExpose({ capture });
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
