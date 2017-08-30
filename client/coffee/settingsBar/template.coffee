export default DOM.template(
	['div'
		ref: 'settingsBar'
		style:
			position: 'fixed'
			zIndex: 100
			bottom: 0
			left: 0
			width: '100%'
			backgroundColor: 'white'
			boxShadow: '0px 0px 5px rgba(0,0,0,0.2)'
			userSelect: 'none'

		['div'
			ref: 'innerwrap'
			style:
				boxSizing: 'border-box'
				display: 'table'
				width: '100%'
				height: '100%'
				padding: 20
				textAlign: 'right'
			
			['div'
				ref: 'title'
				style:
					verticalAlign: 'middle'
					display: 'table-cell'
					width: '1%'
					fontSize: 24
					fontWeight: 600
					lineHeight: 1
					color: '#045da0'
			,'Settings']
			
			['div'
				ref: 'list'
				style:
					verticalAlign: 'middle'
					display: 'table-cell'
			]
		]
	]
)







