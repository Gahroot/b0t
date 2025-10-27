import { createQueue, createWorker, addJob, startAllWorkers } from '../queue';
import { logger } from '../logger';
import { generateAndPostTweet, analyzeTrends, generateScheduledContent } from './twitter-ai';
import { replyToTweetsJob } from './twitter-reply';
import { checkAndReplyToYouTubeComments, fetchYouTubeCommentsForAnalysis } from './youtube';
import { replyToYouTubeCommentsJob } from './youtube-reply';
import { db } from '../db';
import { appSettingsTable } from '../schema';

/**
 * BullMQ Job Setup (Optional - only runs if Redis is configured)
 *
 * This provides persistent job queues that survive Railway restarts.
 * Falls back to node-cron if REDIS_URL is not set.
 *
 * To enable:
 * 1. In Railway: Click "New" → "Database" → "Add Redis"
 * 2. Copy REDIS_URL from Redis service variables
 * 3. Add to your app's environment variables
 */

export const JOBS_QUEUE = 'scheduled-jobs';

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
 * Initialize BullMQ workers for all scheduled jobs
 *
 * Jobs will load their enabled state and schedule from the database if configured via UI.
 */
export async function initializeBullMQJobs() {
  if (!process.env.REDIS_URL) {
    logger.info('REDIS_URL not set - BullMQ jobs disabled, using node-cron instead');
    return false;
  }

  try {
    logger.info('Initializing BullMQ job queue');

    // Create the main jobs queue
    createQueue(JOBS_QUEUE, {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 10000, // 10 seconds initial delay
        },
      },
    });

    // Create worker to process jobs
    createWorker(JOBS_QUEUE, async (job) => {
      logger.info({ jobName: job.name }, 'Processing scheduled job');

      switch (job.name) {
        case 'generate-scheduled-content':
          await generateScheduledContent();
          break;
        case 'analyze-trends':
          await analyzeTrends();
          break;
        case 'ai-tweet-generation':
          await generateAndPostTweet();
          break;
        case 'reply-to-tweets':
          await replyToTweetsJob();
          break;
        case 'check-youtube-comments':
          await checkAndReplyToYouTubeComments();
          break;
        case 'reply-to-youtube-comments':
          await replyToYouTubeCommentsJob();
          break;
        case 'fetch-youtube-comments-analysis':
          await fetchYouTubeCommentsForAnalysis();
          break;
        default:
          logger.warn({ jobName: job.name }, 'Unknown job name');
      }
    });

    // Load job configurations from database and schedule only enabled jobs
    const jobConfigs = [
      { name: 'generate-scheduled-content', defaultSchedule: '0 */4 * * *', priority: 2 },
      { name: 'ai-tweet-generation', defaultSchedule: '0 10 * * *', priority: 1 },
      { name: 'reply-to-tweets', defaultSchedule: '0 */2 * * *', priority: 1 },
      { name: 'reply-to-youtube-comments', defaultSchedule: '0 */30 * * *', priority: 1 },
      { name: 'analyze-trends', defaultSchedule: '0 8 * * *', priority: 3 },
      { name: 'check-youtube-comments', defaultSchedule: '*/30 * * * *', priority: 3 },
      { name: 'fetch-youtube-comments-analysis', defaultSchedule: '0 */6 * * *', priority: 4 },
    ];

    let enabledCount = 0;

    for (const config of jobConfigs) {
      const dbSettings = await loadJobSettings(config.name);

      // Only schedule if enabled in database
      if (dbSettings.enabled === true) {
        const schedule = dbSettings.interval || config.defaultSchedule;

        await addJob(JOBS_QUEUE, config.name, {}, {
          repeat: { pattern: schedule },
          priority: config.priority,
        });

        enabledCount++;
        logger.info({ jobName: config.name, schedule }, 'Scheduled BullMQ job');
      } else {
        logger.info({ jobName: config.name }, 'Job disabled - skipping');
      }
    }

    // Start all workers
    await startAllWorkers();

    logger.info({ enabledCount, totalJobs: jobConfigs.length }, 'BullMQ jobs initialized successfully');
    return true;
  } catch (error) {
    logger.error({ error }, 'Failed to initialize BullMQ jobs - falling back to node-cron');
    return false;
  }
}

/**
 * Check if BullMQ is available
 */
export function isBullMQAvailable(): boolean {
  return !!process.env.REDIS_URL;
}
