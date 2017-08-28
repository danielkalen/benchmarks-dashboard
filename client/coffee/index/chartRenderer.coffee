markup = import './markup'
helpers = import './helpers'
genChartSettings = import './genChartSettings'

class ChartRenderer
	constructor: (@options, @data)->
		@chartsContainer = $('.BenchmarksDashboard-charts')
		@gapEl = @chartsContainer.children().last()
		@reset()
		

	reset: ()->
		@chartsContainer.empty().append(@gapEl)
		@render()


	calcData: ()->
		currentBrowser = @data.selfUA
		tests = helpers.sortTests(@data.tests, @options.order)
		charts = []
		allCharts = []

		for testName,test of tests when not test.values[currentBrowser]
			chartData = helpers.createChartDataForTest(testName, test, @options, currentBrowser)
			charts.push(chartData)
			allCharts.push(chartData)

		allCharts = allCharts.filter (series)-> not series.nonShared
		allDrilldownData = allCharts
			.map (series)-> series.drilldown
		
		if allCharts.length
			allCharts = allCharts
				.map (series)->
					output = {}
					output[point.name] = point for point in series
					return output

				.reduce (a,b)-> 
					combined = {}

					for pointName,point of a
						combined[pointName] =
							'y': (a[pointName]?.y or 0) + (b[pointName]?.y or 0)
							'x': point.x
							'color': point.color
							'name': point.name
							'library': point.library

					return combined
		
		return {charts, allCharts}


	render: ()->
		{charts, allCharts} = @calcData()
		charts.forEach (chartData)=>
			categories = chartData.map (item)-> item.name
			elMarkup = markup.item
				.replace '{{title}}', chartData.title
				.replace '{{subtitle}}', chartData.subtitle
				.replace '{{fullWidth}}', ''
				.replace '{{nonSharedTest}}', if chartData.nonShared then 'nonSharedTest' else ''
			
			el$ = $(elMarkup).insertBefore @chartsContainer.children().last()
			el$.after ' '
				.find('.__chart').highcharts genChartSettings(@options, chartData, categories)
		

		categories = Object.keys(allCharts)
		allCharts = categories.map (name)-> allCharts[name]
		elMarkup = markup.item
			.replace '{{title}}', 'Combined Results'
			.replace '{{subtitle}}', 'Data from all benchmarks aggregated together for each library'
			.replace '{{fullWidth}}', 'isFullWidth'
			.replace '{{nonSharedTest}}', ''
					
		
		el$ = $(elMarkup).prependTo @chartsContainer
		el$.after ' '
		   .find('.__chart').highcharts genChartSettings(@options, allCharts, categories, true)









module.exports = ChartRenderer