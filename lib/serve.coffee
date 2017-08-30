Promise = require 'bluebird'
promiseBreak = require 'promise-break'
express = require 'express'
compress = require 'compression'
bodyParser = require 'body-parser'
extend = require 'smart-extend'
mime = require 'mime'
Path = require 'path'
fs = require 'fs-jetpack'
helpers = require './helpers'
defaults = require './defaults'
ROOT = Path.resolve __dirname,'../'
process.env.fontsDir = Path.resolve ROOT,'client','fonts'


module.exports = (port, options)->
	options = extend.clone(defaults.serve, options, {port})
	app = express()
	DB = new (require './db')(options)


	## ==========================================================================
	## Middleware
	## ========================================================================== 
	app.set 'views', "#{ROOT}/client/pug"
	app.set 'view engine', 'pug'
	app.set 'view cache', true
	app.use compress()
	app.use bodyParser.json({limit:'500mb'}) # Enable JSON req parsing
	app.use bodyParser.urlencoded({extended:true, limit:'500mb'})




	## ==========================================================================
	## Router
	## ========================================================================== 
	app.get '/', (req, res, next)->
		Promise.resolve()
			.then ()-> require('./build').index(options)
			.then (data)-> res.render 'index', data
			.catch next

	app.get '/suite/:suite', (req, res, next)->
		Promise.resolve()
			.then ()-> require('./build').suite(req.params.suite, options)
			.then (suite)-> res.render 'suite', {suite}
			.catch next

	app.get '/dep/:suite/suite.js', (req, res, next)->
		Promise.resolve(req.params.suite)
			.then (suite)-> helpers.resolveSuite(Path.resolve(options.dir, suite))
			.get 'suiteFile'
			.then helpers.compileCoffee
			.then (result)-> res.header('Content-Type', 'text/javascript').send(result)
			.catch next

	app.get '/dep/:suite/:depIndex', (req, res, next)->
		Promise.resolve(req.params.suite)
			.then (suite)-> helpers.resolveSuite(Path.resolve(options.dir, suite))
			.then (suite)->
				targetDep = suite.deps[req.params.depIndex]
				targetDep = Path.resolve(suite.path,targetDep)
				promiseBreak(next()) if not fs.exists(targetDep)
				res.header('Content-Type', mime.lookup(targetDep))
				fs.createReadStream(targetDep).pipe(res)
			
			.catch promiseBreak.end
			.catch next

	app.get '/coffee/:file', (req, res, next)->
		Promise.resolve("#{ROOT}/client/coffee/#{req.params.file}")
			.tap (file)-> if not fs.exists(file) then promiseBreak(next())
			.then helpers.compileCoffee
			.then (result)-> res.header('Content-Type', 'text/javascript').send(result)
			.catch promiseBreak.end
			.catch next

	app.get '/sass/:file', (req, res, next)->
		Promise.resolve("#{ROOT}/client/sass/#{req.params.file}")
			.tap (file)-> if not fs.exists(file) then promiseBreak(next())
			.then helpers.compileSass
			.get 'css'
			.then (result)-> res.header('Content-Type', 'text/css').send(result)
			.catch promiseBreak.end
			.catch next


	app.get '/get', (req, res, next)->
		UA = helpers.resolveUA(req.query.UA)
		res.json 'selfUA':UA, 'tests':DB.results or []


	app.post '/set', (req, res, next)->
		req.body.nonShared = if req.body.nonShared is 'false' then false else if req.body.nonShared then true
		res.json(req.body)
		DB.add(req.body)


	app.use (req, res, next)->
		res.status(404).send('Not Found')


	app.use (err, req, res, next)->
		console.error(err.stack) unless res.headersSent
		res.status(500).send("Error: #{err.message}") unless res.headersSent
		next(err)



	## ==========================================================================
	## Server init
	## ========================================================================== 
	app.listen options.port, ()->
		console.log("Server running on http://localhost:#{options.port}")
	.on 'error', console.log.bind(console)





