chartsContainer$ = $('.BenchmarksDashboard-charts')

defaultOptions = 
	'colors': ['#ff5e3a', '#ff9500', '#ffdb4c', '#87fc70', '#52edc7', '#1ad6fd', '#c644fc', '#ef4db6', '#4a4a4a', '#dbddde']
	'browserData': 'current'
	'valueType': 'ops'
	'chartType': 'column'
	'chartsOrderMap': []
	'itemsMap': {}


Highcharts.setOptions
	'global': 'useUTC': false
	'lang': 'thousandsSep': ','