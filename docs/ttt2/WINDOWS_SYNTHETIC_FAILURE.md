# Windows synthetic failure

Source: c5152fe16e8b51f7f430c085e804d21e56e45b25

Run: https://github.com/sullythebear/tekken3modelconvertor/actions/runs/41140255042

tests: 380, pass: 379, fail: 1, cancelled: 0, skipped: 0

Authored test inputs only. No original assets or private reports.

<h3>Game-root discovery accepts a unique known hdd layout and rejects two conflicting installations</h3><pre>
		&lt;failure type="testCodeFailure" message="Expected values to be strictly equal:&amp;#10;+ actual - expected&amp;#10;&amp;#10;+ 'C:\\Users\\runneradmin\\AppData\\Local\\Temp\\ttt2-authored-root-42ZnTk'&amp;#10;- 'C:\\Users\\RUNNER~1\\AppData\\Local\\Temp\\ttt2-authored-root-42ZnTk'"&gt;
[Error [ERR_TEST_FAILURE]: Expected values to be strictly equal:
+ actual - expected

+ 'C:\\Users\\runneradmin\\AppData\\Local\\Temp\\ttt2-authored-root-42ZnTk'
- 'C:\\Users\\RUNNER~1\\AppData\\Local\\Temp\\ttt2-authored-root-42ZnTk'
] {
  code: 'ERR_TEST_FAILURE',
  failureType: 'testCodeFailure',
  cause: AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected
  
  + 'C:\\Users\\runneradmin\\AppData\\Local\\Temp\\ttt2-authored-root-42ZnTk'
  - 'C:\\Users\\RUNNER~1\\AppData\\Local\\Temp\\ttt2-authored-root-42ZnTk'
  
      at TestContext.&amp;lt;anonymous&gt; (file:///D:/a/tekken3modelconvertor/tekken3modelconvertor/tests/ttt2-character-set.test.mjs:13:574)
      at async Test.run (node:internal/test_runner/test:1409:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:974:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 'C:\\Users\\runneradmin\\AppData\\Local\\Temp\\ttt2-authored-root-42ZnTk',
    expected: 'C:\\Users\\RUNNER~1\\AppData\\Local\\Temp\\ttt2-authored-root-42ZnTk',
    operator: 'strictEqual',
    diff: 'simple'
  }
}
		&lt;/failure&gt;
	</pre>

## Follow-up

Resolved in888e132 by comparing the expected path with `fs.realpath(dir)`, matching the existing canonical-path security rule. No original-file protection changed. All380 tests and packaged Windows workflows then passed in run41140574305. This file is historical synthetic-only failure evidence, not the current build status.
