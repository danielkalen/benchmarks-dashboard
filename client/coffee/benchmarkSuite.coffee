@Promise = @PromiseB = import 'bluebird'
@jQuery = @$ = import 'jquery'
@humanize = import 'humanize-plus'
timeunits = import 'timeunits'
Promise.config 'longStackTraces':false
(import '@danielkalen/polyfills')()

do ($=jQuery)->
	markup = import 'benchmarkSuite/markup'

	BenchmarkSuite = ({@title, @subtitle, @measureMethod='sync', @setupFn, @testFn, @teardownFn, @timesToRun=1, @warmUps=1, @manualTiming, @nonSharedTest})->
		if @constructor isnt BenchmarkSuite
			return new BenchmarkSuite(arguments[0])
		
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
			.replace '{{nonSharedTest}}', if @nonSharedTest then 'nonSharedTest' else ''


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
			'nonSharedTest': @nonSharedTest or false
		
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















	window.storeResults = true
	
	$('#storeResults').on 'click', ()->
		window.storeResults = !window.storeResults
		$(@).toggleClass('enabled')


















	window.BenchmarkSuite = window.TestSuite = BenchmarkSuite
