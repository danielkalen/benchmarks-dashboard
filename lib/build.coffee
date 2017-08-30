require('array-includes').shim()
Promise = require 'bluebird'
fs = require 'fs-jetpack'
Path = require 'path'
pug = require 'pug'
coffee = require 'coffee-script'
extend = require 'smart-extend'
chalk = require 'chalk'
helpers = require './helpers'
defaults = require './defaults'
ROOT = Path.resolve __dirname,'../'
PKG_FOLDERS = ['node_modules', 'bower_components']

buildIndex = (options)->
	options = extend.clone(defaults.serve, options)
	config = helpers.getConfig(options)
	libraries = []

	Promise.resolve(options.dir)
		.then fs.listAsync
		.filter (file)->
			fs.inspect(Path.resolve options.dir,file).type isnt 'file' and
			not config.ignores.includes(file) and
			not PKG_FOLDERS.some((pkg)-> file is pkg)
		
		.map (suite)-> helpers.resolveSuite(Path.resolve(options.dir, suite))
		.then (suites)-> helpers.sortSuites(suites)
		.then (suites)-> {options, suites, config, pretty:true}



buildSuite = (target, options)->
	Promise.resolve(Path.resolve(options.dir, target))
		.then helpers.resolveSuite
		.then (suite)-> extend.clone suite
		.then (suite)->
			suite.deps = suite.deps.map (dep,index)->
				"/dep/#{suite.fullname}/#{index}"

			return suite



exports.index = buildIndex
exports.suite = buildSuite