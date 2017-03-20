Promise = PromiseB = import 'bluebird'
SimplyBind = import '@danielkalen/simplybind'
Highcharts = import '@danielkalen/highcharts/dist'
HighchartsDrilldown = import '@danielkalen/highcharts/dist/highcharts/code/modules/drilldown.js'
UAParser = import 'ua-parser-js'

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






