<script setup>
// import { RadioGroup, Radio, Modal } from "@arco-design/web-vue";
// import Bus from "../bus";
// import ChartList from "../components/ChartList.vue";
// import ChartDetail from "./chart-detail.vue";
// import { onBeforeUnmount, onMounted, reactive, ref } from "vue";
// const typeList = [
//   "折线图",
//   "饼图",
//   "柱状图",
//   "地图",
//   "词云",
//   "关系图",
//   "象形柱图",
//   "雷达图",
//   "矩树图",
//   "漏斗图",
//   "河流图",
//   "路径图",
//   "K 线图",
//   "树状图",
//   "旭日图",
//   "平行坐标系",
//   "水球",
//   "散点图",
//   "桑吉图",
//   "仪表盘",
//   "盒须图",
//   "热力图",
// ];
// const categoryList = ref([
//   { type: "1", name: "全部", show: true },
//   ...typeList.map((name, index) => ({
//     type: `${index + 2}`,
//     show: false,
//     name,
//   })),
// ]);

// const tabData = reactive({
//   currentType: "1",
// });
// const tabChange = (type) => {
//   const tabItem = categoryList.value.find((item) => item.type === type);
//   tabItem.show = true;
// };
// const props = defineProps({
//   searchData: String,
// });
// const chartDetail = reactive({
//   visible: false,
//   cid: null,
//   handleOk: () => {
//     chartDetail.visible = false;
//   },
// });
// onMounted(() => {
//   Bus.$on("home-search", (searchValue) => {
//     Bus.$emit("search", { type: tabData.currentType, searchValue });
//   });
// });
// onBeforeUnmount(() => {
//   Bus.$off("search-loading");
// });
// const chartClick = (cid) => {
//   chartDetail.cid = cid;
//   chartDetail.visible = true;
// };
</script>

<template>
  <div>
    <!-- <RadioGroup
      type="button"
      v-model="tabData.currentType"
      @change="tabChange"
      size="large"
    >
      <Radio
        :value="item.type"
        v-for="item in categoryList.slice(0, 11)"
        :key="item.type"
        >{{ item.name }}</Radio
      >
    </RadioGroup> -->
    <div style="height: 10px"></div>
    <!-- <RadioGroup
      type="button"
      v-model="tabData.currentType"
      @change="tabChange"
      size="large"
    >
      <Radio
        :value="item.type"
        v-for="item in categoryList.slice(11, categoryList.length)"
        :key="item.type"
        >{{ item.name }}</Radio
      >
    </RadioGroup> -->
    <!-- <template v-for="item in categoryList">
      <div v-if="item.show" :key="item.type">
        <ChartList
          v-show="item.type === tabData.currentType"
          :type="item.type"
          :searchData="props.searchData"
          @chartClick="chartClick"
        ></ChartList>
      </div>
    </template> -->
    <!-- <Modal
      width="100%"
      v-model:visible="chartDetail.visible"
      @ok="chartDetail.handleOk"
      :hide-cancel="true"
      ok-text="关闭"
      :unmount-on-close="true"
    >
      <template #title> 示例详情 </template>
      <div style="height: calc(100vh - 48px - 65px)">
        <ChartDetail :cid="chartDetail.cid"></ChartDetail>
      </div>
    </Modal> -->
  </div>
</template>

<style lang="scss">
.content {
  padding: 20px 30px;
}
</style>
