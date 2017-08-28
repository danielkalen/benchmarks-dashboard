path = require 'path'

exports.getConfig = (options, files)->
	config = if files.includes('config.json') then fs.read(path.join(options.src,'config.json'), 'json') else {}
	config.ignores ?= []
	config.order ?= []
	config.meta ?= {}
	return config


exports.getDepsArray = (options, suite, suiteFiles)->
	if suiteFiles.includes('deps.json')
		fs.readAsync(path.resolve(suite,'deps.json'), 'json')
	else
		[]


exports.getCompiledSuiteFile = (options, suite, suiteFiles)->
	isCoffee = suiteFiles.includes('suite.coffee')
	suiteFile = if isCoffee then 'suite.coffee' else 'suite.js'
	file = path.resolve(suite, suiteFile)
	
	SimplyImport({file, debug:true, noPkgConfig:true})


exports.migrateDeps = (options, suiteDir, suite, deps)->
	depsDir = path.join options.dest, suiteDir, 'deps'
	fs.dirAsync(depsDir).then ()->
		Promise.map deps, (depSrc)->
			depSrc = path.join suite, depSrc
			depDest = path.join depsDir, path.basename(depSrc)

			fs.copyAsync(depSrc, depDest, overwrite:true)
				.then ()-> path.join 'deps', path.basename(depSrc)








