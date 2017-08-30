Promise = require 'bluebird'
Browser = require 'nightmare'
timeunits = require 'timeunits'
chalk = require 'chalk'
helpers = require '../helpers'

class NodeRunner
	constructor: (@settings)->
		@url = "#{@settings.protocol}://#{@settings.host}:#{@settings.port}"
		@browser = new Browser(show:@settings.keepOpen, executionTimeout:@settings.timeout).useragent('Electron')
		@targetRegex = if @settings.suite then new RegExp(RegExp.escape(@settings.suite), 'i') else /.*/

	goto: (url)->
		Promise.bind(@)
			.then ()-> @browser.goto url
			.then (result)-> if result.code isnt 200
				throw new Error("Navigation Error: #{result.code} response from #{@url}")

	getSuites: ()->
		Promise.bind(@)
			# .then ()-> @goto(@url)
			# .then ()-> @browser.evaluate ()-> window.targetSuites
			.then ()-> require('../build').index()
			.get 'suites'
			.then (suites=[])-> helpers.sortSuites(suites, @settings.desc)
			.then (suites)-> @suites = suites

	run: ()->
		Promise.bind(@)
			.then @getSuites
			.filter (suite)-> @targetRegex.test suite.fullname
			.tap (suites)-> console.log "Found #{chalk.dim suites.length} matching suites"
			.mapSeries @runSuite
			.finally ()-> @browser.end() unless @keepOpen

	runSuite: (suite)->
		startTime = Date.now()
		
		Promise.bind(@)
			.then ()-> console.log "Started #{chalk.dim suite.fullname}"
			.then ()-> @goto "#{@url}/suite/#{suite.fullname}"
			.then ()->
				@browser
					.evaluate (done)->
						window.suite.run()
							.then (result)-> done(null, result)
							.catch done
					.end()

			.then ()-> console.log "Finished #{chalk.dim suite.fullname} in #{chalk.green (Date.now()-startTime)+'ms'}"




module.exports = NodeRunner