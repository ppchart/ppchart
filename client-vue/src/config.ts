import { os } from "@/utils/detect";

const config = (() => ({
    isMobileApp: !os.desktop,
    ossBase: window.location.protocol + '//' + import.meta.env.VITE_APP_OSS_DOMAIN
}))()

export default config