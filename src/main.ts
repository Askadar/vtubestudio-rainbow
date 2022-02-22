import { Plugin } from 'vtubestudio'
import { firstValueFrom, fromEvent, Observable,  } from 'rxjs'
import { tap, take, mergeMap, map, toArray, shareReplay } from 'rxjs/operators'
import SQL from 'sql-template-strings'
import connection, { get, getMeshSettings, run } from './db'
import { startup } from './startup'

const updateStoredMeshList = async ($ready: Observable<void>, plugin: Plugin) => {
	const query = SQL`REPLACE INTO meshes (mesh) VALUES(?)`
	const statement = connection.prepare(query.sql)

	const $meshList = $ready.pipe(
		mergeMap(() => plugin.apiClient.artMeshList()),
		mergeMap(({ artMeshNames }) => artMeshNames),
		map((mesh) => statement.run(mesh))
	)

	return firstValueFrom(
		$meshList.pipe(
			toArray(),
			tap((a) => console.log(`wrote ${a.length} meshes`))
		)
	)
}

const main = async ({ url } = { url: 'ws://localhost:8001' }) => {
	const { webSocket, plugin } = startup(url)

	const $ready = fromEvent<void>(webSocket, 'open').pipe(take(1), shareReplay(1))

	// await updateStoredMeshList($ready, plugin)

	await firstValueFrom(
		$ready.pipe(
			map(() => getMeshSettings()),
			mergeMap(({meshContains}) =>
				plugin.apiClient.colorTint({
					colorTint: {
						colorR: 0.5,
						colorG: 0.4,
						colorB: 0.3,
						colorA: 20,
						jeb_: true,
						mixWithSceneLightingColor: 0.8,
					},
					artMeshMatcher: {
						tintAll: false,
						nameContains: meshContains.split(','),
					},
				})
			),
			tap((res) => console.log(res))
		)
	)
}

export default main
