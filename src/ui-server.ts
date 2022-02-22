import express from 'express'
import body from 'body-parser'
import SQL from 'sql-template-strings'
import { get, run, getMeshSettings, saveMeshSettings } from './db'

const app = express()
app.set('view engine', 'ejs')

app.get('/', (req, res) => {
	res.render('index', getMeshSettings())
})

app.post('/', body.urlencoded(), (req, res) => {
	const { meshContains } = req.body
	const data = { meshContains }

	saveMeshSettings(Object.entries(data).map(([key, value]) => ({ key, value: value.toString() })))

	res.render('index', { ...getMeshSettings(), ...data })
})

const startListening = (port = 42069, host = 'localhost') => {
	app.listen(port, host, () => {
		console.log(`Ui server is listening on http://${host}:${port}`)
	})

	return app
}

export default startListening
