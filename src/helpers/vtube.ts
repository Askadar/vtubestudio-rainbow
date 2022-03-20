import { Plugin } from 'vtubestudio'
import colours from './colours'

type Settings = {
	meshMatch: string
	meshes: string[]
}

const getMeshesFromWildcard = (meshMatch?: string) => {
	if (!meshMatch) {
		return undefined
	}

	return meshMatch.split(',')
}

export const tintJeb = (plugin: Plugin, settings: Settings) => () =>
	plugin.apiClient.colorTint({
		colorTint: {
			colorR: 255,
			colorG: 255,
			colorB: 255,
			colorA: 255,
			jeb_: true,
		},
		artMeshMatcher: {
			tintAll: false,
			nameContains: getMeshesFromWildcard(settings.meshMatch),
			nameExact: settings.meshes,
		},
	})

export const tintCustom = (plugin: Plugin, settings: Settings) => (index: number) =>
	plugin.apiClient.colorTint({
		colorTint: {
			colorR: colours[index % colours.length][0],
			colorG: colours[index % colours.length][1],
			colorB: colours[index % colours.length][2],
			colorA: 255,
			mixWithSceneLightingColor: 0.8,
		},
		artMeshMatcher: {
			tintAll: false,
			nameContains: getMeshesFromWildcard(settings.meshMatch),
			nameExact: settings.meshes,
		},
	})

export const tintClear = (plugin: Plugin, settings: Settings) => () =>
	plugin.apiClient.colorTint({
		colorTint: {
			colorR: 255,
			colorG: 255,
			colorB: 255,
			colorA: 255,
		},
		artMeshMatcher: {
			tintAll: true,
		},
	})
