require('array-includes').shim()
Promise = require 'bluebird'
fs = require 'fs-jetpack'
Path = require 'path'
pug = require 'pug'
coffee = require 'coffee-script'
extend = require 'smart-extend'
semverCompare = require 'semver-compare'
chalk = require 'chalk'
helpers = require './helpers'
defaults = require './defaults'
ROOT = Path.resolve __dirname,'../'
INDEX_SOURCE_PATH = Path.resolve __dirname,'..','client','html','index.jade'
RUNNER_SOURCE_PATH = Path.resolve __dirname,'..','client','html','benchmarkSuite.jade'
PKG_FOLDERS = ['node_modules', 'bower_components']

buildIndex = (options, fromCLI)->
	options = extend.clone(defaults.build, options)
	config = helpers.getConfig(options)
	libraries = []

	Promise.resolve(options.dir)
		.then fs.listAsync
		.filter (file)->
			fs.inspect(Path.resolve options.dir,file).type isnt 'file' and
			not config.ignores.includes(file) and
			not PKG_FOLDERS.some((pkg)-> file is pkg)
		
		.map (suite)-> helpers.resolveSuite(Path.resolve(options.dir, suite))					
		.then (files)-> Object.values(files.groupBy('name')).map((group)-> group.sort (a,b)-> semverCompare(a.version, b.version)).flatten()
		.then (suites)-> {options, suites, config, pretty:true}



buildSuite = (target, options)->
	Promise.resolve(Path.resolve(options.dir, target))
		.then helpers.resolveSuite
		.then (suite)-> extend.clone suite
		.then (suite)->
			suite.deps = suite.deps.map (dep,index)->
				"/dep/#{suite.suite}/#{index}"

			return suite



exports.index = buildIndex
exports.suite = buildSuite