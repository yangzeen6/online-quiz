import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000, // 设置开发服务器端口，默认是5173
    host: true, // 允许外部访问
    open: true  // 启动时自动打开浏览器
  }
})
