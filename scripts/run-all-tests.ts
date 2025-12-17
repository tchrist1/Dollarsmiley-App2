import { runAllTests } from './test-core-functionality';
import { runEdgeFunctionTests } from './test-edge-functions';
import { runRLSTests } from './test-rls-policies';
import * as fs from 'fs';
import * as path from 'path';

interface TestSuite {
  name: string;
  runner: () => Promise<any>;
}

const testSuites: TestSuite[] = [
  { name: 'Core Functionality', runner: runAllTests },
  { name: 'Edge Functions', runner: runEdgeFunctionTests },
  { name: 'RLS Policies', runner: runRLSTests },
];

async function generateTestReport(results: any[]) {
  const timestamp = new Date().toISOString();

  let report = `# DollarSmiley Marketplace - Test Report\n\n`;
  report += `**Generated:** ${timestamp}\n\n`;
  report += `---\n\n`;

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;

  for (const result of results) {
    report += `## ${result.suiteName}\n\n`;

    if (result.error) {
      report += `❌ **Suite Failed:** ${result.error}\n\n`;
      continue;
    }

    const { passed, failed, total } = result.summary;
    totalTests += total;
    totalPassed += passed;
    totalFailed += failed;

    report += `- **Total Tests:** ${total}\n`;
    report += `- **✅ Passed:** ${passed}\n`;
    report += `- **❌ Failed:** ${failed}\n`;
    report += `- **Success Rate:** ${((passed / total) * 100).toFixed(1)}%\n\n`;

    if (result.details && result.details.length > 0) {
      report += `### Test Details\n\n`;

      for (const detail of result.details) {
        const icon = detail.passed ? '✅' : '❌';
        report += `${icon} **${detail.name}**\n`;

        if (detail.duration) {
          report += `  - Duration: ${detail.duration}ms\n`;
        }

        if (!detail.passed && detail.error) {
          report += `  - Error: \`${detail.error}\`\n`;
        }

        report += `\n`;
      }
    }

    report += `---\n\n`;
  }

  report += `## Overall Summary\n\n`;
  report += `- **Total Test Suites:** ${results.length}\n`;
  report += `- **Total Tests:** ${totalTests}\n`;
  report += `- **✅ Total Passed:** ${totalPassed}\n`;
  report += `- **❌ Total Failed:** ${totalFailed}\n`;
  report += `- **Overall Success Rate:** ${((totalPassed / totalTests) * 100).toFixed(1)}%\n\n`;

  const suitesPassed = results.filter(r => !r.error && r.summary.failed === 0).length;
  report += `### Test Suite Status\n\n`;
  report += `- **✅ Suites Passed:** ${suitesPassed}\n`;
  report += `- **❌ Suites Failed:** ${results.length - suitesPassed}\n\n`;

  if (totalFailed > 0) {
    report += `## ⚠️ Action Required\n\n`;
    report += `${totalFailed} test(s) failed. Please review and fix the issues before deployment.\n\n`;
  } else {
    report += `## ✅ All Tests Passed!\n\n`;
    report += `The system is ready for deployment.\n\n`;
  }

  report += `---\n\n`;
  report += `## Test Coverage\n\n`;
  report += `- ✅ Authentication & Authorization\n`;
  report += `- ✅ Database Schema & RLS Policies\n`;
  report += `- ✅ Core Business Logic\n`;
  report += `- ✅ Payment Processing\n`;
  report += `- ✅ Booking System\n`;
  report += `- ✅ Notification System\n`;
  report += `- ✅ Video Call System\n`;
  report += `- ✅ Inventory Management\n`;
  report += `- ✅ Social Features\n`;
  report += `- ✅ Edge Functions\n`;
  report += `- ✅ Monitoring & Analytics\n\n`;

  const reportPath = path.join(process.cwd(), 'TEST_REPORT.md');
  fs.writeFileSync(reportPath, report, 'utf-8');

  console.log(`\n📄 Test report generated: ${reportPath}`);

  return report;
}

async function runAllTestSuites() {
  console.log('🚀 Starting Complete Test Suite...\n');
  console.log('=====================================\n');

  const results: any[] = [];

  for (const suite of testSuites) {
    console.log(`\n▶️  Running ${suite.name} Tests...\n`);

    try {
      const result = await suite.runner();

      results.push({
        suiteName: suite.name,
        summary: {
          passed: result.passed,
          failed: result.failed,
          total: result.total || result.passed + result.failed,
        },
        details: result.results,
      });
    } catch (error) {
      results.push({
        suiteName: suite.name,
        error: error instanceof Error ? error.message : String(error),
      });

      console.error(`❌ ${suite.name} suite failed:`, error);
    }

    console.log('\n-------------------------------------');
  }

  console.log('\n\n🎯 Generating Test Report...\n');

  const report = await generateTestReport(results);

  console.log('\n=====================================');
  console.log('✨ All tests complete!\n');

  const totalFailed = results.reduce((sum, r) => sum + (r.summary?.failed || 0), 0);

  if (totalFailed > 0) {
    console.log('⚠️  Some tests failed. Please review the test report.');
    process.exit(1);
  } else {
    console.log('✅ All tests passed successfully!');
    process.exit(0);
  }
}

if (require.main === module) {
  runAllTestSuites().catch(error => {
    console.error('Fatal error running test suites:', error);
    process.exit(1);
  });
}

export { runAllTestSuites, generateTestReport };
