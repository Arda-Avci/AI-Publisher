"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const OUTPUT_DIR = path_1.default.join(process.cwd(), 'test-reports');
const REPORT_DATE = new Date().toISOString().split('T')[0];
const REPORT_PATH = path_1.default.join(OUTPUT_DIR, `test-report-${REPORT_DATE}.md`);
async function runVitestJson() {
    return new Promise((resolve) => {
        (0, child_process_1.execFile)('npx', ['vitest', 'run', '--reporter=json', `--output=${path_1.default.join(OUTPUT_DIR, 'test-results.json')}`], {
            timeout: 300000,
        }, (err, stdout, stderr) => {
            // Vitest always exits with error code if tests fail, so we parse regardless
            const resultPath = path_1.default.join(OUTPUT_DIR, 'test-results.json');
            if (fs_extra_1.default.pathExistsSync(resultPath)) {
                try {
                    const data = fs_extra_1.default.readFileSync(resultPath, 'utf-8');
                    resolve(JSON.parse(data));
                }
                catch {
                    resolve(null);
                }
            }
            else {
                console.error('Vitest stdout:', stdout);
                console.error('Vitest stderr:', stderr);
                resolve(null);
            }
        });
    });
}
function generateMarkdown(results) {
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
    await fs_extra_1.default.ensureDir(OUTPUT_DIR);
    console.log('Running vitest with JSON reporter...');
    const results = await runVitestJson();
    if (!results) {
        console.error('Failed to generate test results');
        process.exit(1);
    }
    const markdown = generateMarkdown(results);
    await fs_extra_1.default.writeFile(REPORT_PATH, markdown, 'utf-8');
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
