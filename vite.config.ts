import { defineConfig } from 'vite'
import analyze from 'rollup-plugin-visualizer'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import browserslistToEsbuild from 'browserslist-to-esbuild'

export default defineConfig({
	plugins: [
		vue(),
		AutoImport({
			imports: [
				'vue',
				{
					'naive-ui': [],
				},
			],
		}),
		Components({
			resolvers: [NaiveUiResolver()],
		}),
	],
	optimizeDeps: {
		exclude: ['pages'],
	},
	publicDir: './public',
	build: {
		outDir: './dist',
		target: browserslistToEsbuild(),
		rollupOptions: {
			// output: {
			// 	manualChunks: {
			// 		'naive-ui': ['naive-ui'],
			// 		components: ['chroma-js', 'vue-gradient-picker'],
			// 	},
			// },
			plugins: [analyze()],
		},
	},
})
