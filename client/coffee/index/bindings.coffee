settingsBarWrapper$ = $('.BenchmarksDashboard-settingsBar')
settingsBar$ = $('#settingsBar')
passedInitalLoad = false

for settingEl in settingsBar$.children() then do (settingEl)->
	SimplyBind(settingEl.id).of(options)
		.to('value').of(settingEl).bothWays()
			.chainTo ()-> if passedInitalLoad
				currentScrollPos = window.scrollY
				genIndex(options)
				window.scrollTo(window.scrollX, currentScrollPos)
	
	for settingOption in settingEl.children[1].children then do (settingOption)->
		SimplyBind('value').of(settingEl)
			.to('className.state').of(settingOption)
				.transform (value)-> if value is settingOption.dataset.name then 'active' else ''

		SimplyBind('event:click').of(settingOption)
			.to('value').of(settingEl)
				.transform (event)-> event.currentTarget.dataset.name


setTimeout ()->
	SimplyBind(()->
		chartsContainer$.css 'padding-bottom', "#{settingsBarWrapper$.height()}px"
	).updateOn('event:resize').of(window)

	passedInitalLoad = true
, 300
