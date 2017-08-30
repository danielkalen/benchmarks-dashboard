import '../../lib/sugar'
@Promise = @PromiseB = import 'bluebird'
@jQuery = @$ = import 'jquery'
@DOM = import 'quickdom'
@SimplyBind = import '@danielkalen/simplybind'
@Highcharts = import '@danielkalen/highcharts/code/highcharts'
@HighchartsDrilldown = import '@danielkalen/highcharts/code/modules/drilldown'
Promise.config 'longStackTraces':false
(import '@danielkalen/polyfills')()


initCharts = import './index/_index'
module.exports = initCharts(window.config, window.dashboardOptions, window.targetSuites)


