template = import './template'
dc = import 'dc'
crossfilter = import 'crossfilter'


class Chart
	constructor: (@container, @data, @settings={})->
		@el = template.chartItem.spawn(data:@settings).appendTo(@container)
		@datax = crossfilter(@data)
		@initChart()
		@attachBindings()


	attachBindings: ()->
		SimplyBind('event:resize').of(window).to ()=>
			@chart.width(@el.width - 40)


	setData: ()->






module.exports = Chart