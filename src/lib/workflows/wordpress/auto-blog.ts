// ============================================================================
// EXTERNAL MODULES - Reusable library wrappers
// ============================================================================
import { createPipeline } from '../Pipeline';
import { getWordPressConfig } from '@/lib/wordpress';
import { generateBlogPost } from '@/lib/openai';
import { logger } from '@/lib/logger';
import { db, useSQLite } from '@/lib/db';
import {
  wordpressPostsTableSQLite,
  wordpressPostsTablePostgres,
  postedNewsArticlesTableSQLite,
  postedNewsArticlesTablePostgres,
} from '@/lib/schema';
import { getNewsSummaryForAI, type NewsArticle } from '@/lib/rapidapi/newsapi';
import { trackRead } from '@/lib/usage-tracker';

/**
 * WordPress Auto-Blog Workflow
 *
 * Production-ready with:
 * - Automatic retries (WordPress: 3 attempts, OpenAI: 3 attempts)
 * - Circuit breakers to prevent hammering failing APIs
 * - Rate limiting (WordPress: 50 posts/hour, OpenAI: 500 req/min)
 * - Structured logging to logs/app.log
 * - Duplicate prevention (filters out already-posted news articles)
 *
 * Steps:
 * 1. Research trending news via RapidAPI
 * 2. Generate blog post content with AI (title, content, excerpt)
 * 3. Post to WordPress as draft or publish
 * 4. Save to database for tracking
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================
interface WorkflowContext {
  userId: string;
  systemPrompt?: string;
  newsTopic?: string;
  newsLanguage: string;
  newsCountry: string;
  selectedArticle?: NewsArticle;
  newsContext?: string;
  generatedTitle: string;
  generatedContent: string;
  generatedExcerpt: string;
  wordpressPostId?: string;
  wordpressPostUrl?: string;
}

interface WorkflowConfig {
  userId: string;
  systemPrompt?: string;
  newsTopic?: string; // News topic to research (e.g., 'technology', 'business', 'ai')
  newsLanguage?: string; // News language (e.g., 'en', 'es')
  newsCountry?: string; // News country (e.g., 'us', 'gb')
  autoPublish?: boolean; // If true, publish immediately; if false, save as draft
  dryRun?: boolean; // If true, skip posting to WordPress
}

interface BlogPostContent {
  title: string;
  content: string;
  excerpt: string;
}

// ============================================================================
// HELPER FUNCTIONS - Pure utility functions for data processing
// ============================================================================

/**
 * Parse AI-generated blog post content
 * Expected format:
 * TITLE: [title text]
 * EXCERPT: [excerpt text]
 * CONTENT:
 * [content text]
 */
function parseBlogPostContent(aiResponse: string): BlogPostContent {
  const lines = aiResponse.split('\n');

  let title = '';
  let excerpt = '';
  let content = '';
  let currentSection = '';

  for (const line of lines) {
    if (line.startsWith('TITLE:')) {
      title = line.replace('TITLE:', '').trim();
      currentSection = 'title';
    } else if (line.startsWith('EXCERPT:')) {
      excerpt = line.replace('EXCERPT:', '').trim();
      currentSection = 'excerpt';
    } else if (line.startsWith('CONTENT:')) {
      currentSection = 'content';
    } else if (currentSection === 'content' && line.trim()) {
      content += line + '\n';
    }
  }

  // Fallback: if parsing failed, use the entire response as content
  if (!title || !content) {
    const paragraphs = aiResponse.split('\n\n');
    title = paragraphs[0]?.substring(0, 100) || 'Untitled Post';
    excerpt = paragraphs[1]?.substring(0, 200) || '';
    content = aiResponse;
  }

  return {
    title: title.trim(),
    content: content.trim(),
    excerpt: excerpt.trim() || content.substring(0, 200).trim(),
  };
}

/**
 * Convert plain text content to HTML paragraphs
 */
function convertToHTML(text: string): string {
  return text
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p>${p.trim()}</p>`)
    .join('\n');
}

// ============================================================================
// MAIN WORKFLOW FUNCTION - Orchestrates the entire automation pipeline
// ============================================================================

export async function autoBlogWorkflow(config: WorkflowConfig) {
  const initialContext: WorkflowContext = {
    userId: config.userId,
    systemPrompt: config.systemPrompt,
    newsTopic: config.newsTopic,
    newsLanguage: config.newsLanguage || 'en',
    newsCountry: config.newsCountry || 'us',
    generatedTitle: '',
    generatedContent: '',
    generatedExcerpt: '',
  };

  const isDryRun = config.dryRun || false;
  const autoPublish = config.autoPublish !== undefined ? config.autoPublish : false;

  // Initialize the pipeline engine
  const pipeline = createPipeline<WorkflowContext>();

  // ============================================================================
  // PIPELINE STEPS - Each step is an async function that transforms the context
  // ============================================================================

  const result = await pipeline
    // STEP 1: Research trending news using RapidAPI
    .step('research-news', async (ctx) => {
      logger.info(
        {
          topic: ctx.newsTopic,
          language: ctx.newsLanguage,
          country: ctx.newsCountry,
        },
        '📰 Researching latest trending news'
      );

      // Load already-posted article URLs to exclude them
      let excludeUrls: string[] = [];
      if (useSQLite) {
        const posted = await (db as ReturnType<typeof import('drizzle-orm/better-sqlite3').drizzle>)
          .select({ articleUrl: postedNewsArticlesTableSQLite.articleUrl })
          .from(postedNewsArticlesTableSQLite);
        excludeUrls = posted.map(p => p.articleUrl);
      } else {
        const posted = await (db as ReturnType<typeof import('drizzle-orm/node-postgres').drizzle>)
          .select({ articleUrl: postedNewsArticlesTablePostgres.articleUrl })
          .from(postedNewsArticlesTablePostgres);
        excludeUrls = posted.map(p => p.articleUrl);
      }

      logger.info({ excludeCount: excludeUrls.length }, 'Loaded already-posted articles');

      const { summary, selectedArticle } = await getNewsSummaryForAI({
        topic: ctx.newsTopic,
        language: ctx.newsLanguage,
        country: ctx.newsCountry,
        limit: 5,
        excludeUrls,
      });

      // Track news API usage
      await trackRead();

      if (!selectedArticle) {
        throw new Error('No new articles found - all trending articles have already been posted about');
      }

      logger.info(
        {
          articleTitle: selectedArticle.title,
          articleUrl: selectedArticle.url,
          articleSource: selectedArticle.publisher.name,
        },
        '✅ News research completed - selected viral article'
      );

      return { ...ctx, newsContext: summary, selectedArticle };
    })
    // STEP 2: Generate blog post content with AI
    .step('generate-blog-post', async (ctx) => {
      if (!ctx.selectedArticle || !ctx.newsContext) {
        throw new Error('No news article selected');
      }

      logger.info(
        {
          articleTitle: ctx.selectedArticle.title,
          hasSystemPrompt: !!ctx.systemPrompt,
        },
        '🤖 Generating blog post content with AI'
      );

      // Build prompt for blog post generation
      const blogPrompt = `Write a comprehensive blog post based on this trending news article:

Article: ${ctx.selectedArticle.title}
Source: ${ctx.selectedArticle.publisher.name}
Summary: ${ctx.newsContext}

Please format your response as:
TITLE: [A compelling SEO-friendly title]
EXCERPT: [A brief 1-2 sentence summary for the excerpt]
CONTENT:
[Full blog post content with multiple paragraphs. Write in an engaging, informative style. Include relevant insights and context. Aim for 400-600 words.]`;

      const aiResponse = await generateBlogPost(blogPrompt, ctx.systemPrompt);

      // Parse the AI response
      const parsed = parseBlogPostContent(aiResponse);

      logger.info(
        {
          title: parsed.title,
          contentLength: parsed.content.length,
          excerptLength: parsed.excerpt.length,
        },
        '✅ Blog post content generated'
      );

      return {
        ...ctx,
        generatedTitle: parsed.title,
        generatedContent: parsed.content,
        generatedExcerpt: parsed.excerpt,
      };
    })
    // STEP 3: Post to WordPress
    .step('post-to-wordpress', async (ctx): Promise<WorkflowContext> => {
      if (!ctx.generatedTitle || !ctx.generatedContent) {
        throw new Error('Missing blog post content');
      }

      // Get WordPress configuration for user
      const wpConfig = await getWordPressConfig(ctx.userId);

      if (!wpConfig) {
        throw new Error(`WordPress not configured for user ${ctx.userId}`);
      }

      if (isDryRun) {
        logger.info(
          {
            title: ctx.generatedTitle,
            contentLength: ctx.generatedContent.length,
          },
          '🧪 DRY RUN MODE - Skipping actual post to WordPress'
        );
        return {
          ...ctx,
          wordpressPostId: 'dry-run-id',
          wordpressPostUrl: 'https://example.com/dry-run',
        };
      }

      logger.info(
        {
          siteUrl: wpConfig.siteUrl,
          title: ctx.generatedTitle,
          status: autoPublish ? 'publish' : 'draft',
        },
        '📤 Posting to WordPress'
      );

      // Convert content to HTML
      const htmlContent = convertToHTML(ctx.generatedContent);

      // Import dynamically to avoid circular dependency issues
      const { createPost } = await import('@/lib/wordpress');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const post: any = await createPost(wpConfig, {
        title: ctx.generatedTitle,
        content: htmlContent,
        excerpt: ctx.generatedExcerpt,
        status: autoPublish ? 'publish' : 'draft',
      });

      logger.info(
        {
          postId: post.id,
          url: post.link,
          status: post.status,
        },
        '✅ Blog post created successfully on WordPress'
      );

      return {
        ...ctx,
        wordpressPostId: String(post.id),
        wordpressPostUrl: post.link,
      };
    })
    // STEP 4: Save to database for tracking
    .step('save-to-database', async (ctx): Promise<WorkflowContext> => {
      if (!ctx.selectedArticle || !ctx.generatedTitle) {
        throw new Error('Missing article or post data');
      }

      logger.info({ postId: ctx.wordpressPostId }, '💾 Saving post to database');

      const postData = {
        userId: ctx.userId,
        postId: ctx.wordpressPostId || 'dry-run',
        title: ctx.generatedTitle,
        content: ctx.generatedContent,
        excerpt: ctx.generatedExcerpt,
        url: ctx.wordpressPostUrl || null,
        status: isDryRun ? 'draft' : (autoPublish ? 'publish' : 'draft'),
        topic: ctx.newsTopic || ctx.selectedArticle.publisher.name || null,
        featuredImage: null,
        categories: null,
        tags: null,
        postedAt: isDryRun ? null : new Date(),
      };

      if (useSQLite) {
        await (db as ReturnType<typeof import('drizzle-orm/better-sqlite3').drizzle>)
          .insert(wordpressPostsTableSQLite)
          .values(postData);
      } else {
        await (db as ReturnType<typeof import('drizzle-orm/node-postgres').drizzle>)
          .insert(wordpressPostsTablePostgres)
          .values(postData);
      }

      logger.info('✅ Post saved to database');

      // Track the article to prevent duplicate posts
      if (!isDryRun) {
        const articleData = {
          articleUrl: ctx.selectedArticle.url,
          articleTitle: ctx.selectedArticle.title,
          articleSource: ctx.selectedArticle.publisher.name,
          articleDate: ctx.selectedArticle.date,
          newsTopic: ctx.newsTopic || null,
          threadTweetIds: JSON.stringify([ctx.wordpressPostId]),
        };

        if (useSQLite) {
          await (db as ReturnType<typeof import('drizzle-orm/better-sqlite3').drizzle>)
            .insert(postedNewsArticlesTableSQLite)
            .values(articleData);
        } else {
          await (db as ReturnType<typeof import('drizzle-orm/node-postgres').drizzle>)
            .insert(postedNewsArticlesTablePostgres)
            .values(articleData);
        }

        logger.info({ articleUrl: ctx.selectedArticle.url }, '✅ Article tracked to prevent duplicates');
      }

      return ctx;
    })
    .execute(initialContext);

  if (!result.success || !result.finalData) {
    const failedStep = result.results.find(r => !r.success);
    const errorMessage = failedStep?.error || 'Unknown pipeline error';
    throw new Error(`Workflow failed at step "${failedStep?.name}": ${errorMessage}`);
  }

  return result.finalData as WorkflowContext;
}
