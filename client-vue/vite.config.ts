import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd());
  const { VITE_APP_REAL_API, VITE_APP_BASE_API } = env;
  console.log(VITE_APP_BASE_API);

  return {
    plugins: [vue()],
    server: {
      port: 8080,
      proxy: {
        [VITE_APP_BASE_API]: {
          target: `https://${VITE_APP_REAL_API}`,
          changeOrigin: true,
          rewrite: (path) => path.replace(VITE_APP_BASE_API, '')
        },
      }
    },
    base: "./",
    resolve: {
      alias: {
        "@": resolve(__dirname, 'src'),
      }
    }
  }
})
