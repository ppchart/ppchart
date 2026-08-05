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
  logout: [];
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
        <p class="eyebrow">USER CHARTS</p>
        <h2 id="user-panel-title">上传和管理我的图表</h2>
      </div>
      <div v-if="user" class="user-profile">
        <img v-if="user.avatar" :src="user.avatar" alt="" />
        <span>{{ user.name || user.email || '已登录用户' }}</span>
        <button type="button" @click="emit('logout')">退出</button>
      </div>
      <div v-else class="oauth-actions">
        <button type="button" @click="emit('login', 'github')">使用 GitHub 登录</button>
        <button type="button" @click="emit('login', 'google')">使用 Google 登录</button>
      </div>
    </div>

    <p v-if="!user" class="user-panel-tip">登录后可以保存自己的 ECharts 草稿，提交审核后进入公开库。</p>

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
            <span>{{ chart.status }}</span>
          </div>
          <p>{{ chart.description || '暂无描述' }}</p>
          <button type="button" @click="emit('edit', chart)">编辑</button>
          <button type="button" @click="emit('remove', chart)">删除</button>
        </article>
      </div>
    </template>
  </section>
</template>
