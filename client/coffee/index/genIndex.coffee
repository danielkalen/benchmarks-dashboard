module.exports = (options)->
	gapEl$ = chartsContainer$.children().last()
	chartsContainer$.empty().append(gapEl$)

	currentBrowser = serverResponse.selfUA
	tests = sortTests(serverResponse.tests, options.chartsOrderMap)
	allChartData = []

	for testName,test of tests
		continue if not test.values[currentBrowser]

		allChartData.push chartData = createChartDataForTest(testName, test, options, currentBrowser)
		categories = chartData.map (item)-> item.name
		elMarkup = markup.item
			.replace '{{title}}', testName
			.replace '{{subtitle}}', test.desc
			.replace '{{fullWidth}}', ''
			.replace '{{nonSharedTest}}', if test.nonSharedTest then 'nonSharedTest' else ''
					
		
		el$ = $(elMarkup).insertBefore chartsContainer$.children().last()
		el$.after ' '
		   .find('.__chart').highcharts genChartSettings(options, chartData, categories)



	# ==== Combined data chart =================================================================================
	allChartData = allChartData.filter (series)-> not series.nonSharedTest
	
	allDrilldownData = allChartData
		.map (series)-> series.drilldown
	
	if allChartData.length
		allChartData = allChartData
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


	categories = Object.keys(allChartData)
	allChartData = categories.map (name)-> allChartData[name]
	elMarkup = markup.item
		.replace '{{title}}', 'Combined Results'
		.replace '{{subtitle}}', 'Data from all benchmarks aggregated together for each library'
		.replace '{{fullWidth}}', 'isFullWidth'
		.replace '{{nonSharedTest}}', ''
				
	
	el$ = $(elMarkup).prependTo chartsContainer$
	el$.after ' '
	   .find('.__chart').highcharts genChartSettings(options, allChartData, categories, true)



