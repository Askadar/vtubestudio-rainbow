import sqlite, { Database } from 'better-sqlite3'
import SQL, { SQLStatement } from 'sql-template-strings'

const connection: Database = sqlite('state.db.sqlite3')

const createExecuteQuery = (queryName: 'get' | 'run' | 'all') => (query: SQLStatement) => {
	const { sql, values } = query

	return connection.prepare(sql)[queryName](...values)
}

export const run = createExecuteQuery('run')
export const get = createExecuteQuery('get')
export const all = createExecuteQuery('all')

export const initTables = () => {
	run(SQL`CREATE table IF NOT EXISTS options (key text NOT NULL , value text)`)
	run(SQL`CREATE UNIQUE INDEX IF NOT EXISTS options__uniq_key ON options (key)`)

	run(SQL`CREATE table IF NOT EXISTS meshes (mesh text NOT NULL)`)
	run(SQL`CREATE UNIQUE INDEX IF NOT EXISTS meshes__uniq_mesh ON meshes (mesh)`)
}

export const getMeshSettings = () => {
	const dataArr = all(SQL`SELECT * FROM options WHERE key IN (${['meshContains']})`)

	const data = dataArr.reduce(
		(acc: Record<string, string>, { key, value }: { key: string; value: string }) => ({
			...acc,
			[key]: value,
		}),
		{}
	)
	const defaultData = {
		meshContains: '',
	}
	return { ...defaultData, ...data }
}

export const saveMeshSettings = (data: { key: string; value: string }[]) => {
	data.forEach(({ key, value }) =>
		run(SQL`REPLACE INTO options (key, value) VALUES (${key}, ${value})`)
	)
}

export default connection
