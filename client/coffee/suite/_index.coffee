@Promise = @PromiseB = import 'bluebird'
@DOM = import 'quickdom'
@SimplyBind = import '@danielkalen/simplybind'
Suite = import './suite'
Promise.config 'longStackTraces':false
(import '@danielkalen/polyfills')()

window.suite = new Suite(window.config)
module.exports = import './test'