import { scheduler, ScheduledJob } from '../scheduler';
import { exampleEvery5Minutes, exampleHourly, exampleDaily } from './example';
import { generateAndPostTweet, analyzeTrends, generateScheduledContent } from './twitter-ai';
import { replyToTweetsJob } from './twitter-reply';
import { postTweetsJob } from './twitter-post';
import { checkAndReplyToYouTubeComments, trackYouTubeVideo, fetchYouTubeCommentsForAnalysis } from './youtube';
import { wordpressAutoBlogJob } from './wordpress-auto-blog';
import { initializeBullMQJobs, isBullMQAvailable } from './bullmq-jobs';
import { logger } from '../logger';
import { db } from '../db';
import { appSettingsTable } from '../schema';

/**
 * Define all your scheduled jobs here
 *
 * Cron expression examples:
 * - '* /5 * * * *' - Every 5 minutes
 * - '* /10 * * * *' - Every 10 minutes
 * - '* /30 * * * *' - Every 30 minutes
 * - '0 * * * *' - Every hour
 * - '0 0 * * *' - Every day at midnight
 * - '0 9 * * 1-5' - Every weekday at 9:00 AM
 * - '0 0 * * 0' - Every Sunday at midnight
 *
 * Set enabled: false to disable a job
 */
const jobs: ScheduledJob[] = [
  // Example jobs (disabled by default)
  {
    name: 'example-every-5-minutes',
    schedule: '*/5 * * * *', // Every 5 minutes
    task: exampleEvery5Minutes,
    enabled: false, // Set to true to enable this example job
  },
  {
    name: 'example-hourly',
    schedule: '0 * * * *', // Every hour at minute 0
    task: exampleHourly,
    enabled: false, // Set to true to enable this example job
  },
  {
    name: 'example-daily',
    schedule: '0 0 * * *', // Every day at midnight
    task: exampleDaily,
    enabled: false, // Set to true to enable this example job
  },

  // AI + Twitter jobs (disabled by default - enable when ready)
  {
    name: 'generate-scheduled-content',
    schedule: '0 */4 * * *', // Every 4 hours
    task: generateScheduledContent,
    enabled: false, // Enable this to generate tweet drafts every 4 hours
  },
  {
    name: 'analyze-trends',
    schedule: '0 8 * * *', // Every day at 8:00 AM
    task: analyzeTrends,
    enabled: false, // Enable this to analyze trends daily
  },
  {
    name: 'ai-tweet-generation',
    schedule: '0 10 * * *', // Every day at 10:00 AM
    task: generateAndPostTweet,
    enabled: false, // Enable this to generate and post tweets (WARNING: will post to Twitter!)
  },
  {
    name: 'reply-to-tweets',
    schedule: '0 */2 * * *', // Every 2 hours
    task: replyToTweetsJob,
    enabled: false, // Enable this to automatically reply to tweets (WARNING: will post replies to Twitter!)
  },
  {
    name: 'post-tweets',
    schedule: '0 */4 * * *', // Every 4 hours
    task: postTweetsJob,
    enabled: false, // Enable this to automatically post tweets or threads (WARNING: will post to Twitter!)
  },

  // YouTube jobs (disabled by default - enable when ready)
  {
    name: 'check-youtube-comments',
    schedule: '*/30 * * * *', // Every 30 minutes
    task: checkAndReplyToYouTubeComments,
    enabled: false, // Enable this to check and reply to YouTube comments
  },
  {
    name: 'fetch-youtube-comments-analysis',
    schedule: '0 */6 * * *', // Every 6 hours
    task: fetchYouTubeCommentsForAnalysis,
    enabled: false, // Enable this to fetch comments for analysis (no replies)
  },

  // WordPress jobs (disabled by default - enable when ready)
  {
    name: 'wordpress-auto-blog',
    schedule: '0 */6 * * *', // Every 6 hours
    task: wordpressAutoBlogJob,
    enabled: false, // Enable this to automatically generate and post blog posts to WordPress
  },
];

/**
 * Load settings from database for a specific job
 */
async function loadJobSettings(jobName: string): Promise<{ enabled?: boolean; interval?: string }> {
  try {
    const prefix = `${jobName}_`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allSettings = await (db as any)
      .select()
      .from(appSettingsTable) as Array<{ id: number; key: string; value: string; updatedAt: Date | null }>;

    const jobSettings = allSettings
      .filter((setting: { key: string }) => setting.key.startsWith(prefix))
      .reduce((acc: Record<string, unknown>, setting: { key: string; value: string }) => {
        const settingKey = setting.key.replace(prefix, '');
        try {
          acc[settingKey] = JSON.parse(setting.value);
        } catch {
          acc[settingKey] = setting.value;
        }
        return acc;
      }, {} as Record<string, unknown>);

    return {
      enabled: jobSettings.enabled as boolean | undefined,
      interval: jobSettings.interval as string | undefined,
    };
  } catch (error) {
    logger.error({ error, jobName }, 'Failed to load job settings from database');
    return {};
  }
}

/**
 * Initialize and start all scheduled jobs
 *
 * Uses BullMQ (with Redis) if REDIS_URL is set, otherwise falls back to node-cron.
 * BullMQ provides job persistence across Railway restarts.
 *
 * Jobs will load their enabled state and schedule from the database if configured via UI.
 */
export async function initializeScheduler() {
  logger.info('Initializing job scheduler');

  // Try BullMQ first (requires Redis)
  if (isBullMQAvailable()) {
    logger.info('Redis detected - attempting to initialize BullMQ for persistent jobs');
    const bullMQInitialized = await initializeBullMQJobs();

    if (bullMQInitialized) {
      logger.info('BullMQ initialized successfully - jobs will persist across restarts');
      return;
    }

    logger.warn('BullMQ initialization failed - falling back to node-cron');
  } else {
    logger.info('No Redis configured - using node-cron for job scheduling');
    logger.info('To enable persistent jobs: Add Redis in Railway (1 click) and set REDIS_URL');
  }

  // Fallback to node-cron
  // Load settings from database for each job
  for (const job of jobs) {
    const dbSettings = await loadJobSettings(job.name);

    // Use database settings if available, otherwise use defaults from jobs array
    const jobConfig: ScheduledJob = {
      name: job.name,
      schedule: dbSettings.interval || job.schedule,
      task: job.task,
      enabled: dbSettings.enabled !== undefined ? dbSettings.enabled : job.enabled,
    };

    scheduler.register(jobConfig);
  }

  scheduler.start();

  const enabledJobs = jobs.filter(async (job) => {
    const dbSettings = await loadJobSettings(job.name);
    return dbSettings.enabled !== undefined ? dbSettings.enabled : job.enabled;
  });

  logger.info(
    { totalJobs: scheduler.getJobs().length, enabledCount: enabledJobs.length },
    'Node-cron scheduler started'
  );
}

/**
 * Stop all scheduled jobs
 */
export function stopScheduler() {
  scheduler.stop();
}

// Export individual job functions for manual testing
export {
  exampleEvery5Minutes,
  exampleHourly,
  exampleDaily,
  generateAndPostTweet,
  analyzeTrends,
  generateScheduledContent,
  replyToTweetsJob,
  postTweetsJob,
  checkAndReplyToYouTubeComments,
  trackYouTubeVideo,
  fetchYouTubeCommentsForAnalysis,
  wordpressAutoBlogJob,
};
