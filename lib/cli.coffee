global.Promise = require 'bluebird'
program = require 'commander'
chalk = require 'chalk'
extend = require 'smart-extend'
specifiedCommand = false
defaults = extend.clone.deep.transform(
	dir: (dir)-> "./#{dir}"
)(require './defaults')


program
	.version require('../package.json').version

program
	.command 'run [suiteName]'
	.description "Run an automated execution of the suites matching the 'suiteName' regular expression (will run all if empty)"
	.option '-b --browser <browser>', "Browser to execute the benchmark suites in [default: #{chalk.dim defaults.run.browser}] [availble: #{chalk.dim 'chrome, canary, firefox, safari'}]"
	.option '-t --runTimes <count>', "Number of times to run each benchmark in each benchmark suite [default: #{chalk.dim defaults.run.runTimes}]"
	.option '-d --runDelay <ms>', "Amount of time in ms to wait between each benchmark execution [default: #{chalk.dim defaults.run.runDelay}]"
	.option '-s --direction <asc|desc>', "Sort direction order to execute the benchmarks in [default: #{chalk.dim defaults.run.direction}]"
	.option '-w --dontClose', "Avoid closing the browser after completing the automated run [default: #{chalk.dim defaults.run.dontClose}]"
	.option '-H --host <hostname>', "Hostname of the Benchmarks Dashboard server [default: #{chalk.dim defaults.run.host}]"
	.option '-P --port <port>', "Port of the Benchmarks Dashboard server [default: #{chalk.dim defaults.run.port}]"
	.action (suiteName, options)-> specifiedCommand = require('./').run(suiteName, options)

program
	.command 'serve [port]'
	.description "Serve benchmarks dashboard on a local HTTP port [default: #{chalk.dim defaults.serve.port}]"
	.option '-d --dir <dir>', "Path of the benchmarks dir to serve [default: #{chalk.dim defaults.serve.src}]"
	.action (port, options)-> specifiedCommand = require('./').serve(port, options)


program.parse(process.argv)
program.help() if not specifiedCommand
