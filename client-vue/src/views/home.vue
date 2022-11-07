<script setup lang="ts">
import ChartTypeGroup from '@/modules/chartTypeGroup/ChartTypeGroup.vue';
import { Modal } from "@arco-design/web-vue";
import Bus from "@/bus";
import ChartList from "@/modules/chartList/ChartList.vue";
// import ChartDetail from "./chart-detail.vue";
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { CHART_TYPE_ALL } from '@/modules/chartTypeGroup/constants'

const categoryList = ref([
  ...CHART_TYPE_ALL.map((name, index) => ({
    type: `${index + 1}`,
    show: !index,
    name,
  })),
]);

const tabData = reactive({ currentType: "全部" });
const tabChange = (typeName: string) => {
  const tabItem = categoryList.value.find((item) => item.name === typeName);
  if (tabItem) tabItem.show = true;
};
const props = defineProps({
  searchData: String,
});
const chartDetail = reactive({
  visible: false,
  cid: '',
  handleOk: () => {
    chartDetail.visible = false;
  },
});
onMounted(() => {
  Bus.$on("home-search", (searchValue) => {
    Bus.$emit("search", { type: tabData.currentType, searchValue });
  });
});
onBeforeUnmount(() => {
  Bus.$off("search-loading");
});
const chartClick = (cid: string) => {
  chartDetail.cid = cid;
  chartDetail.visible = true;
};
</script>

<template>
  <div>
    <ChartTypeGroup v-model="tabData.currentType" @change="tabChange"></ChartTypeGroup>
    <template v-for="item in categoryList">
      <div v-if="item.show" :key="item.type">
        <ChartList v-show="item.name === tabData.currentType" :type="item.type" :searchData="props.searchData"
          @chartClick="chartClick"></ChartList>
      </div>
    </template>
    <Modal width="100%" v-model:visible="chartDetail.visible" @ok="chartDetail.handleOk" :hide-cancel="true"
      ok-text="关闭" :unmount-on-close="true">
      <template #title> 示例详情 </template>
      <div style="height: calc(100vh - 48px - 65px)">
        <!-- <ChartDetail :cid="chartDetail.cid"></ChartDetail> -->
      </div>
    </Modal>
  </div>
</template>

<style lang="scss">
.content {
  padding: 20px 30px;
}
</style>
