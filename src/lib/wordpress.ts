import WpApiClient from 'wordpress-api-client';
import { createWordPressCircuitBreaker } from './resilience';
import { wordpressRateLimiter, withRateLimit } from './rate-limiter';
import { logger } from './logger';
import { db } from './db';
import { wordpressSettingsTable } from './schema';
import { eq } from 'drizzle-orm';

/**
 * WordPress API Client with Reliability Infrastructure
 *
 * Features:
 * - Circuit breaker to prevent hammering failing API
 * - Rate limiting (50 posts/hour)
 * - Structured logging
 * - Automatic error handling
 * - User-specific configuration
 */

export interface WordPressConfig {
  siteUrl: string;
  username: string;
  applicationPassword: string;
}

export interface WordPressPostData {
  title: string;
  content: string;
  excerpt?: string;
  status?: 'draft' | 'publish' | 'pending' | 'future';
}

/**
 * Get WordPress configuration for a user
 */
export async function getWordPressConfig(userId: string): Promise<WordPressConfig | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings = await (db as any)
      .select()
      .from(wordpressSettingsTable)
      .where(eq(wordpressSettingsTable.userId, userId))
      .limit(1);

    if (settings.length === 0) {
      return null;
    }

    const setting = settings[0];
    return {
      siteUrl: setting.siteUrl,
      username: setting.username,
      applicationPassword: setting.applicationPassword,
    };
  } catch (error) {
    logger.error({ error, userId }, 'Failed to get WordPress config');
    return null;
  }
}

/**
 * Create WordPress client for a user
 */
export function createWordPressClient(config: WordPressConfig): WpApiClient {
  logger.info({ siteUrl: config.siteUrl }, 'Initializing WordPress client');

  return new WpApiClient(config.siteUrl, {
    auth: {
      type: 'basic',
      username: config.username,
      password: config.applicationPassword,
    },
  });
}

/**
 * Create a new WordPress post (internal, unprotected)
 */
async function createPostInternal(config: WordPressConfig, postData: WordPressPostData) {
  logger.info(
    {
      siteUrl: config.siteUrl,
      title: postData.title,
      status: postData.status
    },
    'Creating WordPress post'
  );

  const client = createWordPressClient(config);

  // Create the post with proper typed structure
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const post: any = await client.post().create({
    title: {
      rendered: postData.title,
    },
    content: {
      rendered: postData.content,
      protected: false,
    },
    excerpt: postData.excerpt ? {
      rendered: postData.excerpt,
      protected: false,
    } : undefined,
    status: postData.status || 'draft',
  });

  logger.info(
    {
      postId: post.id,
      url: post.link,
      status: post.status
    },
    'WordPress post created successfully'
  );

  return post;
}

/**
 * Create a new WordPress post (protected with circuit breaker + rate limiting)
 */
const createPostWithBreaker = createWordPressCircuitBreaker(createPostInternal);
export const createPost = withRateLimit(
  (config: WordPressConfig, postData: WordPressPostData) =>
    createPostWithBreaker.fire(config, postData),
  wordpressRateLimiter
);
