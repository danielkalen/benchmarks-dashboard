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
	]
)

export test = DOM.template(
	['div'
		ref: 'test'
		styleAfterInsert: true
		style:
			verticalAlign: 'top'
			boxSizing: 'border-box'
			overflow: 'hidden'
			width: 'calc(33.33% - 25px)'
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

			computers:
				title: (title)-> @child.title.text = title
				subtitle: (subtitle)-> @child.subtitle.text = subtitle

			['div'
				ref: 'title'
				style:
					fontSize: 16
					fontWeight: 500
			]
			
			['div'
				ref: 'subtitle'
				style:
					marginTop: 4
					fontSize: 12
					fontWeight: 500
					opacity: 0.4
			]
		]

		['div'
			ref: 'result'
			style:
				display: 'none'
				padding: '5px 20px 20px'
				marginTop: 5
				borderTop: '1px solid #d1d1d1'
				$visible:
					display: 'block'

			computers:
				ops: (ops)-> @child.ops.text = "#{ops.format()} op/s"
				margin: (margin)-> @child.margin.text = "±#{margin.format(2)}%"
				time: (time)-> @child.time.text = "#{time}ms"

			['div'
				style:
					display: 'table'
					width: '100%'
					fontSize: 14

				computers: _init: ()->
					resultsRow.spawn(data:{name:'time', label:'Time'}).appendTo(@)
					resultsRow.spawn(data:{name:'ops', label:'Ops'}).appendTo(@)
					resultsRow.spawn(data:{name:'margin', label:'Margin'}).appendTo(@)
			]
		]

		['div'
			ref: 'sandbox'
			style:
				display: 'none'
				$running:
					display: 'block'
		]
		
		['div'
			ref: 'button'
			style:
				boxSizing: 'border-box'
				padding: '10px 20px'
				background: 'radial-gradient(circle, #fdac55 0%, #fc8f45 100%)'
				textTransform: 'uppercase'
				fontSize: 15
				letterSpacing: "#{60/1e3}em"
				textAlign: 'center'
				color: 'white'

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
			marginTop: 2
		
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





