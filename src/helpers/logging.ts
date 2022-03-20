import { get } from './storage'

export const log = (message?: string, ...rest: unknown[]) => {
	if (get('__zn_debug') === true) console.log(message, ...rest)

	return undefined
}
