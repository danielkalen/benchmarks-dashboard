promiseEvent = import 'p-event'
extend = import 'smart-extend'
axios = import 'axios'
Benchmark = import 'benchmark'
template = import './template'
settings = import './settings'
defaults = import './defaults'


class Test	
	constructor: (settings)->
		return new Test(arguments[0]) if @constructor isnt Test
		@settings = extend.clone(defaults, settings)
		@settings.nonShared = @settings.nonSharedTest if @settings.nonSharedTest?
		@suite = window.suite
		@state = running:false, errored:false, result:false
		@context = Object.create(null)
		@el = template.test.spawn(@settings)
		@settings.testFn = @settings.testFn.bind(@context)
		@settings.teardownFn ?= ()=> @el.child.sandbox.empty()
		@benchmark = new Benchmark.Suite('suite', @settings)
			.add 'test', ()=> @settings.testFn()

		@_attachBindings()
		@suite.tests.push(@)

	_attachBindings: ()->
		@el.child.button.on 'click', @run.bind(@)
		
		SimplyBind('running').of(@state)
			.to (running)=> @el.state {running}
		
		SimplyBind('errored').of(@state)
			.to (errored)=> @el.state {errored}
			.and.to ()=> setTimeout ()=>
				@state.errored = false
			, 3000


	storeResults: ()-> if window.location.hostname and @suite.settings.storeResults
		Promise.bind(@)
			.then ()-> axios.post('/set', {
				suite: @suite.fullname
				test: {title:@settings.title, subtitle:@settings.subtitle}
				userAgent: @suite.userAgent
				result: @state.result
			})
			.catch throwError


	run: ()-> unless @state.running
		@state.running =
		Promise.bind(@)
			.then ()-> @settings.setupFn.call(@context, @el.child.sandbox)
			.then ()->
				result = promiseEvent(@benchmark, 'complete')
				@benchmark.run()
				return result
			
			.then ()-> @settings.teardownFn.call(@context, @el.child.sandbox)
			.then ()-> @storeResults()
			.finally ()-> @state.running = false
			.tapCatch (err)-> @state.error = err
			.catch throwError







BenchmarkSuite = ({@title, @subtitle, @measureMethod='sync', @setupFn, @testFn, @teardownFn, @timesToRun=1, @warmUps=1, @manualTiming, @nonShared})->
	if @constructor isnt Suite
		return new Suite(arguments[0])
	
	@runCount = 0
	@els = {}
	@results = []
	@testScope = {}
	@teardownFn ?= ()=> @els.setup.empty()
	@testFn = @testFn.bind(@testScope) or (()->).bind(@testScope)
	
	title$ = $('.BenchmarkSuite-heading-title')
	@libraryVersion = title$.children('span')[0].textContent
	@libraryName = title$[0].textContent.replace(@libraryVersion, '').replace(/\s+$/, '')


	itemMarkup = markup.item
		.replace '{{title}}', @title or ''
		.replace '{{subtitle}}', @subtitle or ''
		.replace '{{nonShared}}', if @nonShared then 'nonShared' else ''


	@els.container = $(document.body).children('.BenchmarkSuite')
	if @els.container.children().length
		@els.list = @els.container.children()
	else
		@els.list = $(markup.list).appendTo(@els.container)
		setTimeout ()=> @els.list.append(markup.gap).append(markup.gap)

	@els.item = $(itemMarkup).appendTo(@els.list).after(' ')
	@els.button = @els.item.find('.__execute')
	@els.results = @els.item.find('.__results')
	@els.resultsTime = @els.results.find('.__results-time')
	@els.resultsResult = @els.results.find('.__results-result')
	@els.resultsAvg = @els.results.find('.__results-avg')
	@els.setup = @els.item.find('.__setup')

	@els.button.on 'click', ()=> @run()

	return @els.item.data 'BenchmarkSuite', @




BenchmarkSuite::setup = ()-> new Promise (resolve)=>
	if @setupFn
		@setupFn.call(@testScope, @els.setup)

	resolve()


BenchmarkSuite::teardown = ()-> if @setupFn
	try @teardownFn.call(@testScope, @els.setup)



BenchmarkSuite::storeResults = (force)-> if location.hostname and (@results.length >= 5 or force) and window.storeResults
	postData = 
		'library': @libraryName
		'version': @libraryVersion
		'testName': @title
		'testDesc': @subtitle
		'result': @average
		'UA': navigator.userAgent
		'nonShared': @nonShared or false
	
	$.post('/set', postData)



BenchmarkSuite::run = ()-> unless @running
	@running = true
	@runCount += 1
	
	performIteration = (timesToRun)=> new Promise (resolve)=> switch @measureMethod
		when 'sync'
			totalTime = 0
			iteration = 0

			while iteration++ < timesToRun
				if @manualTiming
					{startTime, endTime} = @testFn()
				else
					startTime = performance.now()
					@testFn()
					endTime = performance.now()

				# iteration-- if endTime-startTime is 0
				totalTime += endTime-startTime
				
				if iteration is timesToRun
					resolve(totalTime)
		


		when 'async'
			totalTime = 0
			iteration = 0
			
			while iteration++ < timesToRun
				do (iteration)=> setTimeout ()=>
					if @manualTiming
						{startTime, endTime} = @testFn()
					else
						startTime = performance.now()
						@testFn()
						endTime = performance.now()

					# iteration-- if endTime-startTime is 0
					totalTime += endTime-startTime
					
					if iteration is timesToRun
						resolve(totalTime)
			



	@setup()
		.then ()=> performIteration(@warmUps)
		.then ()=> performIteration(@timesToRun)
		.then (result)=>
			formatTime = (time, returnTime)=>
				if returnTime
					split = time.toString().split '.'

					if split.length > 1
						return "#{split[0]}.#{split[1].slice(0,3)} ms"
					else
						return "#{time} ms"

				else
					time = time/@timesToRun
					perSec = timeunits.minute / time
					humanize.formatNumber(perSec, 0)+' op/s'


			if @runCount <= 2
				average = '---------'
			else
				@results.push(result)
				average = @results.reduce((a,b)->a+b) / @results.length

			@els.resultsTime.html formatTime(result, true)
			@els.resultsResult.html formatTime(result)
			@els.resultsAvg.html @average = if @runCount <= 2 then average else formatTime(average)
			@els.results.addClass 'hasResults'

			@teardown()
			@storeResults(result > 10000)
			@running = false






throwError = (err)-> setTimeout ()-> throw err


module.exports = Test