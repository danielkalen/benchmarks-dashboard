@Promise = @PromiseB = import 'bluebird'
@jQuery = @$ = import 'jquery'
SimplyBind = import '@danielkalen/simplybind'
Highcharts = import '@danielkalen/highcharts/code/highcharts'
HighchartsDrilldown = import '@danielkalen/highcharts/code/modules/drilldown'
UAParser = import 'ua-parser-js'
Promise.config 'longStackTraces':false
(import '@danielkalen/polyfills')()


do ($=jQuery)->
	import './index/helpers'
	markup = import './index/markup'
	defaultOptions = import './index/defaults'
	genIndex = import './index/genIndex'
	genChartSettings = import './index/genChartSettings'
	chartsContainer$ = $('.BenchmarksDashboard-charts')
	
	window.indexCharts = (options={})->
		options = extendDefaultOptions(options)
		
		$.get '/get', {UA:navigator.userAgent}, (response)->
			window.serverResponse = response

			import './index/bindings'

			genIndex(options)






