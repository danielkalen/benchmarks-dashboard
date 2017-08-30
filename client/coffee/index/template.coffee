export heading = DOM.template(
	['div'
		ref: 'heading'
		computers:
			title: (title)-> @child.title.text = title
			subtitle: (subtitle)-> @child.subtitle.text = subtitle
		
		style:
			padding: '33px 20px 30px'
			background: 'radial-gradient(circle, #244473 0%, #172543 100%)'
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
			Object.forEach suites.groupBy('name'), (versions)=>
				suite.spawn(data:{versions, title:versions[0].title}).appendTo(@)
	]
)

export suite = DOM.template(
	['div'
		styleAfterInsert: true
		computers: versions: (versions)->
			versions.forEach (version)=>
				suiteVersion.spawn(data:version).appendTo(@child.versions)
		
		style:
			verticalAlign: 'top'
			boxSizing: 'border-box'
			overflow: 'hidden'
			width: 'calc(50% - 25px)'
			display: 'inline-table'
			marginBottom: 25
			marginRight: ()-> if @index % 2 then 0 else 25
			borderRadius: 3
			boxShadow: '0px 0px 5px rgba(0,0,0,0.07)'

		
		['div'
			ref: 'profile'
			style:
				verticalAlign: 'middle'
				boxSizing: 'border-box'
				display: 'table-cell'
				width: '140px'
				padding: '20px'
				background: 'radial-gradient(circle, #fdac55 0%, #fc8f45 100%)'
				color: 'white'
				textAlign: 'center'

			computers: title: (title)->
				@child.title.text = title
				@child.icon.text = title.slice(0,2)

			['div'
				ref: 'icon'
				style:
					boxSizing: 'border-box'
					width: 54
					height: 54
					margin: '0 auto'
					backgroundColor: 'rgba(0,0,0,0.1)'
					borderRadius: '50%'
					fontWeight: 400
					fontSize: 21
					lineHeight: '58px'
					textTransform: 'uppercase'
					letterSpacing: "#{40/1e3}em"
			]

			['div'
				ref: 'title'
				style:
					marginTop: 17
					fontSize: 16
					fontWeight: 500
			]
		]

		['div'
			ref: 'versions'
			styleAfterInsert: true
			style:
				verticalAlign: 'top'
				boxSizing: 'border-box'
				display: 'table-cell'
				width: ()-> "calc(100% - #{@prev.width}px)"
				padding: 20
				backgroundColor: 'white'
		]
	]
)


export suiteVersion = DOM.template(
	['a'
		computers: _init: (data)->
			@text = data.version
			@attr 'href', "/suite/#{data.fullname}"

		style:
			boxSizing: 'border-box'
			display: 'inline-block'
			padding: "5px 8px 3px"
			fontSize: 13
			marginRight: 8
			marginBottom: 8
			fontWeight: 500
			backgroundColor: '#f1f1f1'
			border: '1px solid #d3d3d3'
			borderRadius: 3
	]
)


export divider = DOM.template(
	['div'
		ref: 'divider'
		style:
			boxSizing: 'border-box'
			position: 'relative'
			height: 2
			margin: '40px 0'

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
		, 'Results']
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
			width: '49%'
			marginBottom: '25px'
			backgroundColor: 'white'
			borderRadius: '3px'
			boxShadow: '0px 0px 5px rgba(0,0,0,0.07)'
			fontSize: '14px'
			textAlign: 'left'
	]
)










