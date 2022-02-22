import { WebSocket } from 'ws'
import { WebSocketBus, Plugin, ApiClient } from 'vtubestudio'
import SQL from 'sql-template-strings'
import { run, get, initTables } from './db'

const saveKey = (authKey: string) => {
	run(SQL`REPLACE INTO options (key, value) VALUES('auth_key', ${authKey})`)
}
const loadKey = (): string => {
	return get(SQL`SELECT value FROM options WHERE key = ${'auth_key'}`)?.value
}

export const startup = (url: string) => {
	initTables()

	const webSocket = new WebSocket(url)

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

	return { plugin, apiClient, webSocket }
}
