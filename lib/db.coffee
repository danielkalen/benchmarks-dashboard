Path = require 'path'
Promise = require 'bluebird'
fs = require 'fs-jetpack'
helpers = require './helpers'


module.exports = class DB
	constructor: (@options)->
		@results = {}
		@STORE_PATH = Path.resolve(@options.dir, 'results.json')
		
		Promise.bind(@)
			.then ()-> fs.fileAsync(@STORE_PATH)
			.then ()-> fs.readAsync(@STORE_PATH)
			.then (results)-> @results = JSON.parse(results) if results

	save: ()->
		fs.writeAsync(@STORE_PATH, @results)
	
	add: ({library, version, testName, testDesc, result, UA, nonSharedTest})->
		UA = helpers.resolveUA(UA)
		@results ?= {}
		@results[testName] ?= 'name':testName,'desc':testDesc, 'values':{}
		@results[testName].nonSharedTest = nonSharedTest or false
		@results[testName].values[UA] ?= {}
		@results[testName].values[UA][library] ?= {}
		@results[testName].values[UA][library][version] = result
		@save()






