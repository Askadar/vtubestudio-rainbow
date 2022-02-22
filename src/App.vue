<template>
	<n-layout>
		<n-layout-content content-style="padding: 24px">
			<n-space v-if="loading" justify="center">
				<n-gradient-text
					gradient="linear-gradient(90deg, rgb(255,51,0) 0%, rgb(102,255,51) 50%, rgb(51,102,255) 100%)"
					:font-size="24"
				>~Loading~</n-gradient-text>
				<div v-if="failed">
					<p>
						Oh-oh, seems like something went wrong somewhere, if there's no apparent problem, smack
						developer few times to make it work.
					</p>
					<p v-if="typeof failed === 'string'">
						Here's a friendly (not) message from developer about the issue:
						<b>{{ failed }}</b>
					</p>
				</div>
			</n-space>
			<n-space v-else vertical>
				<n-form :model="settings">
					<n-form-item label="Wildcard match which mesh to rainbow" path="meshMatch">
						<n-input
							v-model:value="settings.meshMatch"
							placeholder="e.g. 'boob' will match meshes 'underboob', 'boob_left', 'chest_boob_right'"
						/>
					</n-form-item>
					<n-form-item label="Or select individual meshes" path="meshes">
						<n-select
							placeholder="Just start typing to filter the list"
							v-model:value="settings.meshes"
							:options="meshesOptions"
							multiple
							filterable
							:clear-filter-after-select="false"
							clearable
						/>
					</n-form-item>
					<n-form-item label="Update rate, how many times a second color will shift" path="rate">
						<n-slider v-model:value="settings.rate" :step="1" :min="5" :max="60" />
						<n-input-number v-model:value="settings.rate" :step="1" :min="5" :max="60" />
					</n-form-item>
					<n-form-item path="jebMode">
						<n-space vertical>
							<n-checkbox
								v-model:checked="settings.jebMode"
							>Whether to use simple rainbow cycle provided by VTube Studio.</n-checkbox>Should be much faster because default custom implementation sends lots of commands
							with *rate* setting, so it might be less performant. Enable if there are slowdowns
						</n-space>
					</n-form-item>
					<n-form-item>
						<n-button @click="saveSettings">Save settings</n-button>
					</n-form-item>
				</n-form>
				<n-button @click="toggleState">{{ !enabled ? 'Enable' : 'Disable' }}</n-button>
			</n-space>
		</n-layout-content>
		<a
			style="position: fixed; bottom: 0px; padding: 8px;"
			target="_useless-help"
			href="https://github.com/Askadar/vtubestudio-rainbow/issues"
		>Look for help here.</a>
	</n-layout>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import {
	NInput,
	NSpace,
	NLayout,
	NLayoutContent,
	NGradientText,
	NForm,
	NFormItem,
	NButton,
	NSelect,
	NInputNumber,
	NSlider,
	NCheckbox,
} from 'naive-ui'
import { SelectMixedOption } from 'naive-ui/lib/select/src/interface'
import { ReplaySubject, interval, of } from 'rxjs'
import {
	mergeMap,
	tap,
	toArray,
	filter,
	switchMap,
	takeUntil,
	delay,
	skip,
} from 'rxjs/operators'
import { Plugin } from 'vtubestudio'

import { get, set } from './helpers/storage'
import { startup } from './helpers/startup'
import colours from './helpers/colours'

export default defineComponent({
	components: {
		NSpace,
		NLayout,
		NLayoutContent,
		NForm,
		NFormItem,
		NInput,
		NInputNumber,
		NButton,
		NSelect,
		NSlider,
		NCheckbox,
		NGradientText,
	},
	async mounted() {
		const { plugin, $ready, $failed } = startup()

		const existingSettings =
			get<{ meshMatch: string; meshes: string[]; jebMode: boolean; rate: number }>('settings')
		const meshesList = get<string[]>('meshes') || []

		$ready.subscribe(() => this.loading = false)
		$failed.subscribe(
			(err) =>
				(this.failed = `Couldn't connect to VTube Studio, make sure it's running and plugin server is enabled. If you changed default port for some reason, contact this plugin developer.`)

		)

		const $meshList = $ready.pipe(
			mergeMap(() => plugin.apiClient.artMeshList()),
			mergeMap(({ artMeshNames }) => artMeshNames),
			toArray(),
			tap((meshes) => set('meshes', meshes)),
		)

		const $rainbow = this.enabled$.pipe(
			skip(1),
			switchMap((enabled) =>
				enabled
					? this.settings.jebMode
						? of(null).pipe(
							delay(1),
							tap(() =>
								plugin.apiClient.colorTint({
									colorTint: {
										colorR: 255,
										colorG: 255,
										colorB: 255,
										colorA: 255,
										jeb_: true,
									},
									artMeshMatcher: {
										tintAll: false,
										nameContains: this.settings.meshMatch?.split(','),
										nameExact: this.settings.meshes,
									},
								})
							)
						)
						: interval(1e3 / this.settings.rate).pipe(
							takeUntil(this.enabled$.pipe(filter((a) => !a))),
							tap((index) =>
								plugin.apiClient.colorTint({
									colorTint: {
										colorR: colours[index % colours.length][0],
										colorG: colours[index % colours.length][1],
										colorB: colours[index % colours.length][2],
										colorA: 255,
										mixWithSceneLightingColor: 0.8,
									},
									artMeshMatcher: {
										tintAll: false,
										nameContains: this.settings.meshMatch?.split(','),
										nameExact: this.settings.meshes,
									},
								})
							)
						)
					: of(null).pipe(
						delay(1),
						tap(() =>
							plugin.apiClient.colorTint({
								colorTint: {
									colorR: 255,
									colorG: 255,
									colorB: 255,
									colorA: 255,
								},
								artMeshMatcher: {
									tintAll: false,
									nameContains: this.settings.meshMatch?.split(','),
									nameExact: this.settings.meshes,
								},
							})
						)
					)
			)
		)

		$rainbow.subscribe(() => null)
		$meshList.subscribe((meshes) => (this.meshesList = meshes))

		this.settings = {
			...this.settings,
			...existingSettings,
		}
		this.meshesList = meshesList

		this.plugin = plugin
	},

	computed: {
		meshesOptions(): SelectMixedOption[] {
			return this.meshesList.map(this.mapMeshToOption)
		},
	},
	data() {
		return {
			loading: true,
			failed: false as boolean | string,

			enabled: false,
			enabled$: new ReplaySubject<boolean>(1),
			settings: {
				meshMatch: '',
				meshes: [] as string[],
				rate: 30,
				jebMode: false,
			},
			meshesList: [] as string[],

			plugin: null as Plugin | null,
		}
	},

	watch: {
		settings: {
			deep: true,
			handler() {
				this.enabled$.next(this.enabled)
			},
		},
	},
	methods: {
		mapMeshToOption: (mesh: string) => ({ label: mesh, value: mesh }),
		saveSettings() {
			set('settings', this.settings)
		},
		async toggleState() {
			this.enabled = !this.enabled
			this.enabled$.next(this.enabled)
		},
	},
})
</script>
