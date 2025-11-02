/**
 * Next.js Instrumentation File
 *
 * This file is used to run code when the server starts.
 * Perfect for initializing scheduled jobs.
 *
 * Automatically chooses between:
 * - BullMQ (persistent jobs) if REDIS_URL is set
 * - node-cron (simple scheduler) if Redis is not available
 *
 * Note: This only runs in production or when NODE_ENV is set to 'production'
 * For development, you need to enable it in next.config.ts
 */

// Force load environment variables before anything else
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  // In development, manually load .env.local before any imports
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { config } = require('dotenv');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { expand } = require('dotenv-expand');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');

    const envLocalPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envLocalPath)) {
      const myEnv = config({ path: envLocalPath });
      expand(myEnv);
    }
  } catch {
    // Dotenv might not be available, Next.js will handle it
  }
}

export async function register() {
  // Only run in Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeScheduler } = await import('./lib/jobs');
    const { logger } = await import('./lib/logger');

    // Check production environment setup
    const isProduction = process.env.NODE_ENV === 'production';
    const isRailway = process.env.RAILWAY_ENVIRONMENT !== undefined;

    if (isProduction && isRailway) {
      logger.info('🚂 Railway deployment detected - validating configuration');

      const warnings: string[] = [];

      // Check for PostgreSQL
      if (!process.env.DATABASE_URL) {
        warnings.push('⚠️  WARNING: DATABASE_URL not set - using SQLite (data will be lost on redeploy!)');
        warnings.push('   → Add PostgreSQL: Railway Dashboard → New → Database → Add PostgreSQL');
      } else {
        logger.info('✅ PostgreSQL connected');
      }

      // Check for Redis
      if (!process.env.REDIS_URL) {
        warnings.push('⚠️  WARNING: REDIS_URL not set - jobs will be lost on restart!');
        warnings.push('   → Add Redis: Railway Dashboard → New → Database → Add Redis');
      } else {
        logger.info('✅ Redis URL configured');
        // Test Redis connection
        try {
          const { Redis } = await import('ioredis');
          const testRedis = new Redis(process.env.REDIS_URL, {
            maxRetriesPerRequest: 1,
            connectTimeout: 5000,
            lazyConnect: true,
          });
          await testRedis.connect();
          await testRedis.ping();
          logger.info('✅ Redis connection verified');
          await testRedis.quit();
        } catch (error) {
          logger.error({ error }, '❌ Redis connection failed - check REDIS_URL is correct');
          warnings.push('⚠️  Redis connection failed - verify REDIS_URL is correct');
        }
      }

      // Log all warnings
      if (warnings.length > 0) {
        logger.warn('\n' + warnings.join('\n'));
        logger.warn('📖 See DEPLOYMENT.md for setup instructions');
      } else {
        logger.info('✅ All production services configured correctly');
      }
    }

    logger.info('Initializing scheduler from instrumentation');
    await initializeScheduler();

    // Initialize workflow queue and scheduler
    logger.info('Initializing workflow execution system');
    const { initializeWorkflowQueue } = await import('./lib/workflows/workflow-queue');
    const { workflowScheduler } = await import('./lib/workflows/workflow-scheduler');

    // Initialize workflow queue (10 concurrent workflows by default)
    const queueInitialized = await initializeWorkflowQueue({
      concurrency: 10,  // Run up to 10 workflows simultaneously
      maxJobsPerMinute: 100,  // Rate limit: max 100 workflow executions per minute
    });

    if (queueInitialized) {
      logger.info('✅ Workflow queue initialized (Redis-backed)');
    } else {
      logger.info('⚠️  Workflow queue disabled (no Redis) - using direct execution');
    }

    // Initialize workflow scheduler (for cron triggers)
    await workflowScheduler.initialize();
    logger.info('✅ Workflow scheduler initialized');
  }
}
