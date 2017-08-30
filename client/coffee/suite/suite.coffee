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
		@tests = []

		@heading.child.button.on 'click', ()=>
			Promise.mapSeries @tests, (test)-> test.run()

	add: (test)->
		@tests.push(test)
		@list.append(test.el)
		return test



module.exports = Suite