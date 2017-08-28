path = require 'path'

module.exports =
	run:
		'browser': 'chrome'
		'runTimes': 10
		'runDelay': 500
		'dontClose': false
		'direction': 'asc'
		'host': 'localhost'
		'port': 13947

	serve:
		'dir': path.resolve('benchmarks')
		'port': 13947
		'title': 'Benchmarks Comparison'
		'subtitle': 'A rich comparison of various algorithmic implemenations'