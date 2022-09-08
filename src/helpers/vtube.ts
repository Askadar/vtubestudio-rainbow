import { Plugin } from 'vtubestudio'
import { Ref } from 'vue'
import colours from './colours'

export interface Settings {
	meshMatch: string
	meshes: string[]
	rate: number
	jebMode: boolean
	timeoutAfter: number
}

const getMeshesFromWildcard = (meshMatch?: string) => {
	if (!meshMatch) {
		return undefined
	}

	return meshMatch.split(',')
}

export const tintJeb = (plugin: Ref<Plugin | undefined>, settings: Settings) => () =>
	plugin.value?.apiClient.colorTint({
		colorTint: {
			colorR: 255,
			colorG: 255,
			colorB: 255,
			colorA: 255,
			jeb_: true,
			mixWithSceneLightingColor: 0.65,
		},
		artMeshMatcher: {
			tintAll: false,
			nameContains: getMeshesFromWildcard(settings.meshMatch),
			nameExact: settings.meshes,
		},
	})

export const tintCustom =
	(plugin: Ref<Plugin | undefined>, settings: Settings) => (index: number) =>
		plugin.value?.apiClient.colorTint({
			colorTint: {
				colorR:
					colours[Math.floor(index * settings.rate * (colours.length / 118)) % colours.length][0],
				colorG:
					colours[Math.floor(index * settings.rate * (colours.length / 118)) % colours.length][1],
				colorB:
					colours[Math.floor(index * settings.rate * (colours.length / 118)) % colours.length][2],
				colorA: 255,
				mixWithSceneLightingColor: 0.75,
			},
			artMeshMatcher: {
				tintAll: false,
				nameContains: getMeshesFromWildcard(settings.meshMatch),
				nameExact: settings.meshes,
			},
		})

export const tintClear = (plugin: Ref<Plugin | undefined>) => () =>
	plugin.value?.apiClient.colorTint({
		colorTint: {
			colorR: 255,
			colorG: 255,
			colorB: 255,
			colorA: 255,
			mixWithSceneLightingColor: 0,
		},
		artMeshMatcher: {
			tintAll: true,
		},
	})
