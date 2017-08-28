@Promise = @PromiseB = import 'bluebird'
@jQuery = @$ = import 'jquery'
@DOM = import 'quickdom'
@SimplyBind = import '@danielkalen/simplybind'
@Highcharts = import '@danielkalen/highcharts/code/highcharts'
@HighchartsDrilldown = import '@danielkalen/highcharts/code/modules/drilldown'
axios = import 'axios'
UAParser = import 'ua-parser-js'
Promise.config 'longStackTraces':false
(import '@danielkalen/polyfills')()



helpers = import './helpers'
template = import './template'
ChartRenderer = import './chartRenderer'
SettingsBar = import './settingsBar'
genChartSettings = import './genChartSettings'

module.exports = (options, dashboardOptions, targetSuites)->
	options = helpers.extendDefaultOptions(options or {})
	# window.opts = options
	template.heading.spawn(data:dashboardOptions).prependTo(document.body)
	
	Promise.resolve()
		.then ()-> axios.get('/get', params:{UA:navigator.userAgent})
		.get 'data'
		.then (data)->
			chartRenderer = new ChartRenderer(options, data)
			settingsBar = new SettingsBar(options, chartRenderer)
	

