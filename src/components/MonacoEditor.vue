<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';

type MonacoEnvironmentHost = typeof globalThis & {
  MonacoEnvironment?: {
    getWorker(_: string, label: string): Worker;
  };
};

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

(globalThis as MonacoEnvironmentHost).MonacoEnvironment = {
  getWorker(_: string, label: string) {
    if (label === 'json') {
      return new jsonWorker();
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker();
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker();
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker();
    }
    return new editorWorker();
  }
};

const hostRef = ref<HTMLElement | null>(null);
const editorRef = shallowRef<monaco.editor.IStandaloneCodeEditor | null>(null);
let ignoreNextUpdate = false;

onMounted(() => {
  if (!hostRef.value) {
    return;
  }

  editorRef.value = monaco.editor.create(hostRef.value, {
    value: props.modelValue,
    language: 'javascript',
    theme: 'vs-dark',
    minimap: { enabled: false },
    automaticLayout: true,
    fontSize: 13,
    lineHeight: 21,
    wordWrap: 'on',
    scrollBeyondLastLine: false,
    tabSize: 2
  });

  editorRef.value.onDidChangeModelContent(() => {
    ignoreNextUpdate = true;
    emit('update:modelValue', editorRef.value?.getValue() || '');
  });
});

watch(
  () => props.modelValue,
  value => {
    if (ignoreNextUpdate) {
      ignoreNextUpdate = false;
      return;
    }

    const editor = editorRef.value;
    if (editor && editor.getValue() !== value) {
      editor.setValue(value);
    }
  }
);

onBeforeUnmount(() => {
  editorRef.value?.dispose();
});
</script>

<template>
  <div ref="hostRef" class="monaco-host" aria-label="图表代码编辑器"></div>
</template>
