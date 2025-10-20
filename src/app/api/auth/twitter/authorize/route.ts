import { NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { auth } from '@/lib/auth';
import { useSQLite, sqliteDb, postgresDb } from '@/lib/db';
import { oauthStateTableSQLite, oauthStateTablePostgres } from '@/lib/schema';
import { logger } from '@/lib/logger';

/**
 * Twitter OAuth 2.0 Authorization Endpoint
 *
 * Generates an OAuth 2.0 authorization URL and redirects the user to Twitter
 * to authorize the application.
 *
 * Flow:
 * 1. Check if user is authenticated
 * 2. Generate OAuth 2.0 authorization link with PKCE
 * 3. Store state and codeVerifier in database
 * 4. Redirect user to Twitter authorization page
 */
export async function GET() {
  try {
    // Check if user is authenticated
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login first.' },
        { status: 401 }
      );
    }

    // Check if Twitter OAuth 2.0 credentials are configured
    if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
      logger.error('Twitter OAuth 2.0 credentials not configured');
      return NextResponse.json(
        { error: 'Twitter OAuth is not configured. Please contact administrator.' },
        { status: 500 }
      );
    }

    // Initialize Twitter API client with OAuth 2.0 credentials
    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    });

    // Generate callback URL
    const callbackUrl = process.env.NEXTAUTH_URL
      ? `${process.env.NEXTAUTH_URL}/api/auth/twitter/callback`
      : 'http://localhost:3000/api/auth/twitter/callback';

    // Generate OAuth 2.0 authorization link with PKCE
    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
      callbackUrl,
      {
        scope: [
          'tweet.read',
          'tweet.write',
          'users.read',
          'offline.access', // Required for refresh token
        ],
      }
    );

    // Store state and codeVerifier in database
    if (useSQLite) {
      if (!sqliteDb) throw new Error('SQLite database not initialized');
      await sqliteDb.insert(oauthStateTableSQLite).values({
        state,
        codeVerifier,
        userId: session.user.id,
        provider: 'twitter',
      });
    } else {
      if (!postgresDb) throw new Error('PostgreSQL database not initialized');
      await postgresDb.insert(oauthStateTablePostgres).values({
        state,
        codeVerifier,
        userId: session.user.id,
        provider: 'twitter',
      });
    }

    logger.info(
      { userId: session.user.id, provider: 'twitter' },
      'Generated Twitter OAuth authorization URL'
    );

    // Redirect to Twitter authorization page
    return NextResponse.redirect(url);
  } catch (error) {
    logger.error({ error }, 'Failed to generate Twitter OAuth URL');
    return NextResponse.json(
      { error: 'Failed to initiate Twitter authorization' },
      { status: 500 }
    );
  }
}
