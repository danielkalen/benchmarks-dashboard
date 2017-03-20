Promise = PromiseB = import 'bluebird'
import * as SimplyBind from '@danielkalen/simplybind'
import '@danielkalen/highcharts/code/highcharts.src.js'
import '@danielkalen/highcharts/code/modules/drilldown.src.js'
import * as UAParser from 'ua-parser-js'

do ($=jQuery)->
	import './index/markup'
	import './index/defaults'
	import './index/helpers'
	import './index/genIndex'
	import './index/genChartSettings'

	window.indexCharts = (options={})->
		options = extendDefaultOptions(options)
		
		$.get '/get', {UA:navigator.userAgent}, (response)->
			window.serverResponse = response

			import './index/bindings'

			genIndex(options)






