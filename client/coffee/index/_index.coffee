axios = import 'axios'
UAParser = import 'ua-parser-js'
helpers = import './helpers'
template = import './template'
settings = import './settings'
ChartRenderer = import './chartRenderer'
SettingsBar = import '../settingsBar'
genChartSettings = import './genChartSettings'

module.exports = (options, dashboardOptions, suites)->
	options = helpers.extendDefaultOptions(options or {})
	template.heading.spawn(data:dashboardOptions).appendTo(document.body)
	template.list.spawn(data:{suites}).appendTo(document.body)
	template.divider.spawn().appendTo(document.body)
	charts = template.charts.spawn().appendTo(document.body)
	
	Promise.resolve()
		.then ()-> axios.get('/get', params:{UA:navigator.userAgent})
		.get 'data'
		.then (data)->
			chartRenderer = new ChartRenderer(options, data, charts)
			settingsBar = new SettingsBar(settings, options, chartRenderer)
			return {chartRenderer, settingsBar}
	

