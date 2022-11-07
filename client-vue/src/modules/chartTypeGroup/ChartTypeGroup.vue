<script setup lang="ts">
import { CHART_TYPE_GROUP } from './constants'
import { RadioGroup, Radio } from "@arco-design/web-vue";
import useModel from '@/hooks/useModel'

const props = defineProps({
    modelValue: String,
});
const emits = defineEmits(['change'])
const modelValue = useModel(props)
</script>
<template>
    <template v-for="dataList in CHART_TYPE_GROUP">
        <RadioGroup type="button" v-model="modelValue" @change="typeName => emits('change', typeName)" size="large">
            <Radio :value="item" v-for="item in dataList" :key="item">{{ item }}</Radio>
        </RadioGroup>
        <div style="height: 10px"></div>
    </template>
</template>