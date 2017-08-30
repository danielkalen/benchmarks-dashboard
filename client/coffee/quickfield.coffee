QuickField = import 'quickfield'
	.register 'choice', import 'quickfield/field/choice'
	.register 'toggle', import 'quickfield/field/toggle'

module.exports = QuickField.config(
	global:
		fontFamily: 'gotham'
	
	choice:
		spacing: 0
		perGroup: 2
		fontSize: 11
		width: 'auto'


,
	global:
		default:
			options:
				style: marginLeft: 25
				events: 'inserted': ()-> @style('marginLeft',0) if not @prev
			
	toggle:
		default: children:
			'label': options: style:
				$showLabel:
					verticalAlign: 'middle'
					display: 'inline-block'
					marginRight: 7
					marginBottom: 0
					fontSize: 14


	choice:
		default: children:
			'label': options: style:
				$showLabel:
					verticalAlign: 'middle'
					display: 'inline-block'
					marginRight: 7
					marginBottom: 0
					fontSize: 14

			'innerwrap': options: style:
				verticalAlign: 'middle'
				display: 'inline-block'

		'choice':
			options: style:
				padding: '0 7px'
				backgroundColor: '#f1f1f1'
				borderRadius: 2

			children:
				'label': options: style:
					fontWeight: 500
					fontSize: 11
					padding: '9px 0 6px'
)



