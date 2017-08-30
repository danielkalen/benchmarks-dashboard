Promise = require 'bluebird'
Path = require 'path'
fs = require 'fs-jetpack'
uaParser = require 'ua-parser-js'
semverCompare = require 'semver-compare'

exports.resolveUA = (uaString='')->
	return uaString if uaString is 'Electron'
	UA = uaParser(uaString).browser
	UA = "#{UA.name} #{UA.major or UA.version}"

exports.getConfig = (options)->
	configPath = Path.resolve(options.dir, 'config.json')
	config = if fs.exists(configPath) then fs.read(configPath, 'json') else {}
	config.ignores ?= []
	config.order ?= []
	config.meta ?= {}
	return config


exports.sortSuites = (suites, desc)->
	Object.values(suites.groupBy('name'))
		.sortBy '[0].name', desc
		.map (group)->
			group.sort (a,b)->
				if desc
					semverCompare(b.version, a.version)
				else
					semverCompare(a.version, b.version)
		.flatten()


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
	SimplyImport {file, debug:true, sourceMap:false}
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





