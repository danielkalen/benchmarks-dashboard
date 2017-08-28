QuickField = import './quickfield'

class SettingsBar
	constructor: (@options, @chartRenderer)->
		@chartsContainer = DOM.query('.BenchmarksDashboard-charts')
		@barEl = DOM.query('.BenchmarksDashboard-settingsBar')
		@listEl = DOM.query('.BenchmarksDashboard-settingsBar-list')
		@passedInitalLoad = false
		@fields = []
		@createFields()
		@attachBindings()
		# settingItems = settingsBar.children.filter (child)-> child.type isnt 'text'

	createFields: ()->
		schema.forEach (fieldSchema)=>
			@fields.push QuickField(fieldSchema).appendTo(@listEl)
	
	attachBindings: ()->
		@fields.forEach (field)=>
			SimplyBind(field.name, updateEvenIfSame:false).of(@options)
				.to (value)-> field.value = value
			
			SimplyBind('event:input').of(field)
				.to ()=> @options[field.name] = field.value
				.and.to @resetScroll.bind(@)
		
		Promise.delay(300).then ()=>
			SimplyBind(()=>
				@chartsContainer.style {paddingBottom: @barEl.height}
			).updateOn('event:resize').of(window)

			@passedInitalLoad = true


	resetScroll: ()-> if @passedInitalLoad
		currentScrollPos = window.scrollY
		@chartRenderer.reset()
		window.scrollTo(window.scrollX, currentScrollPos)


schema = [
	name: 'valueType'
	label: 'Value Type'
	type: 'choice'
	choices: [
		{value:'ops', label:'Op/s'}
		{value:'points', label:'Points'}
	]
,
	name: 'chartType'
	label: 'Chart Type'
	type: 'choice'
	choices: [
		{value:'bar', label:'Bar'}
		{value:'column', label:'Column'}
	]
,
	name: 'browserData'
	label: 'Browser Data'
	type: 'choice'
	choices: [
		{value:'current', label:'Only Current'}
		{value:'all', label:'All Browsers'}
	]
]




module.exports = SettingsBar