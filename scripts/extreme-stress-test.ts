/**
 * EXTREME Multi-Client Stress Test
 *
 * Simulates 100+ clients with workflows executing simultaneously
 * to find the TRUE breaking point of the system.
 *
 * Test scenarios:
 * 1. 100 concurrent workflows (simulating 100 clients each running 1 workflow)
 * 2. 200 concurrent workflows
 * 3. 300 concurrent workflows
 * 4. Keep pushing until we see degradation or failures
 *
 * Usage: npx tsx scripts/extreme-stress-test.ts
 */

import { executeWorkflowConfig } from '../src/lib/workflows/executor';
import { pool } from '../src/lib/db';

const TEST_USER_ID = 'extreme-stress-test';

// Simple workflow (3 steps, I/O-bound)
const testWorkflow = {
  steps: [
    { id: 's1', module: 'utilities.datetime.now', inputs: {}, outputAs: 'now' },
    { id: 's2', module: 'utilities.datetime.addDays', inputs: { days: 5 }, outputAs: 'future' },
    { id: 's3', module: 'utilities.datetime.addDays', inputs: { days: 10 }, outputAs: 'far_future' },
  ],
};

interface TestMetrics {
  concurrent: number;
  total: number;
  successful: number;
  failed: number;
  durations: number[];
  dbPeakConnections: number;
  startTime: number;
  endTime: number;
}

/**
 * Monitor DB connections in real-time
 */
class DBMonitor {
  private peakConnections = 0;
  private currentConnections = 0;
  private monitoring = true;
  private interval: NodeJS.Timeout | null = null;

  start() {
    this.monitoring = true;
    this.interval = setInterval(() => {
      if (!this.monitoring) return;

      this.currentConnections = pool.totalCount;
      if (this.currentConnections > this.peakConnections) {
        this.peakConnections = this.currentConnections;
      }
    }, 50); // Check every 50ms for accurate peak tracking
  }

  stop() {
    this.monitoring = false;
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  getPeakConnections() {
    return this.peakConnections;
  }

  getCurrentConnections() {
    return this.currentConnections;
  }
}

/**
 * Run extreme stress test with specified concurrency
 */
async function runExtremeTest(concurrent: number, total: number): Promise<TestMetrics> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔥 EXTREME TEST: ${concurrent} concurrent workflows, ${total} total`);
  console.log('='.repeat(80));

  const metrics: TestMetrics = {
    concurrent,
    total,
    successful: 0,
    failed: 0,
    durations: [],
    dbPeakConnections: 0,
    startTime: Date.now(),
    endTime: 0,
  };

  const monitor = new DBMonitor();
  monitor.start();

  // Execute all workflows at once (TRUE concurrency test)
  console.log(`⚡ Launching ${concurrent} workflows SIMULTANEOUSLY...`);

  const promises = Array.from({ length: concurrent }, async (_, i) => {
    const start = Date.now();
    try {
      await executeWorkflowConfig(testWorkflow, TEST_USER_ID);
      const duration = Date.now() - start;
      metrics.durations.push(duration);
      metrics.successful++;

      // Progress indicator every 10 workflows
      if ((i + 1) % 10 === 0) {
        process.stdout.write(`\r✓ Completed: ${metrics.successful}/${concurrent} (DB: ${monitor.getCurrentConnections()}/${process.env.DB_POOL_MAX || '20'}) `);
      }

      return { success: true, duration };
    } catch (error) {
      const duration = Date.now() - start;
      metrics.failed++;
      return {
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  // Wait for ALL workflows to complete
  await Promise.allSettled(promises);

  metrics.endTime = Date.now();
  metrics.dbPeakConnections = monitor.getPeakConnections();
  monitor.stop();

  console.log(`\n✅ Test completed in ${((metrics.endTime - metrics.startTime) / 1000).toFixed(2)}s`);

  return metrics;
}

/**
 * Calculate and print detailed statistics
 */
function printStats(metrics: TestMetrics) {
  const totalTime = (metrics.endTime - metrics.startTime) / 1000;
  const sorted = metrics.durations.sort((a, b) => a - b);

  const min = sorted[0] || 0;
  const max = sorted[sorted.length - 1] || 0;
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length || 0;
  const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;

  const throughput = (metrics.total / totalTime) * 60; // per minute
  const dbUtil = (metrics.dbPeakConnections / parseInt(process.env.DB_POOL_MAX || '20', 10)) * 100;

  console.log(`\n📊 METRICS:`);
  console.log(`   Success Rate: ${metrics.successful}/${metrics.total} (${((metrics.successful / metrics.total) * 100).toFixed(1)}%)`);
  console.log(`   Failures: ${metrics.failed}`);
  console.log(`   Total Time: ${totalTime.toFixed(2)}s`);
  console.log(`   Throughput: ${throughput.toFixed(0)} workflows/minute`);
  console.log(`\n⏱️  LATENCY:`);
  console.log(`   Min: ${min}ms`);
  console.log(`   P50: ${p50}ms`);
  console.log(`   Avg: ${avg.toFixed(0)}ms`);
  console.log(`   P95: ${p95}ms`);
  console.log(`   P99: ${p99}ms`);
  console.log(`   Max: ${max}ms`);
  console.log(`\n💾 DATABASE:`);
  console.log(`   Peak Connections: ${metrics.dbPeakConnections}/${process.env.DB_POOL_MAX || '20'}`);
  console.log(`   Utilization: ${dbUtil.toFixed(1)}%`);

  // Analysis
  if (metrics.failed > 0) {
    console.log(`\n⚠️  BOTTLENECK DETECTED: ${metrics.failed} failures`);
  } else if (dbUtil > 90) {
    console.log(`\n⚠️  DATABASE POOL PRESSURE: ${dbUtil.toFixed(0)}% utilization`);
  } else if (p95 > avg * 2) {
    console.log(`\n⚠️  PERFORMANCE DEGRADATION: P95 latency is ${(p95 / avg).toFixed(1)}x average`);
  } else {
    console.log(`\n✅ NO BOTTLENECK: System handled load cleanly`);
  }
}

/**
 * Run progressive extreme tests
 */
async function runAllExtremeTests() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  🔥 EXTREME MULTI-CLIENT STRESS TEST                         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  console.log(`\n⚙️  Configuration:`);
  console.log(`   DB_POOL_MAX: ${process.env.DB_POOL_MAX || '20'}`);
  console.log(`   WORKFLOW_CONCURRENCY: ${process.env.WORKFLOW_CONCURRENCY || '20'}`);
  console.log(`   Test: Simulating 100+ clients with simultaneous workflows`);

  const tests = [
    { concurrent: 100, description: '100 clients (baseline)' },
    { concurrent: 150, description: '150 clients (1.5x)' },
    { concurrent: 200, description: '200 clients (2x)' },
    { concurrent: 300, description: '300 clients (3x)' },
    { concurrent: 500, description: '500 clients (5x) - EXTREME' },
  ];

  const allResults: TestMetrics[] = [];

  for (const test of tests) {
    console.log(`\n\n${'█'.repeat(80)}`);
    console.log(`TEST: ${test.description}`);
    console.log('█'.repeat(80));

    try {
      const metrics = await runExtremeTest(test.concurrent, test.concurrent);
      printStats(metrics);
      allResults.push(metrics);

      // Stop if we hit critical failure rate
      if (metrics.failed > metrics.total * 0.1) {
        console.log(`\n🛑 STOPPING: >10% failure rate detected`);
        break;
      }

      // Brief pause between tests
      console.log(`\n⏸️  Waiting 3s before next test...`);
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      console.error(`\n❌ Test failed:`, error);
      break;
    }
  }

  // Final summary
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('📈 FINAL SUMMARY - SYSTEM LIMITS');
  console.log('='.repeat(80));

  console.log('\n| Concurrent | Success | Throughput | P95 Latency | DB Usage | Status |');
  console.log('|-----------|---------|------------|-------------|----------|--------|');

  allResults.forEach(m => {
    const totalTime = (m.endTime - m.startTime) / 1000;
    const throughput = (m.total / totalTime) * 60;
    const p95 = m.durations.sort((a, b) => a - b)[Math.floor(m.durations.length * 0.95)] || 0;
    const dbUtil = (m.dbPeakConnections / parseInt(process.env.DB_POOL_MAX || '20', 10)) * 100;
    const successRate = ((m.successful / m.total) * 100).toFixed(0);

    const status = m.failed > 0 ? '❌ FAIL' : dbUtil > 90 ? '⚠️  WARN' : '✅ OK';

    console.log(
      `| ${m.concurrent.toString().padEnd(9)} ` +
      `| ${successRate}%`.padEnd(8) +
      `| ${throughput.toFixed(0).padEnd(10)} ` +
      `| ${p95}ms`.padEnd(11) +
      `| ${dbUtil.toFixed(0)}%`.padEnd(8) +
      `| ${status.padEnd(6)} |`
    );
  });

  // Find maximum working capacity
  const workingTests = allResults.filter(m => m.failed === 0);
  const maxWorking = workingTests[workingTests.length - 1];

  console.log(`\n${'='.repeat(80)}`);
  console.log('🎯 VERIFIED SYSTEM CAPACITY');
  console.log('='.repeat(80));

  if (maxWorking) {
    console.log(`\n✅ Maximum Verified Capacity: ${maxWorking.concurrent} concurrent workflows`);
    console.log(`   All ${maxWorking.total} workflows succeeded`);
    console.log(`   Peak DB usage: ${maxWorking.dbPeakConnections}/${process.env.DB_POOL_MAX || '20'} connections`);

    const totalTime = (maxWorking.endTime - maxWorking.startTime) / 1000;
    const throughput = (maxWorking.total / totalTime) * 60;
    console.log(`   Throughput: ${throughput.toFixed(0)} workflows/minute`);
  } else {
    console.log(`\n⚠️  All tests experienced failures`);
  }

  // Bottleneck analysis
  const firstFailure = allResults.find(m => m.failed > 0);
  if (firstFailure) {
    console.log(`\n🚨 BOTTLENECK FOUND AT: ${firstFailure.concurrent} concurrent workflows`);
    console.log(`   Failure rate: ${((firstFailure.failed / firstFailure.total) * 100).toFixed(1)}%`);
    console.log(`   DB usage: ${firstFailure.dbPeakConnections}/${process.env.DB_POOL_MAX || '20'}`);
  } else {
    console.log(`\n🚀 NO BOTTLENECK FOUND - System can handle MORE than ${allResults[allResults.length - 1].concurrent} concurrent`);
    console.log(`   Consider testing higher limits or increasing WORKFLOW_CONCURRENCY`);
  }

  console.log('');
}

// Run the extreme tests
runAllExtremeTests()
  .then(() => {
    console.log('✅ Extreme stress test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Extreme stress test failed:', error);
    process.exit(1);
  });
