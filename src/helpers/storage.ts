export const get = <T>(key: string): null | T => {
	try {
		const value = localStorage.getItem(key)
		if (!value) return null

		const data = JSON.parse(value)
		return data
	} catch (err) {
		console.warn(`Failed to get ${key} from storage`, err)
		return null
	}
}

export const set = (key: string, data: unknown): void => {
	try {
		if (!key) throw new Error('Empty key provided')

		const value = JSON.stringify(data)

		localStorage.setItem(key, value)
	} catch (err) {
		console.error(`Failed to set ${key} into storage`, err)
	}
}

export const setSession = (key: string, data: unknown): void => {
	try {
		if (!key) throw new Error('Empty key provided')

		const value = JSON.stringify(data)

		sessionStorage.setItem(key, value)
	} catch (err) {
		console.error(`Failed to set ${key} into storage`, err)
	}
}

export const getSession = (key: string): null | string => {
	const value = localStorage.getItem(key)
	if (!value) return null

	return value
}
