Promise = require 'bluebird'
Path = require 'path'
fs = require 'fs-jetpack'
uaParser = require 'ua-parser-js'

exports.resolveUA = (uaString='')->
	UA = uaParser(uaString).browser
	UA = "#{UA.name} #{UA.major or UA.version}"

exports.getConfig = (options)->
	configPath = Path.resolve(options.dir, 'config.json')
	config = if fs.exists(configPath) then fs.read(configPath, 'json') else {}
	config.ignores ?= []
	config.order ?= []
	config.meta ?= {}
	return config




exports.migrateDeps = (options, suiteDir, suite, deps)->
	depsDir = Path.join options.dest, suiteDir, 'deps'
	fs.dirAsync(depsDir).then ()->
		Promise.map deps, (depSrc)->
			depSrc = Path.join suite, depSrc
			depDest = Path.join depsDir, Path.basename(depSrc)

			fs.copyAsync(depSrc, depDest, overwrite:true)
				.then ()-> Path.join 'deps', Path.basename(depSrc)



exports.resolveSuite = ((suite)->
	result = {path:suite}
	result.files = fs.list(suite)
	result.dir = Path.dirname(suite)
	result.fullname = Path.basename(suite)
	result.suiteFile = result.files.find (candidate)-> candidate.startsWith('suite')
	result.suiteFile = Path.resolve(result.path, result.suiteFile)

	split = result.fullname.split '@'
	result.title = split[0]
	result.name = split[0].toLowerCase().replace(/\s+/g, '-')
	result.version = split[1] or 'latest'
	
	Promise.resolve(result)
		.then exports.resolveSuiteDeps
		.then (deps)-> result.deps = deps
		.return result
).memoize()
	


exports.resolveSuiteDeps = ((suite)->
	if suite.files.includes('deps.json')
		fs.readAsync(Path.resolve(suite.path,'deps.json'), 'json')
	else
		return []
).memoize()



SimplyImport = require 'simplyimport'
exports.compileCoffee = ((file)->
	SimplyImport {file}
)#.memoize()


Sass = Promise.promisifyAll require 'node-sass'
exports.compileSass = ((file)->
	Sass.renderAsync({
		file,
		importer: require('sass-module-importer')()
		functions: require('@danielkalen/sass-base')
		outputStyle: 'nested'
	})
).memoize()





