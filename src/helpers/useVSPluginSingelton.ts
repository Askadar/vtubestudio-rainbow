import { Ref, ref } from 'vue'
import { BehaviorSubject, fromEvent, Observable } from 'rxjs'
import { filter, shareReplay, take } from 'rxjs/operators'
import { WebSocketBus, Plugin, ApiClient } from 'vtubestudio'

import { get, set } from '../helpers/storage'

const saveKey = (authKey: string) => {
	set('options.auth_key', authKey)
}
const loadKey = (): string | undefined => {
	return get('options.auth_key') || undefined
}

let instance: {
	plugin: Ref<Plugin | undefined>
	apiClient: Ref<ApiClient | undefined>
	webSocket: WebSocket
	$ready: Observable<boolean>
	$failed: Observable<Event>
}

export const useVSPluginSingelton = () => {
	if (!instance)
		instance = (() => {
			const webSocket = new WebSocket('ws://localhost:8001')
			const $failed = fromEvent(webSocket, 'error').pipe(shareReplay(1))
			const $socketReady = fromEvent<void>(webSocket, 'open').pipe(take(1), shareReplay(1))
			const $loadState = new BehaviorSubject(false)
			const $ready = $loadState.pipe(filter((state) => state === true))

			let bus = ref<WebSocketBus | undefined>()

			let apiClient = ref<ApiClient | undefined>()
			let plugin = ref<Plugin | undefined>()

			$socketReady.subscribe(() => {
				bus.value = new WebSocketBus(webSocket)
				apiClient.value = new ApiClient(bus.value)
				plugin.value = new Plugin(
					apiClient.value,
					'RainbowCycle',
					'ZN Development',
					undefined,
					loadKey(),
					saveKey,
				)

				$loadState.next(true)
				$loadState.complete()
			})

			return { plugin, apiClient, webSocket, $ready, $failed }
		})()

	return instance
}
