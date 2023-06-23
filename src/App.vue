<template>
	<n-layout>
		<n-layout-content content-style="padding: 24px">
			<n-space>
				<n-form>
					<n-form-item label="Touch the link do it">
						<a :href="twitchOauthUrl">
							Sell your soul to corporate tracking.
						</a>
					</n-form-item>
					<n-form-item label="Your rewards hopefully">
						<n-select
							placeholder="Just start typing to filter the list"
							:options="redeems"
							multiple
							filterable
							:clear-filter-after-select="false"
							clearable
						/>
					</n-form-item>
				</n-form>
			</n-space>
			<!-- <loader>
				<n-space vertical>
					<rainbow-settings @settings-change="onSettingsUpdate" :mesh-options="meshOptions" />
					<n-button @click="toggleState" type="primary">{{
						!tickerState ? 'Enable' : 'Disable'
					}}</n-button>
				</n-space>
			</loader> -->
		</n-layout-content>
		<a
			v-if="supportUrl"
			style="position: fixed; bottom: 0px; padding: 8px"
			target="_useless-help"
			:href="supportUrl"
		>
			Look for help here.
		</a>
		<!-- <news /> -->
	</n-layout>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, onUnmounted, reactive, ref } from 'vue'
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

import {
	set,
	setSession,
	tintClear,
	tintCustom,
	tintJeb,
	useVSPluginSingelton,
	Settings,
	defaultSettings,
	useObservable,
	log,
} from './helpers'

import Loader from './Loader.vue'
import News from './News.vue'
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
		const tickerState = useObservable($tickerState)

		const rpm = 30

		const sortedStops = computed(() =>
			[...settings.gradient.stops].sort(
				([_a, offsetA]: any, [_b, offsetB]: any) => offsetA - offsetB,
			),
		)
		const colours = computed(() => {
			const loopedStops = sortedStops.value.concat([sortedStops.value[0]])
			const stopColours = loopedStops.map(([colour]) => colour)
			const stopDomains = loopedStops.map((_, i) => i)
			const stopScale = scale(stopColours as string[])
				.domain(stopDomains)
				.padding(1 / loopedStops.length / 2)

			return stopScale.colors(rpm * 5, 'rgba')
		})

		const $ticker = $enabled.pipe(
			switchMap(() =>
				// TODO check rxjs performance when handling observable of 36000 items (60 updates/s for 60s/min for 10 min)
				timer(0, 10 * 60 * 1e3).pipe(
					takeUntil($disabled),
					switchMap(() => interval(Math.floor(1e3 / rpm)).pipe(takeUntil($disabled))),
				),
			),
		)

		const settings: Settings = reactive({ ...defaultSettings }) as Settings
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

		const meshesList = useObservable($meshesList, [])
		const meshOptions = useObservable(
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

		const supportUrl = import.meta.env.VITE_SUPPORT_URL

		// Using implicit grant flow https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#implicit-grant-flow
		const state = Math.round(Math.random() * Math.random() * 1e9).toString()
		setSession('twitch_oauth_state', state)
		let twitchOauthUrl = new URL('https://id.twitch.tv/oauth2/authorize')
		twitchOauthUrl.searchParams.set('client_id', import.meta.env.VITE_TWITCH_CLIENT_ID)
		twitchOauthUrl.searchParams.set('redirect_uri', import.meta.env.VITE_TWITCH_REDIRECT_URI)
		twitchOauthUrl.searchParams.set('response_type', 'token')
		twitchOauthUrl.searchParams.set('scope', ['channel:read:redemptions'].join(' '))
		twitchOauthUrl.searchParams.set('state', state)

		log('setup refresh test', { state })

		const authCode = document.location.hash.length
			? new URL(document.location.toString().replace('#', '?')).searchParams.get('access_token')
			: undefined
		log('auth code', { authCode, hashl: document.location.hash.length })

		let redeems = ref([] as Array<{ label: string; value: string }[]>)
		if (authCode) {
			const headers = new Headers([
				['Client-Id', import.meta.env.VITE_TWITCH_CLIENT_ID],
				['Authorization', `Bearer ${authCode}`],
			])

			fetch('https://api.twitch.tv/helix/users', { headers })
				.then(async (resp) => {
					if (resp.status >= 400) throw new Error(await resp.text())
					return resp.json()
				})
				.then((users) =>
					fetch(
						`https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${users.data[0].id}`,
						{
							headers,
						},
					)
						.then(async (resp) => {
							if (resp.status >= 400) throw new Error(await resp.text())
							return resp.json()
						})
						.catch((err) => alert(`Oopsie-daisy, we got an error: ${err}`)),
				)
				.then((rewards) => {
					redeems.value =
						rewards?.data?.map((reward: any) => ({
							label: reward.title,
							value: reward.id,
						})) ?? []
				})
		}

		return {
			supportUrl,
			twitchOauthUrl: twitchOauthUrl.toString(),

			redeems,

			settings,
			onSettingsUpdate,

			meshesList,
			meshOptions,

			tickerState,
			toggleState,
		}
	},
	components: { Loader, RainbowSettings, News },
})
</script>
