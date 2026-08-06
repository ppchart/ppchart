<script setup lang="ts">
import { ref, watch } from 'vue';

import ChartPreview from '@/components/ChartPreview.vue';
import type { AdminChart, CurrentUser } from '@/types/chart';
import { formatDate } from '@/utils/format';

const props = defineProps<{
  user: CurrentUser | null;
  charts: AdminChart[];
  selected: AdminChart | null;
  status: 'pending' | 'published';
  loading: boolean;
  error: string;
}>();

const emit = defineEmits<{
  login: [provider: 'github' | 'google'];
  select: [chart: AdminChart];
  'update:status': [value: 'pending' | 'published'];
  approve: [chart: AdminChart, thumbnail: string];
  reject: [chart: AdminChart, note: string];
  unpublish: [chart: AdminChart, note: string];
}>();

interface ChartPreviewHandle {
  capture: () => Promise<string>;
}

const actionNote = ref('');
const localError = ref('');
const previewRef = ref<ChartPreviewHandle | null>(null);
const capturing = ref(false);

watch(
  () => [props.selected?.id, props.status],
  () => {
    actionNote.value = '';
    localError.value = '';
  }
);

function submitSecondaryAction() {
  if (!props.selected) {
    return;
  }
  const note = actionNote.value.trim();
  if (!note) {
    localError.value = props.status === 'pending' ? '请填写拒绝原因' : '请填写下架原因';
    return;
  }
  localError.value = '';
  if (props.status === 'pending') {
    emit('reject', props.selected, note);
  } else {
    emit('unpublish', props.selected, note);
  }
}

async function submitApproval() {
  const selected = props.selected;
  if (!selected || !previewRef.value) {
    localError.value = '图表预览尚未加载';
    return;
  }

  capturing.value = true;
  localError.value = '';
  try {
    const thumbnail = await previewRef.value.capture();
    if (props.selected?.id !== selected.id) {
      throw new Error('审核对象已变化，请重新确认');
    }
    emit('approve', selected, thumbnail);
  } catch (error) {
    localError.value =
      error instanceof Error ? error.message : '缩略图生成失败';
  } finally {
    capturing.value = false;
  }
}
</script>

<template>
  <section class="admin-panel" aria-labelledby="admin-panel-title">
    <header class="admin-panel-header">
      <div>
        <p class="eyebrow">REVIEW DESK</p>
        <h1 id="admin-panel-title">图表管理</h1>
        <p>审核用户投稿，并管理已经进入公共图库的内容。</p>
      </div>
      <div class="admin-header-actions">
        <span v-if="user?.role === 'admin'" class="review-count">
          {{ charts.length }} 条{{ status === 'pending' ? '待审核' : '已发布' }}
        </span>
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
      <nav class="admin-tabs" aria-label="图表管理状态">
        <button
          type="button"
          :class="{ active: status === 'pending' }"
          @click="emit('update:status', 'pending')"
        >
          待审核
        </button>
        <button
          type="button"
          :class="{ active: status === 'published' }"
          @click="emit('update:status', 'published')"
        >
          已发布
        </button>
      </nav>

      <p v-if="error" class="user-panel-error">{{ error }}</p>

      <div v-if="charts.length === 0 && !loading" class="admin-empty">
        <span>QUEUE CLEAR</span>
        <strong>{{ status === 'pending' ? '没有待审核图表' : '没有已发布投稿' }}</strong>
        <p>{{ status === 'pending' ? '新的用户提交会自动出现在这里。' : '审核通过的用户投稿会出现在这里。' }}</p>
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

          <ChartPreview ref="previewRef" :code="selected.code" />

          <details class="review-code">
            <summary>查看源代码</summary>
            <pre>{{ selected.code }}</pre>
          </details>

          <div v-if="status === 'pending'" class="review-actions">
            <button
              class="approve-button"
              type="button"
              :disabled="loading || capturing"
              @click="submitApproval"
            >
              {{ capturing ? '生成缩略图' : loading ? '处理中' : '通过并发布' }}
            </button>
            <label>
              拒绝原因
              <textarea v-model="actionNote" rows="3" placeholder="说明需要修改的问题"></textarea>
            </label>
            <p v-if="localError" class="review-local-error">{{ localError }}</p>
            <button class="reject-button" type="button" :disabled="loading" @click="submitSecondaryAction">
              拒绝并退回
            </button>
          </div>

          <div v-else class="review-actions unpublish-actions">
            <label>
              下架原因
              <textarea v-model="actionNote" rows="3" placeholder="说明下架原因，用户将看到此内容"></textarea>
            </label>
            <p v-if="localError" class="review-local-error">{{ localError }}</p>
            <button class="reject-button" type="button" :disabled="loading" @click="submitSecondaryAction">
              {{ loading ? '处理中' : '确认下架' }}
            </button>
          </div>
        </article>
      </div>
    </template>
  </section>
</template>
