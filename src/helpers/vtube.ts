import { Color } from 'chroma-js'
import { Plugin } from 'vtubestudio'
import { Ref } from 'vue'
// @ts-ignore
import { LinearGradient } from 'vue-gpickr'

export interface Settings {
	meshMatch: string
	meshes: string[]
	rate: number
	jebMode: boolean
	timeoutAfter: number
	gradient: LinearGradient
	tintSaturation: number
}

export const defaultSettings: Settings = {
	meshMatch: '',
	meshes: [],
	rate: 2.5,
	jebMode: false,
	timeoutAfter: 0,
	tintSaturation: 80,
	gradient: new LinearGradient({
		angle: 90,
		stops: [
			['#FF0000BF', 0],
			['#FF9200BF', 0.16],
			['#FFDB00BF', 0.33],
			['#64FF00BF', 0.49],
			['#00FFD1BF', 0.66],
			['#0000FFBF', 0.82],
			['#C800FFBF', 1],
		],
	}),
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
	(plugin: Ref<Plugin | undefined>, settings: Settings, colours: Ref<Color[]>) => (index: number) =>
		plugin.value?.apiClient.colorTint({
			colorTint: {
				colorR: colours.value[Math.floor(index * settings.rate)%colours.value.length].brighten(100 / (settings.tintSaturation * 1.5)).rgba()[0],
				colorG: colours.value[Math.floor(index * settings.rate)%colours.value.length].brighten(100 / (settings.tintSaturation * 1.5)).rgba()[1],
				colorB: colours.value[Math.floor(index * settings.rate)%colours.value.length].brighten(100 / (settings.tintSaturation * 1.5)).rgba()[2],
				colorA: 255,
				mixWithSceneLightingColor:
					colours.value[Math.floor(index * settings.rate) % colours.value.length].rgba()[3],
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
