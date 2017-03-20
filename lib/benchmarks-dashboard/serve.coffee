Promise = require 'bluebird'
express = require 'express'
compress = require 'compression'
bodyParser = require 'body-parser'
uaParser = require 'ua-parser-js'
extend = require 'smart-extend'
path = require 'path'
fs = require 'fs-jetpack'
defaults = require '../defaults'


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
	app.use compress()
	app.use express.static(options.dashboard, maxAge: 2592000000)
	app.use bodyParser.json({limit:'500mb'}) # Enable JSON req parsing
	app.use bodyParser.urlencoded({extended:true, limit:'500mb'})




	## ==========================================================================
	## Router
	## ========================================================================== 
	app.get '/', (req, res)->
		res.sendFile path.resolve(options.dashboard, 'index.html')

	app.get '/js/:file', (req, res)->
		res.sendFile switch req.params.file
			when 'polyfills.js' then	path.resolve(__dirname,'..','..','node_modules','@danielkalen','polyfills','polyfills.js')
			when 'jquery.js' then		path.resolve(__dirname,'..','..','node_modules','jquery','dist','jquery.js')
			when 'humanize.js' then		path.resolve(__dirname,'..','..','node_modules','humanize','humanize.js')
			else						path.resolve(__dirname,'..','client','js',req.params.file)

	app.get '/css/:file', (req, res)->
		res.sendFile path.resolve(__dirname,'..','client','css',req.params.file)


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





