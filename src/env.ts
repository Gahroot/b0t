import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  /**
   * Server-side environment variables
   * These are only available on the server and won't be exposed to the client
   */
  server: {
    // Database
    DATABASE_URL: z.string().optional(),

    // OpenAI
    OPENAI_API_KEY: z.string().optional(),

    // Twitter/X OAuth 1.0a (for automated posting)
    TWITTER_API_KEY: z.string().optional(),
    TWITTER_API_SECRET: z.string().optional(),
    TWITTER_ACCESS_TOKEN: z.string().optional(),
    TWITTER_ACCESS_SECRET: z.string().optional(),
    TWITTER_BEARER_TOKEN: z.string().optional(),

    // Twitter/X OAuth 2.0 (for user login)
    TWITTER_CLIENT_ID: z.string().optional(),
    TWITTER_CLIENT_SECRET: z.string().optional(),

    // YouTube
    YOUTUBE_CLIENT_ID: z.string().optional(),
    YOUTUBE_CLIENT_SECRET: z.string().optional(),
    YOUTUBE_REFRESH_TOKEN: z.string().optional(),
    YOUTUBE_REDIRECT_URI: z.string().optional(),

    // Instagram
    INSTAGRAM_ACCESS_TOKEN: z.string().optional(),

    // NextAuth
    AUTH_SECRET: z.string().min(1),
    ADMIN_EMAIL: z.string().email().optional(),
    ADMIN_PASSWORD: z.string().optional(),

    // Upstash Redis (for rate limiting)
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    // RapidAPI
    RAPIDAPI_KEY: z.string().optional(),

    // Node
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  },

  /**
   * Client-side environment variables
   * These are exposed to the browser (must start with NEXT_PUBLIC_)
   */
  client: {
    // Add client-side env vars here if needed
    // NEXT_PUBLIC_API_URL: z.string().url(),
  },

  /**
   * Runtime environment variables
   * You can destructure these from `process.env`
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    TWITTER_API_KEY: process.env.TWITTER_API_KEY,
    TWITTER_API_SECRET: process.env.TWITTER_API_SECRET,
    TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN,
    TWITTER_ACCESS_SECRET: process.env.TWITTER_ACCESS_SECRET,
    TWITTER_BEARER_TOKEN: process.env.TWITTER_BEARER_TOKEN,
    TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID,
    TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET,
    YOUTUBE_CLIENT_ID: process.env.YOUTUBE_CLIENT_ID,
    YOUTUBE_CLIENT_SECRET: process.env.YOUTUBE_CLIENT_SECRET,
    YOUTUBE_REFRESH_TOKEN: process.env.YOUTUBE_REFRESH_TOKEN,
    YOUTUBE_REDIRECT_URI: process.env.YOUTUBE_REDIRECT_URI,
    INSTAGRAM_ACCESS_TOKEN: process.env.INSTAGRAM_ACCESS_TOKEN,
    AUTH_SECRET: process.env.AUTH_SECRET,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    RAPIDAPI_KEY: process.env.RAPIDAPI_KEY,
    NODE_ENV: process.env.NODE_ENV,
  },

  /**
   * Skip validation during build (optional)
   * Set to true to skip validation during build time
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  /**
   * Extend the default error messages
   */
  emptyStringAsUndefined: true,
});
