store = import 'store'
if store.get('storeResults') is undefined
	store.set('storeResults', true)

module.exports = [
	type: 'toggle'
	label: 'Store Results'
	name: 'storeResults'
	style: 'aligned'
	size: 40
]
