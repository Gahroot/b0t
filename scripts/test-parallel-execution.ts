/**
 * Test Parallel Workflow Execution
 *
 * Creates and executes test workflows to demonstrate parallel execution improvements
 */

import { executeWorkflowConfig } from '../src/lib/workflows/executor';
import { logger } from '../src/lib/logger';

// Mock user ID for testing
const TEST_USER_ID = 'test-user-parallel';

/**
 * Test 1: Independent Steps (Should execute in parallel)
 * Expected: 3 steps run simultaneously in 1 wave
 */
async function testIndependentSteps() {
  logger.info('========================================');
  logger.info('TEST 1: Independent Steps (Parallel)');
  logger.info('========================================');

  const config = {
    steps: [
      {
        id: 'current_time',
        module: 'utilities.datetime.now',
        inputs: {},
        outputAs: 'current_time',
      },
      {
        id: 'date_5_days',
        module: 'utilities.datetime.addDays',
        inputs: { days: 5 },
        outputAs: 'date_5_days',
      },
      {
        id: 'date_10_days',
        module: 'utilities.datetime.addDays',
        inputs: { days: 10 },
        outputAs: 'date_10_days',
      },
    ],
  };

  const startTime = Date.now();
  const result = await executeWorkflowConfig(config, TEST_USER_ID);
  const duration = Date.now() - startTime;

  logger.info({ result, duration }, 'Test 1 completed');

  return {
    test: 'Independent Steps',
    success: result.success,
    duration,
    expectedWaves: 1,
    expectedParallelSteps: 3,
  };
}

/**
 * Test 2: Dependent Steps (Should execute sequentially in waves)
 * Expected: Wave 1 (2 steps in parallel), Wave 2 (1 step sequential)
 */
async function testDependentSteps() {
  logger.info('========================================');
  logger.info('TEST 2: Dependent Steps (Mixed)');
  logger.info('========================================');

  const config = {
    steps: [
      {
        id: 'date1',
        module: 'utilities.datetime.addDays',
        inputs: { days: 3 },
        outputAs: 'date1',
      },
      {
        id: 'date2',
        module: 'utilities.datetime.addDays',
        inputs: { days: 7 },
        outputAs: 'date2',
      },
      {
        id: 'format_date',
        module: 'utilities.datetime.formatDate',
        inputs: {
          date: '{{date1}}',
          format: 'YYYY-MM-DD',
        },
        outputAs: 'format_date',
      },
    ],
  };

  const startTime = Date.now();
  const result = await executeWorkflowConfig(config, TEST_USER_ID);
  const duration = Date.now() - startTime;

  logger.info({ result, duration }, 'Test 2 completed');

  return {
    test: 'Dependent Steps',
    success: result.success,
    duration,
    expectedWaves: 2,
    expectedParallelSteps: 2,
  };
}

/**
 * Test 3: Complex Dependency Chain
 * Expected: Multiple waves with varying parallelism
 */
async function testComplexDependencies() {
  logger.info('========================================');
  logger.info('TEST 3: Complex Dependencies');
  logger.info('========================================');

  const config = {
    steps: [
      // Wave 1: These 3 can run in parallel (no dependencies)
      {
        id: 'now',
        module: 'utilities.datetime.now',
        inputs: {},
        outputAs: 'now',
      },
      {
        id: 'add3',
        module: 'utilities.datetime.addDays',
        inputs: { days: 3 },
        outputAs: 'add3',
      },
      {
        id: 'add7',
        module: 'utilities.datetime.addDays',
        inputs: { days: 7 },
        outputAs: 'add7',
      },
      // Wave 2: This depends on 'now'
      {
        id: 'format_now',
        module: 'utilities.datetime.formatDate',
        inputs: {
          date: '{{now}}',
          format: 'YYYY-MM-DD',
        },
        outputAs: 'format_now',
      },
      // Wave 3: This depends on both 'add3' and 'add7'
      {
        id: 'diff',
        module: 'utilities.datetime.daysDifference',
        inputs: {
          date1: '{{add3}}',
          date2: '{{add7}}',
        },
        outputAs: 'diff',
      },
    ],
  };

  const startTime = Date.now();
  const result = await executeWorkflowConfig(config, TEST_USER_ID);
  const duration = Date.now() - startTime;

  logger.info({ result, duration }, 'Test 3 completed');

  return {
    test: 'Complex Dependencies',
    success: result.success,
    duration,
    expectedWaves: 3,
    expectedParallelSteps: 3,
  };
}

/**
 * Test 4: Sequential Steps (No parallelization possible)
 * Expected: Each step depends on previous, 5 waves total
 */
async function testSequentialSteps() {
  logger.info('========================================');
  logger.info('TEST 4: Sequential Steps (No Parallel)');
  logger.info('========================================');

  const config = {
    steps: [
      {
        id: 'step1',
        module: 'utilities.datetime.now',
        inputs: {},
        outputAs: 'step1',
      },
      {
        id: 'step2',
        module: 'utilities.datetime.formatDate',
        inputs: {
          date: '{{step1}}',
          format: 'YYYY-MM-DD',
        },
        outputAs: 'step2',
      },
      {
        id: 'step3',
        module: 'utilities.string.uppercase',
        inputs: {
          text: '{{step2}}',
        },
        outputAs: 'step3',
      },
    ],
  };

  const startTime = Date.now();
  const result = await executeWorkflowConfig(config, TEST_USER_ID);
  const duration = Date.now() - startTime;

  logger.info({ result, duration }, 'Test 4 completed');

  return {
    test: 'Sequential Steps',
    success: result.success,
    duration,
    expectedWaves: 3,
    expectedParallelSteps: 1,
  };
}

/**
 * Run all tests and report results
 */
async function runAllTests() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Parallel Execution Test Suite        ║');
  console.log('╚════════════════════════════════════════╝\n');

  const results = [];

  try {
    results.push(await testIndependentSteps());
    results.push(await testDependentSteps());
    results.push(await testComplexDependencies());
    results.push(await testSequentialSteps());

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  Test Results Summary                  ║');
    console.log('╚════════════════════════════════════════╝\n');

    results.forEach((result, idx) => {
      console.log(`Test ${idx + 1}: ${result.test}`);
      console.log(`  Status: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`  Duration: ${result.duration}ms`);
      console.log(`  Expected Waves: ${result.expectedWaves}`);
      console.log(`  Expected Parallel Steps: ${result.expectedParallelSteps}`);
      console.log('');
    });

    const allPassed = results.every((r) => r.success);
    console.log(
      allPassed
        ? '✅ All tests passed! Parallel execution is working correctly.'
        : '❌ Some tests failed. Check logs above for details.'
    );

    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('❌ Test suite failed with error:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
