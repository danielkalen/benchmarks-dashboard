global.Promise = require 'bluebird'
program = require 'commander'
chalk = require 'chalk'
extend = require 'smart-extend'
specifiedCommand = false
availbleBrowsers = require('./run/available').join(', ')
defaults = extend.clone.deep.transform(
	dir: (dir)-> "./#{dir}"
)(require './defaults')


program
	.version require('../package.json').version

program
	.command 'run [suiteName]'
	.description "Run an automated execution of the suites matching the 'suiteName' regular expression (will run all if empty)"
	.option '-b --browser <browser>', "Browser to execute the benchmark suites in [default: #{chalk.dim defaults.run.browser}] [available: #{chalk.dim availbleBrowsers}]"
	.option '-t --timeout <ms>', "Suite execution timeout [default: #{chalk.dim defaults.run.timeout}]"
	.option '-d --desc', "Run suites in descending/opposite order [default: #{chalk.dim defaults.run.desc}]"
	.option '-k --keepOpen', "Avoid closing the browser after completing the automated run [default: #{chalk.dim defaults.run.keepOpen}]"
	.option '-h --host <hostname>', "Hostname of the Benchmarks Dashboard server [default: #{chalk.dim defaults.run.host}]"
	.option '-p --port <port>', "Port of the Benchmarks Dashboard server [default: #{chalk.dim defaults.run.port}]"
	.option '-P --protocol <protocol>', "Protocol of the Benchmarks Dashboard server [default: #{chalk.dim defaults.run.protocol}]"
	.action (suiteName, options)-> specifiedCommand = require('./').run(suiteName, options)

program
	.command 'serve [port]'
	.description "Serve benchmarks dashboard on a local HTTP port [default: #{chalk.dim defaults.serve.port}]"
	.option '-d --dir <dir>', "Path of the benchmarks dir to serve [default: #{chalk.dim defaults.serve.src}]"
	.action (port, options)-> specifiedCommand = require('./').serve(port, options)


program.parse(process.argv)
program.help() if not specifiedCommand
