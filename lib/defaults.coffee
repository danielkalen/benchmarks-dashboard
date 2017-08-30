path = require 'path'
timeunits = require 'timeunits'

module.exports =
	run:
		'browser': 'electron'
		'timeout': timeunits.minute*30
		'desc': false
		'keepOpen': false
		'host': 'localhost'
		'port': 13947
		'protocol': 'http'
		'suite': null

	serve:
		'dir': path.resolve('benchmarks')
		'port': 13947
		'title': 'Benchmarks Comparison'
		'subtitle': 'A rich comparison of various algorithmic implemenations'