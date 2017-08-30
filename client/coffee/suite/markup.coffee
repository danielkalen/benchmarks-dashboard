module.exports =

	list: "
		<div class='BenchmarkSuite-list'></div>
	"
	
	gap: "
		<div class='BenchmarkSuite-list-gap'></div>
	"
	item: "
		<div class='BenchmarkSuite-list-item {{nonShared}}'>
			<div class='BenchmarkSuite-list-item-innerwrap'>
				<div class='BenchmarkSuite-list-item-title'>{{title}}</div>
				<div class='BenchmarkSuite-list-item-subtitle'>{{subtitle}}</div>
				<div class='BenchmarkSuite-list-item-button __execute'>
					<div class='BenchmarkSuite-list-item-button-text'>Run Benchmark</div>
				</div>
				<div class='BenchmarkSuite-list-item-results __results'>
					<div class='BenchmarkSuite-list-item-results-item'>
						<div class='BenchmarkSuite-list-item-results-item-label'>Time:</div>
						<div class='BenchmarkSuite-list-item-results-item-value __results-time'></div>
					</div>
					<div class='BenchmarkSuite-list-item-results-item'>
						<div class='BenchmarkSuite-list-item-results-item-label'>Result:</div>
						<div class='BenchmarkSuite-list-item-results-item-value __results-result'></div>
					</div>
					<div class='BenchmarkSuite-list-item-results-item'>
						<div class='BenchmarkSuite-list-item-results-item-label'>Average:</div>
						<div class='BenchmarkSuite-list-item-results-item-value __results-avg'></div>
					</div>
				</div>
				<div class='BenchmarkSuite-list-item-setup __setup'></div>
			</div>
		</div>&nbsp;
	"