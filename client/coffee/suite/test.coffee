window.Benchmark = import 'benchmark'
promiseEvent = import 'p-event'
extend = import 'smart-extend'
axios = import 'axios'
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
		@el = template.test.spawn(data:@settings)
		@settings.testFn = @settings.testFn.bind(@context)
		@settings.teardownFn ?= ()=> @el.child.sandbox.empty()
		@benchmark = new Benchmark.Suite('suite', @settings)
			.add 'test', ()=> @settings.testFn()

		@_attachBindings()
		@suite.add(@)

	_attachBindings: ()->
		@el.child.button.on 'click', @run.bind(@)
		
		SimplyBind('running').of(@state)
			.to (running)=> @el.state {running}
		
		SimplyBind('errored').of(@state)
			.to (errored)=> @el.state {errored}
			.and.to ()=> setTimeout ()=>
				@state.errored = false
			, 3000

		SimplyBind('result').of(@state)
			.to (result)=> if result
				@el.child.result.applyData(result)


	storeResults: ()-> if window.location.hostname and @suite.settings.storeResults
		Promise.bind(@)
			.then ()-> axios.post('/set', {
				suite: @suite.config.fullname
				test: {title:@settings.title, subtitle:@settings.subtitle}
				userAgent: @suite.userAgent
				result: @state.result
			})
			.catch throwError


	run: ()-> unless @state.running
		@state.running =
		Promise.delay().bind(@)
			.then ()-> @settings.setupFn.call(@context, @el.child.sandbox)
			.then ()->
				result = promiseEvent(@benchmark, 'complete')
				@benchmark.run()
				return result
			
			.tap ()-> @settings.teardownFn.call(@context, @el.child.sandbox)
			.then ({target})->
				@state.result = {ops:target.hz, margin:target.stats.rme, time:target.times.elapsed, samples:target.stats.sample.length}
				@storeResults()
			
			.finally ()-> @state.running = false
			.tapCatch (err)-> @state.errored = err
			.catch throwError






throwError = (err)-> setTimeout ()-> throw err


module.exports = Test