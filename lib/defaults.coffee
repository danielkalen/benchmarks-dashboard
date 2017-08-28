path = require 'path'

module.exports =
	build:
		'src': path.resolve('src')
		'dest': path.resolve('build')
		'title': 'Benchmarks Comparison'
		'subtitle': 'A rich comparison of various algorithmic implemenations'

	run:
		'browser': 'chrome'
		'runTimes': 10
		'runDelay': 500
		'dontClose': false
		'direction': 'asc'
		'host': 'localhost'
		'port': 13947

	serve:
		'dashboard': path.resolve('build')
		'port': 13947