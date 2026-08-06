<script setup lang="ts">
import { ref, watch } from 'vue';

import ChartPreview from '@/components/ChartPreview.vue';
import type { AdminChart, CurrentUser } from '@/types/chart';
import { formatDate } from '@/utils/format';

const props = defineProps<{
  user: CurrentUser | null;
  charts: AdminChart[];
  selected: AdminChart | null;
  loading: boolean;
  error: string;
}>();

const emit = defineEmits<{
  login: [provider: 'github' | 'google'];
  select: [chart: AdminChart];
  approve: [chart: AdminChart];
  reject: [chart: AdminChart, note: string];
}>();

const rejectNote = ref('');
const localError = ref('');

watch(
  () => props.selected?.id,
  () => {
    rejectNote.value = '';
    localError.value = '';
  }
);

function rejectSelected() {
  if (!props.selected) {
    return;
  }
  const note = rejectNote.value.trim();
  if (!note) {
    localError.value = '请填写拒绝原因';
    return;
  }
  localError.value = '';
  emit('reject', props.selected, note);
}
</script>

<template>
  <section class="admin-panel" aria-labelledby="admin-panel-title">
    <header class="admin-panel-header">
      <div>
        <p class="eyebrow">REVIEW DESK</p>
        <h1 id="admin-panel-title">图表审核</h1>
        <p>检查用户提交的代码，通过后立即进入公共图库。</p>
      </div>
      <div class="admin-header-actions">
        <span v-if="user?.role === 'admin'" class="review-count">{{ charts.length }} 条待审核</span>
        <a class="back-to-gallery" href="/">返回图表库</a>
      </div>
    </header>

    <div v-if="!user" class="workspace-login">
      <strong>管理员登录</strong>
      <p>使用已配置为管理员的 GitHub 或 Google 账号登录。</p>
      <div class="oauth-actions">
        <button type="button" @click="emit('login', 'github')">使用 GitHub 登录</button>
        <button type="button" @click="emit('login', 'google')">使用 Google 登录</button>
      </div>
    </div>

    <div v-else-if="user.role !== 'admin'" class="admin-access-denied">
      <strong>无管理员权限</strong>
      <p>当前账号不能访问审核数据。</p>
      <a href="/">返回图表库</a>
    </div>

    <template v-else>
      <p v-if="error" class="user-panel-error">{{ error }}</p>

      <div v-if="charts.length === 0 && !loading" class="admin-empty">
        <span>QUEUE CLEAR</span>
        <strong>没有待审核图表</strong>
        <p>新的用户提交会自动出现在这里。</p>
      </div>

      <div v-else class="admin-review-layout">
        <aside class="review-queue" aria-label="待审核图表">
          <button
            v-for="chart in charts"
            :key="chart.id"
            type="button"
            :class="{ active: selected?.id === chart.id }"
            @click="emit('select', chart)"
          >
            <span>{{ chart.title }}</span>
            <small>{{ chart.user.name || chart.user.email || `${chart.user.provider} 用户` }}</small>
            <time>{{ formatDate(chart.updatedAt) }}</time>
          </button>
        </aside>

        <article v-if="selected" class="review-detail">
          <div class="review-detail-heading">
            <div>
              <p class="eyebrow">SUBMISSION #{{ selected.id }}</p>
              <h2>{{ selected.title }}</h2>
              <p>{{ selected.description || '暂无描述' }}</p>
            </div>
            <dl>
              <div>
                <dt>提交者</dt>
                <dd>{{ selected.user.name || selected.user.email || selected.user.provider }}</dd>
              </div>
              <div>
                <dt>版本</dt>
                <dd>{{ selected.echartsVersion || '-' }}</dd>
              </div>
            </dl>
          </div>

          <ChartPreview :code="selected.code" />

          <details class="review-code">
            <summary>查看源代码</summary>
            <pre>{{ selected.code }}</pre>
          </details>

          <div class="review-actions">
            <button
              class="approve-button"
              type="button"
              :disabled="loading"
              @click="emit('approve', selected)"
            >
              {{ loading ? '处理中' : '通过并发布' }}
            </button>
            <label>
              拒绝原因
              <textarea v-model="rejectNote" rows="3" placeholder="说明需要修改的问题"></textarea>
            </label>
            <p v-if="localError" class="review-local-error">{{ localError }}</p>
            <button class="reject-button" type="button" :disabled="loading" @click="rejectSelected">
              拒绝并退回
            </button>
          </div>
        </article>
      </div>
    </template>
  </section>
</template>
