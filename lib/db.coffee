Path = require 'path'
Promise = require 'bluebird'
extend = require 'smart-extend'
fs = require 'fs-jetpack'
helpers = require './helpers'


module.exports = class DB
	constructor: (@options)->
		@results = []
		@STORE_PATH = Path.resolve(@options.dir, 'results.json')
		
		Promise.bind(@)
			.then ()-> fs.fileAsync(@STORE_PATH)
			.then ()-> fs.readAsync(@STORE_PATH)
			.then (results)-> @results = JSON.parse(results) if results

	save: ()->
		fs.writeAsync(@STORE_PATH, @results)
	

	add: ({suite, test, result, userAgent})->
		browser = helpers.resolveUA(userAgent)
		if not targetTest = @results.find(test)
			@results.push targetTest = extend.clone.deep(schema.test, test)

		if not targetResult = targetTest.results.find({suite, browser})
			targetTest.results.push targetResult = extend.clone.deep(schema.result)
		
		extend targetResult, result, {suite, browser}
		@save()


schema = {}

schema.test =
	title: ''
	subtitle: ''
	nonShared: false
	results: []

schema.result = 
	suite: ''
	browser: ''
	ops: 0
	samples: 0
	time: 0
	margin: 1


# [
# 	{
# 		title: 'abc'
# 		subtitle: 'ABC 123!'
# 		results: [
# 			{
# 				browser: 'Chrome 53'
# 				time: 123
# 				margin: 12
# 			}
# 		]
# 	}
# ]











