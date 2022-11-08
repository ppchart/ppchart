import config from "@/config"
import Home from '@/views/home.vue'
import { RouteRecordName } from "vue-router"

export const isSearchEnabled = (pageLoaded: boolean, routeName?: RouteRecordName | null) => {
    return !config.isMobileApp && [Home.name].includes(String(routeName)) && pageLoaded
}