module.exports = (options, chartData, categories, showDataLabels=false)->
	'series': [{data:chartData}]
	'chart': 'type': options.chartType
	'colors': options.colors
	'credits': 'enabled': false
	'legend': 'enabled': false
	'title': 'text': null
	'subtitle': 'text': null
	
	'xAxis':
		'type': 'category'
		# 'categories': categories
		'allowDecimals': false
		'tickWidth': 0
		'crosshair': 'color': 'rgba(0,0,0,0.1)'

	'yAxis':
		'allowDecimals': false
		'gridLineColor': 'rgba(0,0,0,0.08)'
		'reversedStacks': false
		'title': 'text': if options.valueType is 'ops' then 'Operations per second' else 'Points'
	
	'plotOptions':
		"#{options.chartType}":
			'stacking': null
			'colorByPoint': true
			'pointPadding': 0.05
			'groupPadding': 0.1
			'borderWidth': 0
			'minPointLength': 4
			'marker':
				'enabled': false
				'state': 'hover': 'enabled': false
			'dataLabels': false
				# 'enabled': if options.chartType is 'column' then showDataLabels else false
				# 'inside': true
				# 'rotation': -90
				# 'color': 'white'
				# 'align': 'left'
				# 'verticalAlign': 'bottom'
				# 'y': -10
				# 'crop': false
				# 'format': '{point.name}'
				# 'useHTML': true
				# 'style':
				# 	'color': 'contrast'
				# 	'fontWeight': '700'
				# 	'fontFamily': 'proxima'
				# 	'fontSize': '14px'
				# 	'letterSpacing': '0.8px'
				# 	'textShadow': '0px 0px 1px rgba(0,0,0,0.6)'
				# 	# 'width': '10%'


	'drilldown':
		'activeAxisLabelStyle': null
		'activeDataLabelStyle': null
		'allowPointDrilldown': false
		'series': chartData.drilldown


	'tooltip':
		'formatter': ()->
			point = @point or @points[0]
			color = point.color
			key = point.key
			name = point.name
			pointValue = humanize.numberFormat(point.y, 0) or 0
			suffix = if options.valueType is 'ops' then 'op/s' else 'points'
			value = "<b>#{pointValue} #{suffix}</b>"

			"<span style=\"color: #{color}\">\u25CF</span> #{name}: #{value}<br/>"
