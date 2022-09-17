<template>
	<n-layout>
		<n-layout-content content-style="padding: 24px">
			<loader>
				<n-space vertical>
					<rainbow-settings @settings-change="onSettingsUpdate" :mesh-options="meshOptions" />
					<n-button @click="toggleState" type="primary">{{
						!tickerState ? 'Enable' : 'Disable'
					}}</n-button>
				</n-space>
			</loader>
		</n-layout-content>
		<a style="position: fixed; bottom: 0px; padding: 8px" target="_useless-help" :href="supportUrl">
			Look for help here.
		</a>
	</n-layout>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, onUnmounted, reactive } from 'vue'
import { NSpace, NLayout, NLayoutContent, NButton } from 'naive-ui'
import { BehaviorSubject, from, interval, merge, timer } from 'rxjs'
import {
	mergeMap,
	tap,
	toArray,
	filter,
	takeUntil,
	map,
	switchMap,
	shareReplay,
	concatMap,
} from 'rxjs/operators'
import { refFrom } from 'vuse-rx'

import {
	set,
	tintClear,
	tintCustom,
	tintJeb,
	useVSPluginSingelton,
	Settings,
	defaultSettings,
} from './helpers'

import Loader from './Loader.vue'
import RainbowSettings from './RainbowSettings.vue'
import { Color, scale } from 'chroma-js'

export default defineComponent({
	setup() {
		const { plugin, $ready } = useVSPluginSingelton()

		const $meshesList = $ready.pipe(
			mergeMap(() => plugin.value?.apiClient.artMeshList() || []),
			map(({ artMeshNames }) => artMeshNames),
			shareReplay(1),
			tap((meshes) => set('meshes', meshes)),
		)

		const $tickerState = new BehaviorSubject<boolean | undefined>(undefined)
		const $forceClear = new BehaviorSubject<number>(0)
		onUnmounted(() => {
			$tickerState.complete()
			$forceClear.complete()
		})
		const $enabled = $tickerState.pipe(filter(Boolean))
		const $disabled = $tickerState.pipe(filter((state) => state === false))
		const $cleared = merge($disabled, $forceClear)
		const tickerState = refFrom($tickerState)

		const rpm = 30

		const sortedStops = computed(() =>
			[...settings.gradient.stops].sort(
				([_a, offsetA]: any, [_b, offsetB]: any) => offsetA - offsetB,
			),
		)
		const colours = computed(() => {
			const loopedStops = sortedStops.value.concat([sortedStops.value[0]])
			const stopColours = loopedStops.map(([colour]: [string]) => colour)
			const stopDomains = loopedStops.map((_, i) => i)
			const stopScale = scale(stopColours)
				.domain(stopDomains)
				.padding(1 / loopedStops.length / 2)

			return stopScale.colors(rpm * 5, 'rgba')
		})
		console.log(colours)

		const $ticker = $enabled.pipe(
			switchMap(() =>
				// TODO check rxjs performance when handling observable of 36000 items (60 updates/s for 60s/min for 10 min)
				timer(0, 10 * 60 * 1e3).pipe(
					takeUntil($disabled),
					switchMap(() => interval(Math.floor(1e3 / rpm)).pipe(takeUntil($disabled))),
				),
			),
		)

		const settings: Settings = reactive({ ...defaultSettings })
		const onSettingsUpdate = (newSettings: Settings) => {
			const tickerWasEnabled = tickerState.value
			Object.assign(settings, newSettings)
			if (newSettings.jebMode && tickerWasEnabled) {
				$tickerState.next(false)
				$tickerState.next(true)
			} else {
				$forceClear.next(1)
			}
		}

		const meshesList = refFrom($meshesList, [])
		const meshOptions = refFrom(
			$meshesList.pipe(
				switchMap((meshes) =>
					from(meshes).pipe(
						map((mesh) => ({ label: mesh, value: mesh })),
						toArray(),
					),
				),
			),
			[],
		)

		$ticker
			.pipe(filter(() => !settings.jebMode))
			.subscribe(tintCustom(plugin, settings, colours as unknown as ComputedRef<Color[]>))
		$enabled.pipe(filter(() => settings.jebMode)).subscribe(tintJeb(plugin, settings))
		$enabled
			.pipe(
				filter(() => settings.timeoutAfter > 1e3),
				concatMap(() => timer(settings.timeoutAfter).pipe(takeUntil($disabled))),
				filter(() => settings.timeoutAfter > 1e3 && !!tickerState.value),
			)
			.subscribe(() => $tickerState.next(false))
		$cleared.subscribe(tintClear(plugin))

		const toggleState = async () => {
			$tickerState.next(!tickerState.value)
		}

		const supportUrl = process.env.SUPPORT_URL
		return {
			supportUrl,

			settings,
			onSettingsUpdate,

			meshesList,
			meshOptions,

			tickerState,
			toggleState,
		}
	},
	components: {
		NSpace,
		NLayout,
		NLayoutContent,
		NButton,
		Loader,
		RainbowSettings,
	},
})
</script>
