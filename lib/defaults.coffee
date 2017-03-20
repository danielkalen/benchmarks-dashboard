path = require 'path'

module.exports =
	build:
		'src': path.join('src')
		'dest': path.join('dest')

	run:
		'browser': 'chrome'
		'runTimes': 7
		'runDelay': 500
		'dontClose': false
		'direction': 'asc'

	serve:
		'dashboard': path.join('dest')
		'port': 13947