require('array-includes').shim()
Promise = require 'bluebird'
fs = require 'fs-jetpack'
path = require 'path'
pug = require 'pug'
coffee = require 'coffee-script'
extend = require 'smart-extend'
chalk = require 'chalk'
helpers = require './helpers'
defaults = require '../defaults'
ROOT = path.resolve __dirname,'../../'
INDEX_SOURCE_PATH = path.resolve __dirname,'..','client','html','index.jade'
RUNNER_SOURCE_PATH = path.resolve __dirname,'..','client','html','benchmarkSuite.jade'
PKG_FOLDERS = ['node_modules', 'bower_components']

buildIndex = (options, fromCLI)->
	options = extend.clone(defaults.build, options)
	config = helpers.getConfig(options, files)
	libraries = []

	Promise.resolve(options.src)
		.then fs.listAsync
		.filter (file)->
			fs.inspect(path.resolve options.src,file).type isnt 'file' and
			not config.ignores.includes(file) and
			not PKG_FOLDERS.some((pkg)-> file is pkg)
		
		.then (files)-> files.sort(require('semver-compare'))
		.then (suites)->

		Promise.map suites, (suite)->
			suite = path.resolve(options.src, suite)
			suiteFiles = fs.list(suite)
			suiteDir = path.basename(suite)
			split = suiteDir.split '@'
			title = split[0]
			name = split[0].toLowerCase().replace(/\s+/g, '-')
			version = split[1] or 'latest'
			location = "#{suiteDir}/runner.html"
			
			# ==== Build Test Runner =================================================================================
			Promise.props
				deps: helpers.getDepsArray(options, suite, suiteFiles)
				suiteFile: helpers.getCompiledSuiteFile(options, suite, suiteFiles)
			
			.then ({deps, suiteFile})->
				helpers.migrateDeps(options, suiteDir, suite, deps).then (deps)->
					suiteRunner = pug.renderFile RUNNER_SOURCE_PATH, {title, name, version, deps, pretty:true}

					fs.writeAsync path.join(options.dest, suiteDir, 'suite.js'), suiteFile
					fs.writeAsync path.join(options.dest, suiteDir, 'runner.html'), suiteRunner
					console.log "Finished Building #{chalk.dim suiteDir}" if fromCLI
					return {title, version, location}
					
			.catch (err)->
				console.error "Error while compiling #{suiteDir}", err
				process.exit(1)



		.then (libraries)->
			# ==== Build Index =================================================================================
			indexHTML = pug.renderFile INDEX_SOURCE_PATH, {options, libraries, config, pretty:true}
			fs.writeAsync path.join(options.dest, 'index.html'), indexHTML


buildSuite = (options)->
	Promise.resolve()
		.then ()->




exports.index = buildIndex
exports.suite = buildSuite