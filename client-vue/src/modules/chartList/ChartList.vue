<script setup lang="ts">
import { DescData, Message } from "@arco-design/web-vue";
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";
import axios from "axios";
import moment from "moment";
import Bus from "@/bus";
import { useRouter } from "vue-router";
import {
  Spin,
  Card,
  CardGrid,
  CardMeta,
  Pagination,
  Descriptions,
} from "@arco-design/web-vue";
import { IconShareInternal } from "@arco-design/web-vue/es/icon";
import config from "@/config";

const thumbnailBase = `${config.ossBase}/ecg-storage/ec_gallery_thumbnail`;

const props = defineProps({
  type: String,
});

const chartData = reactive({
  chartList: [] as Array<{ title: string, thumbnailURL: string, cid: string, _desc: DescData[] }>,
  total: 0,
  pageIndex: 1,
  loading: false,
});

const convertTime = (timeStr: string) => {
  return moment(moment.utc(timeStr).toDate()).format("YYYY-DD-MM");
};

const getData = () => {
  chartData.loading = true;
  Bus.$emit("search-loading", true);
  axios
    .get(
      `${config.axiosBase}/api/chart-list?current=${chartData.pageIndex}&type=${props.type}&search=${searchValue.value}`
    )
    .then((res) => {
      const { code, chartList, message, total } = res.data;
      if (code === 0) {
        chartData.chartList = chartList.map((item: any) => {
          item.thumbnailURL = `${thumbnailBase}/${item.cid}.jpg`;
          item._desc = [
            { value: convertTime(item.createTime), label: "创建时间" },
            { value: item.echartsVersion, label: "echart版本" },
            { value: item.viewCount, label: "浏览量" },
          ];
          chartData.total = total;
          return item;
        });
      } else {
        Message.error(message || "服务器开小差了，请稍后再试...");
      }
    })
    .finally(() => {
      chartData.loading = false;
      Bus.$emit("search-loading", false);
    });
};

const searchValue = ref("");
onMounted(() => {
  getData();
  Bus.$on("search", ({ type: _type, searchValue: _searchValue }) => {
    searchValue.value = _searchValue;
    if (_type === props.type) {
      chartData.pageIndex = 1;
      getData();
    }
  });
});
onBeforeUnmount(() => {
  Bus.$off("search-loading");
});

const emits = defineEmits(["chartClick"]);

const chartClick = async (cid: string) => {
  emits("chartClick", cid);
};

const pageChange = (pageIndex: number) => {
  chartData.pageIndex = pageIndex;
  getData();
};
const router = useRouter();
const openTab = (cid: string) => {
  const url = router.resolve({ name: "chart-detail", params: { cid } });
  window.open(url.href, "_blank");
};
</script>

<template>
  <div>
    <Spin style="width: 100%; min-height: 300px" :loading="chartData.loading" tip="加载中，请稍后...">
      <Card :bordered="false" :style="{ width: '100%', backgroundColor: 'var(--color-bg-5)' }">
        <CardGrid v-for="(item, index) in chartData.chartList" class="chart-card" :key="index" :style="{
          width: `${config.isMobileApp ? 'calc(100% - 16px)' : 'calc(20% - 16px)'}`,
          cursor: 'pointer',
          margin: '12px 8px',
          backgroundColor: 'var(--color-bg-2)',
        }">
          <Card hoverable :style="{ width: '100%' }" :title="item.title || '-'">
            <template #extra>
              <IconShareInternal size="20" @click="() => openTab(item.cid)" />
            </template>
            <template #cover>
              <div :style="{ height: '175px', overflow: 'hidden' }" @click="() => chartClick(item.cid)">
                <img alt="dessert" :src="item.thumbnailURL" :style="{
                  width: '100%',
                  transform: 'translateY(-20px)',
                }" />
              </div>
            </template>
            <CardMeta>
              <template #description>
                <Descriptions :data="item._desc" layout="inline-vertical" :column="3"
                  @click="() => chartClick(item.cid)" />
              </template>
            </CardMeta>
          </Card>
        </CardGrid>
      </Card>
    </Spin>
    <div class="pagination">
      <Pagination :total="chartData.total" show-total @change="pageChange" :disabled="chartData.loading"
        :page-size="20" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.pagination {
  display: flex;
  justify-content: end;
}

.chart-card {
  .arco-card-body {
    padding: 8px 8px 0 8px !important;
  }

  .arco-card-header {
    cursor: initial;
    padding: 0 16px;
    height: 36px;

    .arco-card-header-extra {
      cursor: pointer;
    }
  }
}
</style>
