import { execFile } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'test-reports');
const REPORT_DATE = new Date().toISOString().split('T')[0];
const REPORT_PATH = path.join(OUTPUT_DIR, `test-report-${REPORT_DATE}.md`);

interface TestResult {
  testResults: Array<{
    title: string;
    duration: number;
    state: 'passed' | 'failed' | 'skipped';
    failures?: Array<{ message: string; expected?: string; actual?: string }>;
  }>;
  summary: {
    suites: number;
    tests: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
}

async function runVitestJson(): Promise<TestResult | null> {
  return new Promise((resolve) => {
    execFile('npx', ['vitest', 'run', '--reporter=json', `--output=${path.join(OUTPUT_DIR, 'test-results.json')}`], {
      timeout: 300000,
    }, (err, stdout, stderr) => {
      // Vitest always exits with error code if tests fail, so we parse regardless
      const resultPath = path.join(OUTPUT_DIR, 'test-results.json');
      if (fs.pathExistsSync(resultPath)) {
        try {
          const data = fs.readFileSync(resultPath, 'utf-8');
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      } else {
        console.error('Vitest stdout:', stdout);
        console.error('Vitest stderr:', stderr);
        resolve(null);
      }
    });
  });
}

function generateMarkdown(results: TestResult): string {
  const { summary, testResults } = results;
  const passRate = summary.tests > 0 ? ((summary.passed / summary.tests) * 100).toFixed(1) : '0';

  let md = `# Test Report — ${REPORT_DATE}\n\n`;
  md += `## Summary\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Suites | ${summary.suites} |\n`;
  md += `| Tests | ${summary.tests} |\n`;
  md += `| Passed | ${summary.passed} |\n`;
  md += `| Failed | ${summary.failed} |\n`;
  md += `| Skipped | ${summary.skipped} |\n`;
  md += `| Pass Rate | ${passRate}% |\n`;
  md += `| Duration | ${(summary.duration / 1000).toFixed(1)}s |\n\n`;

  if (summary.failed > 0) {
    md += `## Failed Tests\n\n`;
    for (const suite of testResults) {
      if (suite.state === 'failed' && suite.failures) {
        md += `### ${suite.title}\n\n`;
        for (const failure of suite.failures) {
          md += `\`\`\`\n${failure.message}\n\`\`\`\n`;
          if (failure.expected && failure.actual) {
            md += `Expected: \`${failure.expected}\`\n`;
            md += `Actual: \`${failure.actual}\`\n`;
          }
        }
        md += `\n`;
      }
    }
  }

  md += `## Test Suites\n\n`;
  md += `| Suite | State | Duration |\n`;
  md += `|-------|-------|----------|\n`;
  for (const suite of testResults) {
    md += `| ${suite.title} | ${suite.state} | ${(suite.duration / 1000).toFixed(1)}s |\n`;
  }
  md += `\n`;

  return md;
}

async function main() {
  await fs.ensureDir(OUTPUT_DIR);

  console.log('Running vitest with JSON reporter...');
  const results = await runVitestJson();

  if (!results) {
    console.error('Failed to generate test results');
    process.exit(1);
  }

  const markdown = generateMarkdown(results);
  await fs.writeFile(REPORT_PATH, markdown, 'utf-8');

  console.log(`Test report written to: ${REPORT_PATH}`);
  console.log(`Passed: ${results.summary.passed}/${results.summary.tests}`);

  if (results.summary.failed > 0) {
    console.error(`Failed: ${results.summary.failed}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
