import '../../lib/sugar'
@Promise = @PromiseB = import 'bluebird'
@jQuery = @$ = import 'jquery/dist/jquery.slim'
@DOM = import 'quickdom'
@SimplyBind = import '@danielkalen/simplybind'
Promise.config 'longStackTraces':false, warnings:false
(import '@danielkalen/polyfills')()


module.exports = window.TestSuite = window.Test = import './suite/_index'