Promise = require 'bluebird'
extend = require 'smart-extend'
chalk = require 'chalk'
moment = require 'moment'
momentDurationFormat = require 'moment-duration-format'
defaults = require './defaults'
WD = require 'selenium-webdriver'
chrome = require 'selenium-webdriver/chrome'
firefox = require 'selenium-webdriver/firefox'
firefoxOptions = new firefox.Options()
firefoxOptions.setBinary '/Applications/FirefoxDeveloperEdition.app'
chromeRegOptions = new chrome.Options()
chromeRegOptions.setChromeBinaryPath '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
chromeCanaryOptions = new chrome.Options()
chromeCanaryOptions.setChromeBinaryPath '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'

module.exports = (suiteName, options)->
	options = extend.clone(defaults.run, options, {suiteName})
	options.grep = new RegExp(options.suiteName)
	indexURL = "http://#{options.host}:#{options.port}"

	D = new WD.Builder()
		.forBrowser(if options.browser is 'canary' then 'chrome' else options.browser)
		# .setFirefoxOptions(firefoxOptions)
		.setChromeOptions(if options.browser is 'canary' then chromeCanaryOptions else chromeRegOptions)
		.build()


	D.manage().timeouts().setScriptTimeout(300000)
	D.get(indexURL)
	D.findElements(WD.By.className('BenchmarksDashboard-libraries-item'))
		.then (elements)->
			WD.promise.filter elements, (element)->
				element.findElement(WD.By.className('BenchmarksDashboard-libraries-item-title')).getText().then (label)->
					options.grep.test(label)

		.then (elements)->
			elements = elements.reverse() if options.direction is 'desc'
			console.log("Found #{elements.length} matching suites")

			Promise.all elements.map (element)->
				element.findElement(WD.By.tagName('a')).then (aElement)->
					aElement.getAttribute('href').then (href)-> href.replace(indexURL+'/', '')

			.then (hrefs)->
				Promise.each hrefs, (href)->
					suiteName = href.replace('/runner.html','')
					suiteStartTime = 0
					console.log("Starting suite #{chalk.dim suiteName}")
					
					D.get("#{indexURL}/#{href}")
					.then ()-> D.wait WD.until.elementLocated(WD.By.className 'BenchmarkSuite-list-item')
					.then ()-> D.sleep(1000)
					.then ()->
						suiteStartTime = moment()
						console.log("Running suite #{chalk.dim suiteName}")
						
						D.executeAsyncScript ()->
							done = arguments[arguments.length - 1]
							options = arguments[0]

							PromiseB.each $('.BenchmarkSuite-list-item').toArray(), (el)->
								benchmark = $(el).data 'BenchmarkSuite'

								PromiseB.each (for i in [1..options.runTimes] then ()->
									benchmark.run().then ()-> new PromiseB (resolve)->
										setTimeout resolve, options.runDelay
								), (run)-> run()

							.then(done)
							.catch (err)->
								throw err
								done()
						, extend.keys(['runTimes', 'runDelay']).clone(options)

					.then ()->
						duration = moment.duration(moment().diff(suiteStartTime)).format('m[m] s[s]')
						console.log("Finished suite #{chalk.dim suiteName} (#{chalk.green duration})")


			.then ()-> if options.dontClose then D.get(indexURL) else D.close()
