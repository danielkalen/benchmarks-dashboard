extendDefaultOptions = (options)->
	options = $.extend {}, defaultOptions, options
	options.itemsMap.length = (1 for k of options.itemsMap).length
	return options



parseValue = (value)->
	if typeof value is 'string'
		parseFloat value.replace /,/g, ''
	else
		value



convertValuesToPoints = (chartData)->
	maxValue = Math.max.apply(null, chartData.map (plot)-> plot.y)
	
	chartData.forEach (plot)->
		realValue = plot.y
		plot.y = (plot.y/maxValue) * 100

	return chartData




sortTests = (tests, chartsOrderMap)->
	output = {}
	Object.keys(tests)
		.map (name)->
			tests[name].name = name
			return tests[name]
		
		.sort (a,b)->
			aIndex = chartsOrderMap.indexOf(a.name)
			aIndex = 100 if aIndex is -1
			bIndex = chartsOrderMap.indexOf(b.name)
			bIndex = 100 if bIndex is -1
			return switch
				when aIndex > bIndex then 1
				when aIndex < bIndex then -1
				else 0

		.forEach (test)->
			output[test.name] = test
			delete test.name

	return output



sortVersions = (versions)->
	output = {}
	Object.keys(versions)
		.sort(sortByVersionString)
		.forEach (versionNumber)->
			output[versionNumber] = versions[versionNumber]

	return output



sortByVersionString = (a,b)-> switch
	when parseVersion(a,'major') > parseVersion(b,'major') then 1
	when parseVersion(a,'major') < parseVersion(b,'major') then -1
	else switch
		when parseVersion(a,'minor') > parseVersion(b,'minor') then 1
		when parseVersion(a,'minor') < parseVersion(b,'minor') then -1
		else switch
			when parseVersion(a,'patch') > parseVersion(b,'patch') then 1
			when parseVersion(a,'patch') < parseVersion(b,'patch') then -1
			when /\w/.test(a) or /\w/.test(b) then switch
				when parseVersion(a,'patch-word') > parseVersion(b,'patch-word') then 1
				when parseVersion(a,'patch-word') < parseVersion(b,'patch-word') then -1
				else 0
			else 0



parseVersion = (versionString, level)->
	versionBreakdown = versionString.split('.')

	switch level
		when 'major' then parseFloat(versionBreakdown[0]) or 0
		when 'minor' then parseFloat(versionBreakdown[1]) or 0
		when 'patch' then parseFloat(versionBreakdown[2]) or 0
		when 'patch-word' then versionBreakdown[2].split(/^\d+/)[1]

parseName = (libraryObject)->
	return libraryObject.name.replace(libraryObject.name+' ', '')


sortChartData = (chartData, itemsMap)->
	sorted = chartData.slice()
	sorted.sort (a,b)->
		if a.library is b.library then sortByVersionString(parseName(a), parseName(b))
		
		else switch
			when itemsMap[a.library].index > itemsMap[b.library].index then 1
			when itemsMap[a.library].index < itemsMap[b.library].index then -1
			else 0

	sorted.forEach (point, index)-> point.x = index

	return sorted





createDrilldown = (test)->
	output = []
	
	for browser,libraries of test.values
		
		for library,versions of libraries

			for version,value of versions 
				name = "#{library} #{version}"
				existingItem = output.find (item)-> item.id is name
				item = if existingItem then existingItem else {id:name, data:[]}
				
				item.data.push [browser, parseValue(value)]
				# item.data.push {x:browser, y:parseValue(value), name:browser}

				unless existingItem
					output.push(item)

	return output



combineAllBrowserData = (testValues, currentBrowser)->
	output = {}

	for browser,libraries of testValues
		
		for library,versions of libraries
			continue unless testValues[currentBrowser][library]
			output[library] ?= {}

			for version,value of versions
				continue unless testValues[currentBrowser][library][version]
				output[library][version] ?= {value:0, count:0}
				output[library][version].value += parseValue(value)
				output[library][version].count += 1



	for library,versions of output
		
		for version,data of versions
			output[library][version] = data.value / data.count

	return output




createChartDataForTest = (testName, test, options, currentBrowser)->
	chartData = []
	testValues = if options.browserData is 'current' then test.values[currentBrowser] else combineAllBrowserData(test.values, currentBrowser)
	lastIndex = 0

	for library,versions of testValues
		for version,value of sortVersions(versions)
			continue if ignoreList.includes "#{library}@#{version}"
			
			value = parseValue(value)
			name = library+' '+version
			if options.itemsMap[library]
				lastIndex++
				color = options.itemsMap[library].color
			else
				index = ++lastIndex
				color = options.colors[index] or options.colors[index % options.colors.length]
				options.itemsMap[library] = {index, color}
			
			chartData.push {'x':null, 'y':value, 'drilldown':name, color, name, library}

	chartData = sortChartData(chartData, options.itemsMap)
	chartData = convertValuesToPoints(chartData) if options.valueType is 'points'
	chartData.drilldown = if options.browserData is 'current' then undefined else createDrilldown(test)
	chartData.nonSharedTest = test.nonSharedTest
	return chartData










