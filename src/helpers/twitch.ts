import { get, set, getSession, setSession } from './storage'

const TWITCH_STATE_KEY = 'twitch_oauth_state'
const TWITCH_AUTH_KEY = 'twitch_oauth_code'
let thisSessionState: string | null = null

type TwitchResponse<T> = {
	data: T[]
}
type TwitchUser = {
	id: string
}
export type UsersResponse = TwitchResponse<TwitchUser>
type TwitchRedeem = {
	id: string
	title: string
}
export type RedeemsResponse = TwitchResponse<TwitchRedeem>
export type EventSubSubscriptions = TwitchResponse<{
	id: string
	status: string | 'websocket_disconnected'
}>

export type UnknownRequest = {}
export type UnknownResponse = TwitchResponse<{ id: string }>
export type UQ = UnknownRequest
export type UR = UnknownResponse

export type GenericResponse = TwitchResponse<{ id: string }>

// Using implicit grant flow https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#implicit-grant-flow
export const useTwitchIGFAuthData = () => {
	let authCode: string | null = null
	if (document.location.hash.length) {
		const url = new URL(document.location.toString().replace('#', '?'))
		const state = url.searchParams.get('state')
		if (!state || !getSession(TWITCH_STATE_KEY))
			console.warn(
				`OAuth response state doesn't match expected state. Expected: ${getSession(
					TWITCH_STATE_KEY,
				)}, received ${state}`,
			)

		authCode = url.searchParams.get('access_token')
		set(TWITCH_AUTH_KEY, authCode)
	}

	if (!thisSessionState) {
		thisSessionState = Math.round(Math.random() * Math.random() * 1e9).toString()
		setSession(TWITCH_STATE_KEY, thisSessionState)
	}

	let twitchOauthUrl = new URL('https://id.twitch.tv/oauth2/authorize?response_type=token')

	twitchOauthUrl.searchParams.set('client_id', import.meta.env.VITE_TWITCH_CLIENT_ID)
	twitchOauthUrl.searchParams.set('redirect_uri', import.meta.env.VITE_TWITCH_REDIRECT_URI)
	twitchOauthUrl.searchParams.set('scope', ['channel:read:redemptions'].join(' '))
	twitchOauthUrl.searchParams.set('state', thisSessionState)

	return { twitchOauthUrl: twitchOauthUrl.toString(), authCode }
}

export const useTApi = () => {
	const authCode = get(TWITCH_AUTH_KEY)
	if (!authCode) throw new Error(`Missing auth code`)

	const headers = new Headers([
		['Client-Id', import.meta.env.VITE_TWITCH_CLIENT_ID],
		['Authorization', `Bearer ${authCode}`],
		['Content-Type', 'application/json'],
	])

	/**
	 * @throws Error(`string`) | Error(`http.status, http.statusText`)
	 */
	const handleTwitchDataResponse = async <T extends TwitchResponse<object>>(
		resp: Response,
	): Promise<T> => {
		if (!(resp.status >= 200 && resp.status < 300)) {
			try {
				throw new Error(await resp.text())
			} catch (err) {
				console.warn('Twitch API error', err)

				throw new Error(
					`Unexpected error parsing Twitch API response: [${resp.status}] ${resp.statusText}`,
				)
			}
		}

		try {
			const json = await resp.json()

			return json
		} catch (err) {
			console.warn('JSON parsing error', err)

			throw new Error(`Failed to parse Twitch Response as JSON`)
		}
	}

	/**
	 * @throws Error(`http.status, http.statusText`)
	 */
	const handleTwitchEmptyResponse = async (resp: Response): Promise<void> => {
		if (!(resp.status >= 200 && resp.status < 300)) {
			try {
				throw new Error(await resp.text())
			} catch (err) {
				console.warn('Twitch API error', err)

				throw new Error(
					`Unexpected error parsing Twitch API response: [${resp.status}] ${resp.statusText}`,
				)
			}
		}
	}

	const postFn = async <
		R extends GenericResponse = UnknownResponse,
		T extends object = UnknownRequest,
	>(
		url: string,
		data: T,
	): Promise<R> => {
		return fetch(url, { method: 'POST', headers, body: JSON.stringify(data) }).then(
			handleTwitchDataResponse<R>,
		)
	}

	const getFn = async <R extends GenericResponse>(url: string): Promise<R> => {
		return fetch(url, { method: 'GET', headers }).then(handleTwitchDataResponse<R>)
	}

	const delFn = async (url: string): Promise<void> => {
		return fetch(url, { method: 'DELETE', headers }).then(handleTwitchEmptyResponse)
	}

	return { post: postFn, get: getFn, del: delFn }
}
