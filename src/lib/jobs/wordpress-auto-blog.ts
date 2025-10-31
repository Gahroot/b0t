import { autoBlogWorkflow } from '@/lib/workflows/wordpress/auto-blog';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { appSettingsTable } from '@/lib/schema';

/**
 * Job: WordPress Auto-Blog
 *
 * Researches trending news, generates a comprehensive blog post with AI,
 * and publishes it to WordPress.
 *
 * Configuration:
 * - Configure via UI (WordPress page -> Auto-Blog -> Settings)
 * - Settings are stored in database (appSettingsTable)
 * - Falls back to env vars if not configured
 */

interface AutoBlogJobParams {
  userId?: string;
  newsTopic?: string;
  newsLanguage?: string;
  newsCountry?: string;
  autoPublish?: boolean;
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

export async function wordpressAutoBlogJob(params?: AutoBlogJobParams): Promise<void> {
  // Load settings from database
  const settings = await loadJobSettings('wordpress-auto-blog');

  // Get userId from params or settings
  const userId = params?.userId || (settings.userId as string);

  if (!userId) {
    logger.warn('⚠️  User ID not configured - cannot run WordPress auto-blog job');
    return;
  }

  // Get system prompt from database settings
  const systemPrompt = settings.systemPrompt as string | undefined;

  // Get news configuration from params or settings
  const newsTopic = params?.newsTopic || (settings.newsTopic as string | undefined);
  const newsLanguage = params?.newsLanguage || (settings.newsLanguage as string | undefined) || 'en';
  const newsCountry = params?.newsCountry || (settings.newsCountry as string | undefined) || 'us';
  const autoPublish = params?.autoPublish !== undefined
    ? params.autoPublish
    : (settings.autoPublish as boolean | undefined) || false;

  try {
    logger.info('🚀 Starting WordPress Auto-Blog workflow...');
    logger.info({
      userId,
      newsTopic,
      newsLanguage,
      newsCountry,
      autoPublish,
      hasCustomPrompt: !!systemPrompt,
    }, 'Generating blog post from trending news');

    const result = await autoBlogWorkflow({
      userId,
      systemPrompt,
      newsTopic,
      newsLanguage,
      newsCountry,
      autoPublish,
    });

    logger.info('✅ WordPress Auto-Blog workflow completed successfully');
    logger.info({
      postId: result.wordpressPostId,
      postUrl: result.wordpressPostUrl,
      title: result.generatedTitle,
      articleSource: result.selectedArticle?.publisher.name,
    });
  } catch (error) {
    logger.error({ error }, '❌ Failed to execute WordPress Auto-Blog workflow');
    throw error;
  }
}
