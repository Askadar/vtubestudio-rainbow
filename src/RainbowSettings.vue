<template>
	<n-form v-model="settings">
		<n-form-item label="Enter wildcard of mesh(es) you want to animate" path="meshMatch">
			<n-input
				v-model:value="settings.meshMatch"
				placeholder="e.g. 'boob' will match meshes 'underboob', 'boob_left', 'chest_boob_right'"
			/>
		</n-form-item>
		<n-form-item label="Or select individual mesh(es). Wildcard above takes precedence" path="meshes">
			<n-select
				placeholder="Just start typing to filter the list"
				v-model:value="settings.meshes"
				:options="meshOptions"
				multiple
				filterable
				:clear-filter-after-select="false"
				clearable
			/>
		</n-form-item>
		<n-form-item path="jebMode">
			<n-space vertical>
				<n-checkbox v-model:checked="settings.jebMode">
					Whether to use simple rainbow cycle provided by VTube Studio.
				</n-checkbox>
				<p v-if="settings.jebMode">
					It should be faster, but lacks all the extra settings (just one atm 😏) of custom mode.
				</p>
			</n-space>
		</n-form-item>
		<template v-if="!settings.jebMode">
			<n-form-item label="Animation speed, how fast colours change." path="rate">
				<n-slider v-model:value="settings.rate" :step="0.1" :min="1" :max="5" />
				<n-input-number v-model:value="settings.rate" :step="0.1" :min="1" :max="5" />
			</n-form-item>
		</template>
		<n-button @click="saveSettings" type="tertiary">Save settings</n-button>
		<p>Saved settings will be applied next time you open the app.</p>
	</n-form>
</template>

<script lang="ts">
import { defineComponent, onMounted, PropType, reactive, watch } from 'vue'
import {
	NInput,
	NSpace,
	NForm,
	NFormItem,
	NButton,
	NSelect,
	NInputNumber,
	NSlider,
	NCheckbox,
} from 'naive-ui'
import { get, set, Settings } from './helpers'

export default defineComponent({
	props: {
		meshOptions: {
			type: Array as PropType<{ label: string; value: string }[]>,
			default: () => [] as { label: string; value: string }[],
		},
	},
	setup(_, ctx) {
		const settings = reactive({
			meshMatch: '',
			meshes: [] as string[],
			rate: 2.5,
			jebMode: false,
		})
		watch(settings, (newSettings) => ctx.emit('settings-change', newSettings))

		onMounted(() => {
			const storedSettings = get<Settings>('settings')

			if (storedSettings) Object.assign(settings, storedSettings)
		})

		const saveSettings = () => set('settings', settings)

		return { settings, saveSettings }
	},
	components: {
		NSpace,
		NForm,
		NFormItem,
		NInput,
		NInputNumber,
		NButton,
		NSelect,
		NSlider,
		NCheckbox,
	},
})
</script>
