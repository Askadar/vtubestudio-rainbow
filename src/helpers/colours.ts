// @ts-ignore Lib Needs typings
import Spline from 'cubic-spline'

const rgbs = [
	[255, 51, 0], // Red
	[255, 85, 0],

	[255, 153, 0], // Orange
	[255, 221, 0],

	[255, 255, 0], // Yellow
	[204, 255, 17],

	[102, 255, 51], // Green
	[68, 187, 187],

	[51, 153, 255], // Blue
	[51, 85, 187],

	[51, 51, 153], // "Indigo"
	[85, 51, 153],

	[153, 51, 153], // Violet
	[187, 51, 102],

	[255, 51, 0], // Loop back on Red
]

const colours = {
	index: Array(rgbs.length)
		.fill(null)
		.map((_, index) => index),
	...rgbs.reduce(
		({ red, green, blue }, [r, g, b]) => {
			red.push(r)
			green.push(g)
			blue.push(b)
			return { red, green, blue }
		},
		{ red: [] as number[], green: [] as number[], blue: [] as number[] }
	),
}

const clampTint = (tintValue: number) => Math.min(Math.max(tintValue, 80), 255)

const splineColours = (interpolationLevels = 10) => {
	const indexExtended = Array((colours.index.length - 1) * interpolationLevels)
		.fill(null)
		.map((_, index) => index / interpolationLevels)
	const redSpline = new Spline(colours.index, colours.red)
	const greenSpline = new Spline(colours.index, colours.green)
	const blueSpline = new Spline(colours.index, colours.blue)

	return indexExtended.map((index) => [
		clampTint(redSpline.at(index)),
		clampTint(greenSpline.at(index)),
		clampTint(blueSpline.at(index)),
	]) as [number[], number[], number[]]
}

export default splineColours()
