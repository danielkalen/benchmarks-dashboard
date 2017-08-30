SettingsBar = import '../settingsBar'
settings = import './settings'
template = import './template'

class Suite
	constructor: (@config)->
		@heading = template.heading.spawn(data:{title:@config.title, subtitle:@config.version}).appendTo(document.body)
		@list = template.list.spawn().appendTo(document.body)
		@settings = settings
		@settingsBar = new SettingsBar(settings)
		@userAgent = window.navigator.userAgent
		@tests = []

	add: (test)->
		@tests.push(test)
		@list.append(test.el)
		return test





module.exports = Suite