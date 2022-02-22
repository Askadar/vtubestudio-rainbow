import { fromEvent } from 'rxjs'
import { shareReplay, take } from 'rxjs/operators'
import { WebSocketBus, Plugin, ApiClient } from 'vtubestudio'
import { get, set } from './storage'

const saveKey = (authKey: string) => {
	set('options.auth_key', authKey)
}
const loadKey = (): string | undefined => {
	return get('options.auth_key') || undefined
}

export const startup = () => {
	const webSocket = new WebSocket('ws://localhost:8001')
	const $failed = fromEvent(webSocket, 'error').pipe(shareReplay(1))
	const $ready = fromEvent<void>(webSocket, 'open').pipe(take(1), shareReplay(1))

	const bus = new WebSocketBus(webSocket)

	const apiClient = new ApiClient(bus)
	const plugin = new Plugin(
		apiClient,
		'RainbowCycle',
		'ZN Development',
		undefined,
		loadKey(),
		saveKey
	)

	return { plugin, apiClient, webSocket, $ready, $failed }
}
