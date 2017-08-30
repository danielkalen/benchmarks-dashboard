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
			position: 'relative'

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

		['div'
			events:
				'mouseenter': ()-> @child.hoverCircle.state 'parentHover', on
				'mouseleave': ()-> @child.hoverCircle.state 'parentHover', off
			style:
				position: 'absolute'
				right: 20
				top: '50%'
				transform: 'translateY(-50%)'
			
			['div'
				ref: 'button'
				style:
					position: 'relative'
					zIndex: 2
					boxSizing: 'border-box'
					padding: '18px 20px 15px'
					background: 'radial-gradient(circle, #fdac55 0%, #fc8f45 100%)'
					borderRadius: 3
					textTransform: 'uppercase'
					fontSize: 14
					fontWeight: 500
					letterSpacing: "#{60/1e3}em"
					textAlign: 'center'
					color: 'white'
					userSelect: 'none'
					cursor: 'pointer'

				['text', text:
					$base: 'Run Benchmarks'
					$running: 'Running...'
				]
			]

			['div'
				ref: 'hoverCircle'
				style:
					position: 'absolute'
					top: '50%'
					left: '50%'
					transform: 'translateY(-50%) translateX(-50%) scale(1)'
					width: 30
					height: 30
					borderRadius: '50%'
					backgroundColor: '#fdac55'
					opacity: 0.25
					transition: 'all 0.2s'
					$parentHover:
						transform: 'translateY(-50%) translateX(-50%) scale(3.5)'
			]
		]
	]
)

export list = DOM.template(
	['div'
		ref: 'list'
		style:
			boxSizing: 'border-box'
			marginTop: 40
			padding: '0 20px 80px'
	]
)

export test = DOM.template(
	['div'
		ref: 'test'
		styleAfterInsert: true
		style:
			verticalAlign: 'top'
			display: 'inline-block'
			boxSizing: 'border-box'
			overflow: 'hidden'
			width: 'calc(33.33% - 17px)'
			backgroundColor: 'white'
			marginBottom: 25
			marginRight: ()-> if (@index+1) % 3 then 25 else 0
			borderRadius: 3
			boxShadow: '0px 0px 5px rgba(0,0,0,0.07)'

		
		['div'
			ref: 'heading'
			style:
				boxSizing: 'border-box'
				padding: '20px'
				color: '#212121'
				textAlign: 'left'
				userSelect: 'none'

			computers:
				title: (title)-> @child.title.text = title
				subtitle: (subtitle)-> @child.subtitle.text = subtitle

			['div'
				ref: 'title'
				style:
					fontSize: 17
					lineHeight: 1.4
					fontWeight: 500
			]
			
			['div'
				ref: 'subtitle'
				style:
					marginTop: 4
					fontSize: 12
					lineHeight: 1.5
					fontWeight: 500
					opacity: 0.4
			]
		]

		['div'
			ref: 'result'
			style:
				display: 'none'
				padding: '20px 20px 20px'
				borderTop: '1px solid #d1d1d1'
				$visible:
					display: 'block'

			computers:
				ops: (ops)-> @child.ops.text = "#{ops.format(0)} op/s"
				time: (time)-> @child.time.text = "#{time.format(2)}s"; @state('visible', on)
				margin: (margin)-> @child.margin.text = "+-#{margin.format(2)}%"
				# margin: (margin)-> @child.margin.text = "±#{margin.format(2)}%"

			['div'
				style:
					display: 'table'
					width: '100%'
					fontSize: 14

				computers: _init: ()->
					resultRow.spawn(data:{name:'ops', label:'Ops'}).appendTo(@)
					resultRow.spawn(data:{name:'time', label:'Time'}).appendTo(@)
					resultRow.spawn(data:{name:'margin', label:'Margin'}).appendTo(@)
			]
		]

		['div'
			ref: 'sandbox'
			style:
				display: 'none'

			events: 'stateChange:running': (running)-> if @related.settings.showSandbox
				if running
					@show()
				else
					@hide()
		]
		
		['div'
			ref: 'button'
			style:
				boxSizing: 'border-box'
				padding: '15px 20px 12px'
				background: 'radial-gradient(circle, #fdac55 0%, #fc8f45 100%)'
				textTransform: 'uppercase'
				fontSize: 14
				fontWeight: 500
				letterSpacing: "#{60/1e3}em"
				textAlign: 'center'
				color: 'white'
				userSelect: 'none'
				cursor: 'pointer'

			['text', text:
				$base: 'Run Benchmark'
				$running: 'Running...'
				$errored: 'Errored'
			]
		]
	]
)



export resultRow = DOM.template(
	['div'
		computers: _init: ({name, label})->
			@child.label.text = "#{label}: "
			@child.value.options.ref = @child.value.ref = name

		style:
			display: 'table-row'
			lineHeight: 1.6
		
		['div'
			ref: 'label'
			style:
				display:'table-cell'
				width: '1%'
				fontWeight: '600'
		]
		['div'
			ref: 'value'
			style:
				display:'table-cell'
				textAlign: 'right'
		]
	]
)





