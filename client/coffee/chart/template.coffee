export divider = DOM.template(
	['div'
		ref: 'divider'
		style:
			boxSizing: 'border-box'
			position: 'relative'
			height: 2
			margin: '0 0 100px'

		['div'
			style:
				position: 'relative'
				zIndex: 1
				height: '100%'
				backgroundColor: '#dbdbdb'
		]

		['div'
			style:
				position: 'absolute'
				zIndex: 2
				top: '50%'
				left: 0
				right: 0
				width: 100
				margin: '0 auto'
				backgroundColor: '#f1f1f1'
				transform: 'translateY(-56%)'
				color: '#bababa'
				textAlign: 'center'
				letterSpacing: "#{40/1e3}em"
				fontSize: 15
				fontWeight: 600
				lineHeight: 1
				textTransform: 'uppercase'

			defaults: text: 'Results'
			computers: text: (text)-> @text = text
		]
	]
)


export charts = DOM.template(
	['div'
		ref: 'charts'
		style:
			padding: '0 20px'
			marginTop: 30
			textAlign: 'justify'
			fontSize: 0

		['div'
			ref: 'clearfix'
			style:
				display: 'inline-block'
				width: '100%'
		]
	]
)

export chartGap = DOM.template(
	['div'
		ref: 'gap'
		style:
			display: 'inline-block'
			width: '49%'
	]
)

export chartItem = DOM.template(
	['div'
		ref: 'chart'
		style:
			position: 'relative'
			display: 'inline-block'
			verticalAlign: 'top'
			marginBottom: '25px'
			backgroundColor: 'white'
			padding: '20px'
			borderRadius: '3px'
			boxShadow: '0px 0px 5px rgba(0,0,0,0.07)'
			fontSize: '14px'
			textAlign: 'left'

		defaults: width: 'calc(50% - 25px)'
		computers: width: (width)-> @style {width}
	]
)





