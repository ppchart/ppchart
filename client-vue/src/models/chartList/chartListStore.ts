import { defineStore } from "pinia"

export const useChartListStore = defineStore('chartList', {
    state: () => ({ searchValue: '', chartList: [], loading: false }),
    getters: {
        // double: (state) => state.count * 2,
    },
    actions: {
        increment() {
            // this.count++
        },
    },
})