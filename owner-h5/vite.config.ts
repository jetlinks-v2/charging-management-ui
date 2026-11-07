import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({plugins:[vue({template:{compilerOptions:{isCustomElement:tag=>tag==='altcha-widget'}}})],server:{proxy:{'/api':{target:process.env.FINANCE_API_PROXY||'http://localhost:8800',changeOrigin:true,rewrite:path=>path.replace(/^\/api/,'')}}}})
