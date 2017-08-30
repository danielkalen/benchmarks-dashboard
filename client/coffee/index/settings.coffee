module.exports = [
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