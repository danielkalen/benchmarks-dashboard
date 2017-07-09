require('array-includes').shim()
Promise = require 'bluebird'
fs = require 'fs-jetpack'
path = require 'path'
pug = require 'pug'
coffee = require 'coffee-script'
SimplyImport = require 'simplyimport'
extend = require 'smart-extend'
chalk = require 'chalk'
defaults = require '../defaults'
INDEX_SOURCE_PATH = path.resolve __dirname,'..','client','html','index.jade'
RUNNER_SOURCE_PATH = path.resolve __dirname,'..','client','html','benchmarkSuite.jade'
PKG_FOLDERS = ['node_modules', 'bower_components']

module.exports = (options, fromCLI)->
	options = extend.clone(defaults.build, options)

	fs.listAsync(options.src).then (files)->
		config = getConfig(options, files)
		suites = files.filter (file)-> fs.inspect(path.resolve options.src,file).type isnt 'file'
		suites = sortSuitesByVersion(suites).filter (file)-> not config.ignores.includes(file) and not PKG_FOLDERS.some((pkg)-> file is pkg)
		libraries = []

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
				deps: getDepsArray(options, suite, suiteFiles)
				suiteFile: getCompiledSuiteFile(options, suite, suiteFiles)
			
			.then ({deps, suiteFile})->
				migrateDeps(options, suiteDir, suite, deps).then (deps)->
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


getConfig = (options, files)->
	config = if files.includes('config.json') then fs.read(path.join(options.src,'config.json'), 'json') else {}
	config.ignores ?= []
	config.order ?= []
	config.meta ?= {}
	return config


getDepsArray = (options, suite, suiteFiles)->
	if suiteFiles.includes('deps.json')
		fs.readAsync(path.resolve(suite,'deps.json'), 'json')
	else
		[]


getCompiledSuiteFile = (options, suite, suiteFiles)->
	isCoffee = suiteFiles.includes('suite.coffee')
	suiteFile = if isCoffee then 'suite.coffee' else 'suite.js'
	file = path.resolve(suite, suiteFile)
	
	SimplyImport({file, debug:true, noPkgConfig:true})


migrateDeps = (options, suiteDir, suite, deps)->
	depsDir = path.join options.dest, suiteDir, 'deps'
	fs.dirAsync(depsDir).then ()->
		Promise.map deps, (depSrc)->
			depSrc = path.join suite, depSrc
			depDest = path.join depsDir, path.basename(depSrc)

			fs.copyAsync(depSrc, depDest, overwrite:true)
				.then ()-> path.join 'deps', path.basename(depSrc)


sortSuitesByVersion = (suites)->
	suites.slice().sort (a,b)-> switch
		when parseName(a) isnt parseName(b) then switch
			when a > b then 1
			when a < b then -1
			else 0

		else switch
			when parseVersion(a,'major') > parseVersion(b,'major') then 1
			when parseVersion(a,'major') < parseVersion(b,'major') then -1
			else switch
				when parseVersion(a,'minor') > parseVersion(b,'minor') then 1
				when parseVersion(a,'minor') < parseVersion(b,'minor') then -1
				else switch
					when parseVersion(a,'patch') > parseVersion(b,'patch') then 1
					when parseVersion(a,'patch') < parseVersion(b,'patch') then -1
					when /\w/.test(a) or /\w/.test(b) then switch
						when parseVersion(a,'patch-word') > parseVersion(b,'patch-word') then 1
						when parseVersion(a,'patch-word') < parseVersion(b,'patch-word') then -1
						else 0
					else 0




parseName = (libraryString)->
	libraryString.split('@')[0]

parseVersion = (libraryString, level)->
	versionString = libraryString.split('@')[1] or ''
	versionBreakdown = versionString.split('.')

	switch level
		when 'major' then parseFloat(versionBreakdown[0]) or 0
		when 'minor' then parseFloat(versionBreakdown[1]) or 0
		when 'patch' then parseFloat(versionBreakdown[2]) or 0
		when 'patch-word' then versionBreakdown[2].split(/^\d+/)[1]





