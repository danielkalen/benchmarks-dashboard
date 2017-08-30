require '../sugar'
Promise = require 'bluebird'
extend = require 'smart-extend'
chalk = require 'chalk'
defaults = require '../defaults'


module.exports = (suite, settings)->
	settings = extend.clone(defaults.run, settings, {suite})
	Runner = if settings.browser is 'electron' then require('./node') else require('./browser')
	runner = new Runner(settings)

	runner.run()
		.catch (err)->
			console.error(err)
			process.exit(1)