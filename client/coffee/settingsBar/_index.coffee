QuickField = import '../quickfield'
extend = import 'smart-extend'
store = import 'store'
import template from './template'

class SettingsBar
	constructor: (@schema, @options={}, @chartRenderer)->
		@passedInitalLoad = false
		@fields = []
		@barEl = template.spawn()
		@listEl = @barEl.child.list

		@createFields()
		@attachBindings()
		@barEl.appendTo(document.body)

	createFields: ()->
		@schema.forEach (fieldSchema)=>
			value = store.get(fieldSchema.name)
			@fields.push QuickField(extend.clone fieldSchema, {value}).appendTo(@listEl)
	
	attachBindings: ()->
		@fields.forEach (field)=>
			SimplyBind(field.name, updateEvenIfSame:false).of(@options)
				.to (value)-> field.value = value
			
			SimplyBind('event:input').of(field)
				.to ()=> @options[field.name] = field.value
				.and.to ()=> store.set(field.name, field.value)
				.and.to @resetScroll.bind(@)
		
		Promise.delay(300).then ()=>
			SimplyBind(()=>
				@chartRenderer?.container.style {paddingBottom: @barEl.height}
			).updateOn('event:resize').of(window)

			@passedInitalLoad = true


	resetScroll: ()-> if @passedInitalLoad
		currentScrollPos = window.scrollY
		@chartRenderer?.reset()
		window.scrollTo(window.scrollX, currentScrollPos)





module.exports = SettingsBar