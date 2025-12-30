import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    host: true, // 監聽所有地址
    watch: {
      usePolling: true, // WSL2 環境需要使用 polling
      interval: 100 // 檢查文件變更的間隔（毫秒）
    },
    hmr: {
      overlay: true // 顯示錯誤覆蓋層
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
