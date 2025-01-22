export const CHART_TYPE_TRANSLATIONS: Record<string, { zh: string; en: string }> = {
    All: { zh: "全部", en: "All" },
    LineChart: { zh: "折线图", en: "LineChart" },
    PieChart: { zh: "饼图", en: "PieChart" },
    BarChart: { zh: "柱状图", en: "BarChart" },
    Map: { zh: "地图", en: "Map" },
    WordCloud: { zh: "词云", en: "WordCloud" },
    RelationChart: { zh: "关系图", en: "RelationChart" },
    PictorialBar: { zh: "象形柱图", en: "PictorialBar" },
    RadarChart: { zh: "雷达图", en: "RadarChart" },
    Treemap: { zh: "矩树图", en: "Treemap" },
    FunnelChart: { zh: "漏斗图", en: "FunnelChart" },
    RiverChart: { zh: "河流图", en: "RiverChart" },
    PathChart: { zh: "路径图", en: "PathChart" },
    KLineChart: { zh: "K线图", en: "KLineChart" },
    TreeChart: { zh: "树状图", en: "TreeChart" },
    SunburstChart: { zh: "旭日图", en: "SunburstChart" },
    ParallelCoordinates: { zh: "平行坐标系", en: "ParallelCoordinates" },
    LiquidFill: { zh: "水球", en: "LiquidFill" },
    ScatterPlot: { zh: "散点图", en: "ScatterPlot" },
    SankeyDiagram: { zh: "桑吉图", en: "SankeyDiagram" },
    Dashboard: { zh: "仪表盘", en: "Dashboard" },
    BoxPlot: { zh: "盒须图", en: "BoxPlot" },
    HeatMap: { zh: "热力图", en: "HeatMap" }
};

// 将 CHART_TYPE_TRANSLATIONS 转换为数组
export const CHART_TYPE_ALL = Object.entries(CHART_TYPE_TRANSLATIONS).map(([key, value]) => ({
    key,
    value
}));
