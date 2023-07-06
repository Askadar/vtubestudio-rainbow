<template>
	<n-form v-model="settings" :label-width="69">
		<n-grid cols="1 s:2" responsive="screen" :x-gap="24">
			<n-form-item-gi label="Enter wildcard of mesh(es) you want to animate" path="meshMatch">
				<n-input
					v-model:value="settings.meshMatch"
					placeholder="e.g. 'boob' will match meshes 'underboob', 'boob_left', 'chest_boob_right'"
					:disabled="!!settings.meshes.length"
				/>
			</n-form-item-gi>
			<n-form-item-gi
				label="Or select individual mesh(es). Wildcard takes precedence"
				path="meshes"
			>
				<n-select
					placeholder="You can start typing to filter the list"
					v-model:value="settings.meshes"
					:options="meshOptions"
					:clear-filter-after-select="false"
					multiple
					filterable
					clearable
					:disabled="!!settings.meshMatch"
				/>
			</n-form-item-gi>

			<n-form-item-gi
				label="Automatically disable Cycler after this time if set."
				path="timeoutAfter"
			>
				<n-space vertical>
					<n-space horizontal>
						<n-time-picker v-model:value="settings.timeoutAfter" timeZone="UTC" />
						<n-button
							quaternary
							type="error"
							title="Disable timeout"
							@click="settings.timeoutAfter = 0"
						>
							<template #icon>
								<n-icon><close /></n-icon>
							</template>
						</n-button>
					</n-space>
				</n-space>
			</n-form-item-gi>
			<n-form-item-gi label="Authenticate with Twitch to enable redeems integration" v-if="!redeems.length">
				<!-- <n-button color="#6441A4"> -->
				<a
					class="n-button n-button--default-type n-button--medium-type n-button--color"
					style="
						--n-bezier: cubic-bezier(0.4, 0, 0.2, 1);
						--n-bezier-ease-out: cubic-bezier(0, 0, 0.2, 1);
						--n-ripple-duration: 0.6s;
						--n-opacity-disabled: 0.5;
						--n-wave-opacity: 0.6;
						font-weight: 400;
						--n-color: #6441a4;
						--n-color-hover: rgba(125, 95, 179, 1);
						--n-color-pressed: rgba(88, 57, 144, 1);
						--n-color-focus: rgba(125, 95, 179, 1);
						--n-color-disabled: #6441a4;
						--n-ripple-color: #6441a4;
						--n-text-color: #fff;
						--n-text-color-hover: #fff;
						--n-text-color-pressed: #fff;
						--n-text-color-focus: #fff;
						--n-text-color-disabled: #fff;
						--n-border: 1px solid rgb(224, 224, 230);
						--n-border-hover: 1px solid #36ad6a;
						--n-border-pressed: 1px solid #0c7a43;
						--n-border-focus: 1px solid #36ad6a;
						--n-border-disabled: 1px solid rgb(224, 224, 230);
						--n-width: initial;
						--n-height: 34px;
						--n-font-size: 14px;
						--n-padding: 0 14px;
						--n-icon-size: 18px;
						--n-icon-margin: 6px;
						--n-border-radius: 3px;
					"
					:href="twitchOauthUrl"
					>Sell your soul to corporate tracking.</a
				>
				<!-- </n-button> -->
			</n-form-item-gi>
			<n-form-item-gi label="Your rewards hopefully" v-else>
				<n-select
					placeholder="Select redeem to start colour cycle. You can start typing to filter the list"
					v-model:value="settings.redeem"
					:options="redeems"
					:clear-filter-after-select="false"
					filterable
					clearable
				/>
			</n-form-item-gi>

			<n-form-item-gi
				label="Whether to use simple rainbow cycle provided by VTube Studio."
				path="jebMode"
				span="2"
			>
				<n-checkbox v-model:checked="settings.jebMode"
					>Using built-in cycle.
					<small style="font-size: 10px"
						>It should be faster, but lacks all the extra customizations: gradient colour, tint
						saturation, speed of animation.</small
					></n-checkbox
				>
			</n-form-item-gi>

			<template v-if="!settings.jebMode">
				<n-form-item-gi
					span="2"
					label="Custom gradient selection. Add stops by clicking on empty spots in right area. Clear stops by dragging them out of right area. Colour opacity affects tint strength against display lighting. Use white colour stops to disable tinting."
				>
					<GradientPicker
						class="gradient-picker gradient-picker--overrides"
						v-model="settings.gradient"
					/>
				</n-form-item-gi>
				<n-form-item-gi
					label-position="bottom"
					label="Tint saturation rate; full 100% usually look oversaturated, so unless you're using soft colours, 60-80% is recommended"
					path="tintSaturation"
				>
					<n-space vertical style="flex: 1">
						<n-slider v-model:value="settings.tintSaturation" :step="1" :min="1" :max="100" />
						<n-input-number v-model:value="settings.tintSaturation" :step="1" :min="1" :max="100" />
					</n-space>
				</n-form-item-gi>
				<n-form-item-gi label="Animation speed, how fast colours change." path="rate">
					<n-space vertical style="flex: 1">
						<n-slider v-model:value="settings.rate" :step="0.1" :min="1" :max="5" />
						<n-input-number v-model:value="settings.rate" :step="0.1" :min="1" :max="5" />
					</n-space>
				</n-form-item-gi>
			</template>

			<n-gi span="2">
				<n-space align="center">
					<slot name="enable-button" />
					<n-button @click="saveSettings" type="tertiary">Save settings</n-button>
					<span>Saved settings will be applied next time you open the app.</span>
				</n-space>
			</n-gi>
		</n-grid>
	</n-form>
</template>

<script lang="ts">
import { defineComponent, onMounted, PropType, reactive, watch } from 'vue'
import { Close } from '@vicons/carbon'
import { GradientPicker, LinearGradient } from 'vue-gradient-picker'
import 'vue-gradient-picker/dist/style.css'
import { get, set, Settings, defaultSettings, useTwitchIGFAuthData } from './helpers'

export default defineComponent({
	props: {
		meshOptions: {
			type: Array as PropType<{ label: string; value: string }[]>,
			default: () => [] as { label: string; value: string }[],
		},
		redeems: {
			type: Array as PropType<{ label: string; value: string }[]>,
			default: () => [] as { label: string; value: string }[],
		},
	},
	setup(_, ctx) {
		const settings: Settings = reactive({ ...defaultSettings }) as Settings

		watch(settings, (newSettings) => ctx.emit('settings-change', newSettings))

		onMounted(() => {
			const storedSettings = get<Settings>('settings')

			if (storedSettings) {
				const { gradient, ...genericStoredSettings } = storedSettings
				Object.assign(settings, genericStoredSettings)
				if (gradient)
					settings.gradient = new LinearGradient({ angle: gradient.angle, stops: gradient.stops })
			}
		})

		const saveSettings = () => set('settings', settings)
		const { twitchOauthUrl } = useTwitchIGFAuthData()

		return { settings, saveSettings, twitchOauthUrl }
	},
	components: {
		Close,
		GradientPicker,
	},
})
</script>

<style lang="stylus">
.vue-gpickr
	&.gradient-picker.gradient-picker--overrides
		width 100%
		gap 24px
		box-shadow none
		& > div
			padding 0
			&:last-child
				flex 1
			.vue-gpickr-stops-container > .vue-gpickr-stops-preview-container
				width auto
				height 50px
				margin 0
			.vc-sketch-saturation-wrap
				padding-bottom 50px

			// Hide controls that are not meaningful like angle selection
			.vue-gpickr-controls-container
			.vue-gpickr-preview-container
				display none
</style>
