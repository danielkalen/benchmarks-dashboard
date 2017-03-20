global.Promise = require 'bluebird'
program = require 'commander'
chalk = require 'chalk'
extend = require 'smart-extend'
BenchmarksDashboard = require './benchmarks-dashboard'
specifiedCommand = false
defaults = extend.clone.deep.transform(
	src: (src)-> "./#{src}"
	dest: (dest)-> "./#{dest}"
)(require './defaults')


program
	.version require('../package.json').version

program
	.command 'build'
	.description "Build the client-side files for the dashboard from the specified source dir"
	.option '-s --src <path>', "Path of dir containing benchmark suites [default: #{chalk.dim defaults.build.src}]"
	.option '-d --dest <path>', "Path of destination directory to write files to [default: #{chalk.dim defaults.build.dest}]"
	.option '--title <string>', "Title of the benchmarks dashboard page [default: #{chalk.dim defaults.build.title}]"
	.option '--subtitle <string>', "Subtitle/description of the benchmarks dashboard page [default: #{chalk.dim defaults.build.subtitle}]"
	.action (options)-> specifiedCommand = BenchmarksDashboard.build(options, true)

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
	.action (suiteName, options)-> specifiedCommand = BenchmarksDashboard.run(suiteName, options)

program
	.command 'serve [port]'
	.description "Serve benchmarks dashboard on a local HTTP port [default: #{chalk.dim defaults.serve.port}]"
	.option '-d --dashboard <dir>', "Path of the of the built dashboard dir to serve [default: #{chalk.dim defaults.serve.dashboard}]"
	.action (port, options)-> specifiedCommand = BenchmarksDashboard.serve(port, options)


program.parse(process.argv)
program.help() if not specifiedCommand
