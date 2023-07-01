<template>
	<n-layout>
		<n-layout-content content-style="padding: 24px">
			<loader>
				<n-space vertical>
					<rainbow-settings
						@settings-change="onSettingsUpdate"
						:mesh-options="meshOptions"
						:redeems="redeems"
					/>
					<n-button @click="toggleState" type="primary">{{
						!tickerState ? 'Enable' : 'Disable'
					}}</n-button>
				</n-space>
			</loader>
		</n-layout-content>
		<a
			v-if="supportUrl"
			style="position: fixed; bottom: 0px; padding: 8px"
			target="_useless-help"
			:href="supportUrl"
		>
			Look for help here.
		</a>
		<news />
	</n-layout>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, onUnmounted, reactive } from 'vue'
import {
	BehaviorSubject,
	combineLatest,
	from,
	fromEvent,
	interval,
	merge,
	Observable,
	Subject,
	Subscription,
	timer,
} from 'rxjs'
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
	withLatestFrom,
	pairwise,
} from 'rxjs/operators'

import {
	get,
	set,
	tintClear,
	tintCustom,
	tintJeb,
	useVSPluginSingelton,
	Settings,
	defaultSettings,
	useObservable,
	requestTwitch,
	useTwitchIGFAuthData,
	getArtMeshes,
} from './helpers'

import Loader from './Loader.vue'
import News from './News.vue'
import RainbowSettings from './RainbowSettings.vue'
import { Color, scale } from 'chroma-js'
import type {
	EventSubSubscriptions,
	GenericResponse,
	UsersResponse,
	RedeemsResponse,
} from './helpers/twitch'

export default defineComponent({
	setup() {
		const { plugin, $ready } = useVSPluginSingelton()

		const subscriptions: Subscription[] = []

		const $meshesList = $ready.pipe(
			mergeMap(() => getArtMeshes(plugin) || []),
			shareReplay(1),
			tap((meshes) => set('meshes', meshes)),
		)

		const $tickerState = new BehaviorSubject<boolean | undefined>(undefined)
		const $forceClear = new BehaviorSubject<number>(0)

		const $selectedRedeem = new BehaviorSubject<null | string>(null)
		const $subscriptionId = new Subject<string>()
		const $currentUser = new BehaviorSubject<null | string>(get<string>('current_user'))
		const $redeems = new BehaviorSubject([] as Array<{ label: string; value: string }>)
		const $sessionId = new Subject<string>()
		const $eventSub = new BehaviorSubject<WebSocket | null>(null)
		const $keepalive = new Subject<number>()
		const $keepaliveInterval = new Subject<Observable<number>>()

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

		const createWebsocket = () => new WebSocket('wss://eventsub.wss.twitch.tv/ws')
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

			if (newSettings.redeem) {
				if (!$eventSub.value) {
					$eventSub.next(createWebsocket())
				}

				if (newSettings.redeem !== $selectedRedeem.value) {
					$selectedRedeem.next(newSettings.redeem)
				}
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

		subscriptions.push(
			$ticker
				.pipe(filter(() => !settings.jebMode))
				.subscribe(tintCustom(plugin, settings, colours as unknown as ComputedRef<Color[]>)),
		)
		subscriptions.push(
			$enabled.pipe(filter(() => settings.jebMode)).subscribe(tintJeb(plugin, settings)),
		)

		$enabled
			.pipe(
				filter(() => settings.timeoutAfter > 1e3),
				concatMap(() => timer(settings.timeoutAfter).pipe(takeUntil($disabled))),
				filter(() => settings.timeoutAfter > 1e3 && !!tickerState.value),
			)
			.subscribe(() => $tickerState.next(false))
		subscriptions.push($cleared.subscribe(tintClear(plugin)))

		const toggleState = async () => {
			$tickerState.next(!tickerState.value)
		}

		const supportUrl = import.meta.env.VITE_SUPPORT_URL

		// !TODO be mindful of refactoring new code below
		const { authCode } = useTwitchIGFAuthData()
		// !TODO type message
		const $notification = new Subject<any>()

		subscriptions.push(
			$currentUser
				.pipe(
					mergeMap((userId) =>
						requestTwitch<RedeemsResponse>(
							'GET',
							`https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${userId}`,
						),
					),
				)
				.subscribe((redeems) => {
					$redeems.next(redeems.data.map(({ id, title }) => ({ label: title, value: id })))
				}),
		)

		/**
		 * Prolly a bit too smart
		 * Emits every keepalive timeout, grabs two last emits from $keepalive
		 * and if they match (there was a skipped keepalive) recreates WebSocket
		 * But this allows socket to be fully dependent
		 */
		subscriptions.push(
			$keepaliveInterval
				.pipe(
					withLatestFrom($keepalive),
					map(([_timerValue, keepAliveIndex]) => keepAliveIndex),
					pairwise(),
					filter((keepAliveIndice) => keepAliveIndice[0] === keepAliveIndice[1]),
				)
				.subscribe(() => $eventSub.next(createWebsocket())),
		)

		subscriptions.push(
			$eventSub
				.pipe(
					filter(Boolean),
					mergeMap((socket) => fromEvent<MessageEvent>(socket, 'message')),
				)
				.subscribe((message) => {
					const data = JSON.parse(message.data)

					switch (data.metadata.message_type) {
						case 'session_welcome':
							$sessionId.next(data.payload?.session?.id)
							$keepaliveInterval.next(
								interval(parseInt(data.payload?.session?.keepalive_timeout_seconds) * 1e3),
							)
							break
						case 'session_keepalive':
							$keepalive.next(Math.random())
							break
						case 'notification':
							$notification.next(data.payload)
							break
						default:
							break
					}
				}),
		)

		subscriptions.push(
			$notification.subscribe((notification) => {
				switch (notification.subscription.type) {
					case 'channel.channel_points_custom_reward_redemption.add':
						$tickerState.next(true)
						break
					default:
						break
				}
			}),
		)

		subscriptions.push(
			combineLatest([$selectedRedeem, $sessionId]).subscribe(async ([reward_id, sessionId]) => {
				const resp = await requestTwitch<GenericResponse>(
					'POST',
					'https://api.twitch.tv/helix/eventsub/subscriptions',
					{
						type: 'channel.channel_points_custom_reward_redemption.add',
						version: '1',
						condition: {
							broadcaster_user_id: $currentUser.value,
							reward_id,
						},
						transport: {
							method: 'websocket',
							session_id: sessionId,
						},
					},
				)

				$subscriptionId.next(resp.data[0].id)
			}),
		)
		subscriptions.push(
			$subscriptionId.pipe(pairwise()).subscribe(([prev]) => {
				requestTwitch('DELETE', `https://api.twitch.tv/helix/eventsub/subscriptions?id=${prev}`)
			}),
		)

		if (authCode) {
			// Clean up old subscriptions
			requestTwitch<EventSubSubscriptions>(
				'GET',
				'https://api.twitch.tv/helix/eventsub/subscriptions',
			).then(async (subs) => {
				await Promise.all(
					subs.data
						.filter((sub) => sub.status === 'websocket_disconnected')
						.map((sub) =>
							requestTwitch(
								'DELETE',
								`https://api.twitch.tv/helix/eventsub/subscriptions?id=${sub.id}`,
							),
						),
				)
			})

			subscriptions.push(
				from(requestTwitch<UsersResponse>('GET', 'https://api.twitch.tv/helix/users'))
					.pipe(map((users) => users.data[0].id))
					.subscribe((userId) => {
						$currentUser.next(userId)
						set('current_user', userId)
					}),
			)
		}

		let redeems = useObservable($redeems)
		onUnmounted(() => subscriptions.forEach((sub) => sub.unsubscribe()))

		return {
			supportUrl,

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
