<template>
	<n-space>
		<n-space vertical>
			123
			<n-input />
			<n-date-picker />
		</n-space>
	</n-space>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { createRxDatabase } from 'rxdb/plugins/core'
import { getRxStorageLoki } from 'rxdb/plugins/lokijs'
// @ts-ignore
import LokiIncrementalIndexedDBAdapter from 'lokijs/src/incremental-indexeddb-adapter'

import { NInput, NDatePicker, NSpace } from 'naive-ui'

export default defineComponent({
	components: {
		NInput,
		NDatePicker,
		NSpace
	},
	async mounted() {
		const db = await createRxDatabase({
			name: 'exampledb',
			storage: getRxStorageLoki({
				adapter: new LokiIncrementalIndexedDBAdapter(),
			}),
		})
		// const theme = createTheme()
		this.db = db
	},
	update() { },
	data() {

		return {
			db: null,
			count: 0,
		}
	},
})
</script>
