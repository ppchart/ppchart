<script setup lang="ts">
import type { CurrentUser, UserChart } from '@/types/chart';

defineProps<{
  user: CurrentUser | null;
  charts: UserChart[];
  loading: boolean;
  error: string;
  form: {
    id: number | null;
    title: string;
    description: string;
    echartsVersion: string;
    code: string;
    status: 'draft' | 'pending';
  };
}>();

const emit = defineEmits<{
  login: [provider: 'github' | 'google'];
  save: [];
  edit: [chart: UserChart];
  remove: [chart: UserChart];
  reset: [];
  'update:form': [value: {
    id: number | null;
    title: string;
    description: string;
    echartsVersion: string;
    code: string;
    status: 'draft' | 'pending';
  }];
}>();

const statusLabels = {
  draft: '草稿',
  pending: '审核中',
  published: '已发布',
  rejected: '已拒绝'
} as const;

function updateField(
  form: {
    id: number | null;
    title: string;
    description: string;
    echartsVersion: string;
    code: string;
    status: 'draft' | 'pending';
  },
  key: 'title' | 'description' | 'echartsVersion' | 'code' | 'status',
  value: string
) {
  emit('update:form', {
    ...form,
    [key]: key === 'status' ? (value === 'pending' ? 'pending' : 'draft') : value
  });
}
</script>

<template>
  <section class="user-panel" aria-labelledby="user-panel-title">
    <div class="user-panel-header">
      <div>
        <p class="eyebrow">MY WORKSPACE</p>
        <h1 id="user-panel-title">我的图表</h1>
        <p>保存 ECharts 草稿，完成后提交到公开图库。</p>
      </div>
      <a class="back-to-gallery" href="/">返回图表库</a>
    </div>

    <div v-if="!user" class="workspace-login">
      <strong>登录后开始创建</strong>
      <p>使用 GitHub 或 Google 账号登录，保存自己的 ECharts 草稿。</p>
      <div class="oauth-actions">
        <button type="button" @click="emit('login', 'github')">使用 GitHub 登录</button>
        <button type="button" @click="emit('login', 'google')">使用 Google 登录</button>
      </div>
    </div>

    <template v-else>
      <div v-if="error" class="user-panel-error">{{ error }}</div>

      <form class="user-chart-form" @submit.prevent="emit('save')">
        <label>
          图表标题
          <input
            :value="form.title"
            placeholder="例如：渐变柱状图"
            @input="updateField(form, 'title', ($event.target as HTMLInputElement).value)"
          />
        </label>
        <label>
          ECharts 版本
          <input
            :value="form.echartsVersion"
            placeholder="例如：5.6.0"
            @input="updateField(form, 'echartsVersion', ($event.target as HTMLInputElement).value)"
          />
        </label>
        <label class="span-2">
          描述
          <input
            :value="form.description"
            placeholder="简单说明图表用途"
            @input="updateField(form, 'description', ($event.target as HTMLInputElement).value)"
          />
        </label>
        <label class="span-2">
          图表代码
          <textarea
            :value="form.code"
            rows="10"
            placeholder="粘贴 ECharts option 或完整示例代码"
            @input="updateField(form, 'code', ($event.target as HTMLTextAreaElement).value)"
          ></textarea>
        </label>
        <label>
          状态
          <select :value="form.status" @change="updateField(form, 'status', ($event.target as HTMLSelectElement).value)">
            <option value="draft">保存草稿</option>
            <option value="pending">提交审核</option>
          </select>
        </label>
        <div class="form-actions">
          <button type="submit" :disabled="loading">{{ loading ? '保存中' : form.id ? '更新图表' : '保存图表' }}</button>
          <button type="button" @click="emit('reset')">清空</button>
        </div>
      </form>

      <div class="my-chart-list">
        <h3>我的图表</h3>
        <p v-if="charts.length === 0">还没有保存图表。</p>
        <article v-for="chart in charts" :key="chart.id">
          <div>
            <strong>{{ chart.title }}</strong>
            <span :class="`chart-status-${chart.status}`">{{ statusLabels[chart.status] }}</span>
          </div>
          <p>{{ chart.description || '暂无描述' }}</p>
          <p v-if="chart.status === 'rejected' && chart.reviewNote" class="review-note">
            拒绝原因：{{ chart.reviewNote }}
          </p>
          <button v-if="chart.status !== 'pending'" type="button" @click="emit('edit', chart)">编辑</button>
          <button
            v-if="chart.status === 'draft' || chart.status === 'rejected'"
            type="button"
            @click="emit('remove', chart)"
          >
            删除
          </button>
        </article>
      </div>
    </template>
  </section>
</template>
