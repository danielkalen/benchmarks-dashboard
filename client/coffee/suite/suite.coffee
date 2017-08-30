SettingsBar = import '../settingsBar'
settings = import './settings'
template = import './template'
store = import 'store'

class Suite
	constructor: (@config)->
		@heading = template.heading.spawn(data:{title:@config.title, subtitle:@config.version}).appendTo(document.body)
		@list = template.list.spawn().appendTo(document.body)
		@settingsBar = new SettingsBar(settings, @settings = {storeResults:store.get('storeResults')})
		@userAgent = window.navigator.userAgent
		@state = running:false
		@tests = []

		@_attachBindings()


	_attachBindings: ()->
		@heading.child.button.on 'click', @run.bind(@)

		SimplyBind('running').of(@state)
			.to (running)=> @heading.state {running}


	add: (test)->
		@tests.push(test)
		@list.append(test.el)
		return test

	run: ()-> unless @state.running
		Promise.resolve(@tests).bind(@)
			.tap ()-> @state.running = true
			.mapSeries (test, index)->
				test.run().then ()-> if test.state.errored
					throw new Error("test ##{index+1} errored")
			
			.finally ()-> @state.running = false


module.exports = Suite