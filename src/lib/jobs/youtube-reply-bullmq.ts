import { createQueue, createWorker, addJob, QUEUE_NAMES } from '../queue';
import { replyToYouTubeCommentsWorkflow } from '../workflows/youtube/reply-to-comments';
import { logger } from '../logger';

/**
 * YouTube Reply Job (BullMQ Version)
 *
 * Production-ready job queue implementation with:
 * - Job persistence (survives restarts)
 * - Automatic retries (3 attempts with exponential backoff)
 * - Job history (24h completed, 7d failed)
 * - Manual triggering and replay capability
 * - Rate limiting at queue level (1 job per 30 minutes)
 *
 * The workflow itself has additional reliability:
 * - Automatic API retries (YouTube API with circuit breakers)
 * - Rate limiting (YouTube: 10k quota units/day)
 * - Structured logging to logs/app.log
 * - Batch processing (3-5 comments per run)
 * - Duplicate prevention (database checks)
 *
 * Usage:
 * ```typescript
 * // Initialize on app startup
 * await setupYouTubeReplyJob();
 * await startAllWorkers();
 *
 * // Manual trigger (optional)
 * await addJob(QUEUE_NAMES.YOUTUBE_REPLY, 'manual-trigger', {
 *   maxRepliesPerRun: 3
 * });
 * ```
 */

interface JobData {
  channelId?: string;
  maxVideos?: number;
  maxRepliesPerRun?: number;
  timeWindowHours?: number;
  systemPrompt?: string;
  dryRun?: boolean;
}

/**
 * Setup YouTube Reply Job Queue
 * Call this once during application initialization
 */
export async function setupYouTubeReplyJob() {
  logger.info('Setting up YouTube Reply job queue (BullMQ)');

  // Create queue
  createQueue(QUEUE_NAMES.YOUTUBE_REPLY, {
    defaultJobOptions: {
      attempts: 3,              // Retry failed jobs 3 times
      backoff: {
        type: 'exponential',
        delay: 5000,            // Start with 5 second delay
      },
      removeOnComplete: {
        age: 86400,             // Keep completed jobs for 24 hours
        count: 100,
      },
      removeOnFail: {
        age: 604800,            // Keep failed jobs for 7 days
        count: 500,
      },
    },
  });

  // Create worker to process jobs
  createWorker<JobData>(
    QUEUE_NAMES.YOUTUBE_REPLY,
    async (job) => {
      const { channelId, maxVideos, maxRepliesPerRun, timeWindowHours, systemPrompt, dryRun } = job.data;

      logger.info(
        {
          jobId: job.id,
          attempt: job.attemptsMade + 1,
          maxAttempts: job.opts.attempts,
          channelId: channelId || 'auto-detect',
          maxVideos,
          maxRepliesPerRun,
          dryRun: dryRun || false,
        },
        '🚀 Starting YouTube Reply workflow'
      );

      try {
        // Execute the workflow with all reliability features
        const result = await replyToYouTubeCommentsWorkflow({
          channelId,
          maxVideos,
          maxRepliesPerRun,
          timeWindowHours,
          systemPrompt,
          dryRun: dryRun || false,
        });

        logger.info(
          {
            jobId: job.id,
            videosChecked: result.videos.length,
            commentsReplied: result.repliesData.length,
          },
          '✅ YouTube Reply workflow completed successfully'
        );

        return result; // Save result in job for inspection
      } catch (error) {
        logger.error(
          {
            jobId: job.id,
            attempt: job.attemptsMade + 1,
            error,
          },
          '❌ YouTube Reply workflow failed'
        );

        throw error; // Will trigger automatic retry
      }
    },
    {
      concurrency: 1,           // Process one at a time
      limiter: {
        max: 1,                 // Max 1 job
        duration: 30 * 60 * 1000, // Per 30 minutes
      },
    }
  );

  // Add repeating job (cron-style scheduling)
  const systemPrompt = process.env.YOUTUBE_REPLY_SYSTEM_PROMPT;
  const maxVideos = process.env.YOUTUBE_REPLY_MAX_VIDEOS ? parseInt(process.env.YOUTUBE_REPLY_MAX_VIDEOS, 10) : 5;
  const maxRepliesPerRun = process.env.YOUTUBE_REPLY_MAX_REPLIES ? parseInt(process.env.YOUTUBE_REPLY_MAX_REPLIES, 10) : 3;

  await addJob(
    QUEUE_NAMES.YOUTUBE_REPLY,
    'reply-to-youtube-comments',
    {
      maxVideos,
      maxRepliesPerRun,
      timeWindowHours: 24,
      systemPrompt,
      dryRun: false, // Set to true to test without posting
    },
    {
      repeat: {
        pattern: '0 */30 * * *', // Every 30 minutes (at minute 0 and 30)
      },
      priority: 1,              // High priority (1-10, lower = higher priority)
    }
  );

  logger.info(
    { maxVideos, maxRepliesPerRun, schedule: '0 */30 * * *' },
    '✅ YouTube Reply job scheduled successfully'
  );
}

/**
 * Manually trigger a YouTube reply job (for testing)
 *
 * Usage:
 * ```typescript
 * // Test with dry-run
 * await triggerYouTubeReplyJob({ dryRun: true, maxRepliesPerRun: 3 });
 *
 * // Real post
 * await triggerYouTubeReplyJob({ maxRepliesPerRun: 5 });
 * ```
 */
export async function triggerYouTubeReplyJob(options: Partial<JobData> = {}) {
  logger.info({ options }, 'Manually triggering YouTube Reply job');

  const job = await addJob<JobData>(
    QUEUE_NAMES.YOUTUBE_REPLY,
    'manual-trigger',
    {
      maxVideos: options.maxVideos || 5,
      maxRepliesPerRun: options.maxRepliesPerRun || 3,
      timeWindowHours: options.timeWindowHours || 24,
      systemPrompt: options.systemPrompt,
      dryRun: options.dryRun || false,
      channelId: options.channelId,
    }
  );

  logger.info({ jobId: job.id }, 'Job added to queue');

  return job;
}
