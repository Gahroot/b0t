import { sql } from 'drizzle-orm';
import { text, integer, sqliteTable } from 'drizzle-orm/sqlite-core';
import { pgTable, serial, text as pgText, timestamp, varchar, integer as pgInteger } from 'drizzle-orm/pg-core';

// For SQLite (development)
export const tweetsTableSQLite = sqliteTable('tweets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  content: text('content').notNull(),
  tweetId: text('tweet_id'),
  status: text('status').notNull().default('draft'), // draft, posted, failed
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  postedAt: integer('posted_at', { mode: 'timestamp' }),
});

export const aiResponsesTableSQLite = sqliteTable('ai_responses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  prompt: text('prompt').notNull(),
  response: text('response').notNull(),
  model: text('model').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// User authentication tables for SQLite
export const usersTableSQLite = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'timestamp' }),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const accountsTableSQLite = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
});

export const sessionsTableSQLite = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  sessionToken: text('session_token').notNull().unique(),
  userId: text('user_id').notNull(),
  expires: integer('expires', { mode: 'timestamp' }).notNull(),
});

export const verificationTokensTableSQLite = sqliteTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull().unique(),
  expires: integer('expires', { mode: 'timestamp' }).notNull(),
});

// YouTube tables for SQLite
export const youtubeVideosTableSQLite = sqliteTable('youtube_videos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  videoId: text('video_id').notNull().unique(),
  title: text('title'),
  channelId: text('channel_id'),
  channelTitle: text('channel_title'),
  description: text('description'),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  lastChecked: integer('last_checked', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const youtubeCommentsTableSQLite = sqliteTable('youtube_comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  commentId: text('comment_id').notNull().unique(),
  videoId: text('video_id').notNull(),
  parentId: text('parent_id'), // For replies
  text: text('text').notNull(),
  authorDisplayName: text('author_display_name'),
  authorChannelId: text('author_channel_id'),
  replyText: text('reply_text'), // Our reply to this comment
  repliedAt: integer('replied_at', { mode: 'timestamp' }),
  status: text('status').notNull().default('pending'), // pending, replied, ignored
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// OAuth state table for SQLite (temporary storage during OAuth flow)
export const oauthStateTableSQLite = sqliteTable('oauth_state', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  state: text('state').notNull().unique(),
  codeVerifier: text('code_verifier').notNull(),
  userId: text('user_id').notNull(),
  provider: text('provider').notNull(), // twitter, youtube, instagram
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// For PostgreSQL (production)
export const tweetsTablePostgres = pgTable('tweets', {
  id: serial('id').primaryKey(),
  content: pgText('content').notNull(),
  tweetId: varchar('tweet_id', { length: 255 }),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  postedAt: timestamp('posted_at'),
});

export const aiResponsesTablePostgres = pgTable('ai_responses', {
  id: serial('id').primaryKey(),
  prompt: pgText('prompt').notNull(),
  response: pgText('response').notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// User authentication tables for PostgreSQL
export const usersTablePostgres = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: timestamp('email_verified'),
  image: pgText('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const accountsTablePostgres = pgTable('accounts', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  type: varchar('type', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  refresh_token: pgText('refresh_token'),
  access_token: pgText('access_token'),
  expires_at: pgInteger('expires_at'),
  token_type: varchar('token_type', { length: 255 }),
  scope: pgText('scope'),
  id_token: pgText('id_token'),
  session_state: pgText('session_state'),
});

export const sessionsTablePostgres = pgTable('sessions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  expires: timestamp('expires').notNull(),
});

export const verificationTokensTablePostgres = pgTable('verification_tokens', {
  identifier: varchar('identifier', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expires: timestamp('expires').notNull(),
});

// YouTube tables for PostgreSQL
export const youtubeVideosTablePostgres = pgTable('youtube_videos', {
  id: serial('id').primaryKey(),
  videoId: varchar('video_id', { length: 255 }).notNull().unique(),
  title: pgText('title'),
  channelId: varchar('channel_id', { length: 255 }),
  channelTitle: varchar('channel_title', { length: 255 }),
  description: pgText('description'),
  publishedAt: timestamp('published_at'),
  lastChecked: timestamp('last_checked').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const youtubeCommentsTablePostgres = pgTable('youtube_comments', {
  id: serial('id').primaryKey(),
  commentId: varchar('comment_id', { length: 255 }).notNull().unique(),
  videoId: varchar('video_id', { length: 255 }).notNull(),
  parentId: varchar('parent_id', { length: 255 }),
  text: pgText('text').notNull(),
  authorDisplayName: varchar('author_display_name', { length: 255 }),
  authorChannelId: varchar('author_channel_id', { length: 255 }),
  replyText: pgText('reply_text'),
  repliedAt: timestamp('replied_at'),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// OAuth state table for PostgreSQL (temporary storage during OAuth flow)
export const oauthStateTablePostgres = pgTable('oauth_state', {
  id: serial('id').primaryKey(),
  state: varchar('state', { length: 255 }).notNull().unique(),
  codeVerifier: pgText('code_verifier').notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Export the appropriate tables based on environment
// This will be imported and used throughout the app
export type Tweet = typeof tweetsTableSQLite.$inferSelect;
export type NewTweet = typeof tweetsTableSQLite.$inferInsert;
export type AIResponse = typeof aiResponsesTableSQLite.$inferSelect;
export type NewAIResponse = typeof aiResponsesTableSQLite.$inferInsert;
export type User = typeof usersTableSQLite.$inferSelect;
export type NewUser = typeof usersTableSQLite.$inferInsert;
export type Account = typeof accountsTableSQLite.$inferSelect;
export type NewAccount = typeof accountsTableSQLite.$inferInsert;
export type Session = typeof sessionsTableSQLite.$inferSelect;
export type NewSession = typeof sessionsTableSQLite.$inferInsert;
export type YouTubeVideo = typeof youtubeVideosTableSQLite.$inferSelect;
export type NewYouTubeVideo = typeof youtubeVideosTableSQLite.$inferInsert;
export type YouTubeComment = typeof youtubeCommentsTableSQLite.$inferSelect;
export type NewYouTubeComment = typeof youtubeCommentsTableSQLite.$inferInsert;
export type OAuthState = typeof oauthStateTableSQLite.$inferSelect;
export type NewOAuthState = typeof oauthStateTableSQLite.$inferInsert;
