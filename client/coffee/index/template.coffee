export heading = DOM.template(
	['div'
		ref: 'heading'
		computers:
			title: (title)-> @child.title.text = title
			subtitle: (subtitle)-> @child.subtitle.text = subtitle
		
		style:
			padding: '33px 20px 30px'
			background: 'radial-gradient(circle, #fdac55 0%, #fc8f45 100%)'
			background: 'radial-gradient(circle, #244473 0%, #172543 100%)'
			color: '#020001'
			color: 'white'

		['div'
			ref: 'title'
			style:
				fontSize: 32
				lineHeight: 1
				fontWeight: 500
		]
		
		['div'
			ref: 'subtitle'
			style:
				fontWeight: 500
				marginTop: 6
				fontSize: 20
				opacity: 0.4
				lineHeight: 1.4
		]
	]
)

export list = DOM.template(
	['div'
		ref: 'list'
		style:
			boxSizing: 'border-box'
			marginTop: 40
			padding: '0 20px'
		
		computers: suites: (suites)->
			Object.forEach suites.groupBy('name'), (suiteVersions)=>
				suite.spawn(data:{versions:suiteVersions}).appendTo(@)
	]
)

export suite = DOM.template(
	['div'
		style:
			width: '49%'
			boxSizing: 'border-box'
	]
)















