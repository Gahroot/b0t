import { replyToYouTubeCommentsWorkflow } from '@/lib/workflows/youtube/reply-to-comments';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { appSettingsTable } from '@/lib/schema';

/**
 * Job: Reply to YouTube Comments
 *
 * Fetches comments from recent videos, selects top comments based on
 * engagement, generates AI replies, and posts them to YouTube.
 *
 * Configuration:
 * - Configure via UI (YouTube page -> Reply to Comments -> Options)
 * - Settings are stored in database (appSettingsTable)
 * - Falls back to YOUTUBE_REPLY_* env vars if not configured
 */

interface ReplyJobParams {
  channelId?: string;
  maxVideos?: number;
  maxRepliesPerRun?: number;
  timeWindowHours?: number;
}

/**
 * Load settings from database for a specific job
 */
async function loadJobSettings(jobName: string): Promise<Record<string, unknown>> {
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

    return jobSettings;
  } catch (error) {
    logger.error({ error }, 'Failed to load job settings from database');
    return {};
  }
}

export async function replyToYouTubeCommentsJob(params?: ReplyJobParams) {
  // Load settings from database
  const settings = await loadJobSettings('reply-to-youtube-comments');

  // Get system prompt from database settings or fallback to env var
  const systemPrompt = (settings.systemPrompt as string | undefined) ||
                        (settings.prompt as string | undefined) ||
                        process.env.YOUTUBE_REPLY_SYSTEM_PROMPT;

  try {
    logger.info('🚀 Starting Reply to YouTube Comments workflow...');

    // Use params if provided (from API), otherwise use database settings
    const channelId = params?.channelId || (settings.channelId as string | undefined);
    const maxVideos = params?.maxVideos || (settings.maxVideos as number | undefined) || 5;
    const maxRepliesPerRun = params?.maxRepliesPerRun || (settings.maxRepliesPerRun as number | undefined) || 3;
    const timeWindowHours = params?.timeWindowHours || (settings.timeWindowHours as number | undefined) || 24;

    logger.info({
      channelId: channelId || 'auto-detect',
      maxVideos,
      maxRepliesPerRun,
      timeWindowHours,
      hasCustomPrompt: !!systemPrompt,
    }, 'Configuration');

    const result = await replyToYouTubeCommentsWorkflow({
      channelId,
      maxVideos,
      maxRepliesPerRun,
      timeWindowHours,
      systemPrompt,
    });

    logger.info('✅ Reply to YouTube Comments workflow completed successfully');
    logger.info({
      videosChecked: result.videos.length,
      commentsReplied: result.repliesData.length,
    });
  } catch (error) {
    logger.error({ error }, '❌ Failed to execute Reply to YouTube Comments workflow');
    throw error;
  }
}
