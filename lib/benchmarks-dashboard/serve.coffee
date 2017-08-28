Promise = require 'bluebird'
express = require 'express'
compress = require 'compression'
bodyParser = require 'body-parser'
uaParser = require 'ua-parser-js'
extend = require 'smart-extend'
SimplyImport = require 'simplyimport'
Sass = Promise.promisifyAll require 'node-sass'
path = require 'path'
fs = require 'fs-jetpack'
defaults = require '../defaults'
ROOT = path.resolve __dirname,'../../'


module.exports = (port, options)->
	options = extend.clone(defaults.serve, options, {port})
	app = express()

	DB = new ()->
		@results = {}
		STORE_PATH = path.resolve(options.dashboard, 'results.json')
		
		fs.fileAsync(STORE_PATH).then ()=>
			fs.readAsync(STORE_PATH).then (results)=>
				@results = JSON.parse(results) if results

		@save = ()-> fs.writeAsync(STORE_PATH, @results)
		
		@add = ({library, version, testName, testDesc, result, UA, nonSharedTest})->
			UA = getUA(UA)
			@results ?= {}
			@results[testName] ?= 'name':testName,'desc':testDesc, 'values':{}
			@results[testName].nonSharedTest = nonSharedTest or false
			@results[testName].values[UA] ?= {}
			@results[testName].values[UA][library] ?= {}
			@results[testName].values[UA][library][version] = result
			@save()

		return @


	getUA = (uaString = '')->
		UA = uaParser(uaString).browser
		UA = "#{UA.name} #{UA.major or UA.version}"



	## ==========================================================================
	## Middleware
	## ========================================================================== 
	app.set 'views', "#{ROOT}/client/pug"
	app.set 'view engine', 'pug'
	app.set 'view cache', true
	app.use compress()
	app.use express.static(options.dashboard, maxAge: 2592000000)
	app.use bodyParser.json({limit:'500mb'}) # Enable JSON req parsing
	app.use bodyParser.urlencoded({extended:true, limit:'500mb'})




	## ==========================================================================
	## Router
	## ========================================================================== 
	app.get '/', (req, res)->
		res.render 'index', require('./build').index(options)
	
	# app.get /\/suite(\/.+)?/, (req, res)->
	# 	res.render 'index'

	app.get '/coffee/:file', (req, res)->
		Promise.resolve("#{ROOT}/client/coffee/#{req.params.file}")
			.tap (file)-> if not fs.exists(file) then promiseBreak(res.status(404).send('Not Found'))
			.then (file)-> SimplyImport.build {file}
			.then (result)-> res.header('Content-Type', 'text/javascript').send(result)
			.catch promiseBreak.end
			.catch (err)-> res.status(500).send(err.message)

	app.get '/sass/:file', (req, res)->
		Promise.resolve("#{ROOT}/client/sass/#{req.params.file}")
			.tap (file)-> if not fs.exists(file) then promiseBreak(res.status(404).send('Not Found'))
			.then (file)-> Sass.renderAsync({
				file,
				importer: require('sass-module-importer')()
				functions: require('@danielkalen/sass-base')
				outputStyle: 'nested'
			})
			.then (result)-> res.header('Content-Type', 'text/css').send(result)
			.catch promiseBreak.end
			.catch (err)-> res.status(500).send(err.message)


	app.get '/get', (req, res)->
		UA = getUA(req.query.UA)
		responseResult = {'selfUA':UA, 'tests':DB.results or {}}
		output = extend.clone.deep(responseResult)
		res.json(output)


	app.post '/set', (req, res)->
		req.body.nonSharedTest = if req.body.nonSharedTest is 'false' then false else if req.body.nonSharedTest then true
		res.json(req.body)
		DB.add(req.body)








	## ==========================================================================
	## Server init
	## ========================================================================== 
	app.listen options.port, ()->
		console.log("Server running on http://localhost:#{options.port}")
	.on 'error', console.log.bind(console)





