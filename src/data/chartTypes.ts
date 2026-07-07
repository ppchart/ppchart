export interface ChartTypeOption {
  label: string;
  value: string;
}

export const chartTypes: ChartTypeOption[] = [
  { label: '全部', value: '' },
  { label: '折线图', value: '1' },
  { label: '饼图', value: '2' },
  { label: '柱状图', value: '3' },
  { label: '地图', value: '4' },
  { label: '词云', value: '5' },
  { label: '关系图', value: '6' },
  { label: '象形柱图', value: '7' },
  { label: '雷达图', value: '8' },
  { label: '矩树图', value: '9' },
  { label: '漏斗图', value: '10' },
  { label: '河流图', value: '11' },
  { label: '路径图', value: '12' },
  { label: 'K 线图', value: '13' },
  { label: '树状图', value: '14' },
  { label: '旭日图', value: '15' },
  { label: '平行坐标系', value: '16' },
  { label: '水球', value: '18' },
  { label: '散点图', value: '19' },
  { label: '桑吉图', value: '20' },
  { label: '仪表盘', value: '21' },
  { label: '盒须图', value: '22' },
  { label: '热力图', value: '23' }
];
