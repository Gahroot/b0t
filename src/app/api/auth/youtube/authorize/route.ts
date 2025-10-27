import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { auth } from '@/lib/auth';
import { useSQLite, sqliteDb, postgresDb } from '@/lib/db';
import { oauthStateTableSQLite, oauthStateTablePostgres } from '@/lib/schema';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

/**
 * YouTube OAuth 2.0 Authorization Endpoint
 *
 * Generates an OAuth 2.0 authorization URL and redirects the user to Google
 * to authorize the application for YouTube access.
 *
 * Flow:
 * 1. Check if user is authenticated
 * 2. Generate OAuth 2.0 authorization link with PKCE
 * 3. Store state and codeVerifier in database
 * 4. Redirect user to Google authorization page
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

    // Check if YouTube OAuth 2.0 credentials are configured
    if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
      logger.error('YouTube OAuth 2.0 credentials not configured');
      return NextResponse.json(
        { error: 'YouTube OAuth is not configured. Please contact administrator.' },
        { status: 500 }
      );
    }

    // Initialize Google OAuth2 client
    const callbackUrl = process.env.NEXTAUTH_URL
      ? `${process.env.NEXTAUTH_URL}/api/auth/youtube/callback`
      : 'http://localhost:3000/api/auth/youtube/callback';

    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      callbackUrl
    );

    // Generate state and code verifier for PKCE
    const state = crypto.randomBytes(32).toString('hex');
    const codeVerifier = crypto.randomBytes(32).toString('base64url');

    // Generate authorization URL
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Required for refresh token
      scope: [
        'https://www.googleapis.com/auth/youtube.force-ssl',
        'https://www.googleapis.com/auth/youtube',
      ],
      state,
      prompt: 'consent', // Force consent screen to ensure refresh token
      code_challenge: codeChallenge,
      // @ts-expect-error - googleapis types don't match actual API
      code_challenge_method: 'S256',
    });

    // Store state and code verifier in database for callback verification
    try {
      if (useSQLite) {
        if (!sqliteDb) {
          throw new Error('SQLite database not initialized');
        }
        await sqliteDb.insert(oauthStateTableSQLite).values({
          state,
          codeVerifier,
          userId: session.user.id,
          provider: 'youtube',
        });
      } else {
        if (!postgresDb) {
          throw new Error('PostgreSQL database not initialized');
        }
        await postgresDb.insert(oauthStateTablePostgres).values({
          state,
          codeVerifier,
          userId: session.user.id,
          provider: 'youtube',
        });
      }

      logger.info(
        { userId: session.user.id, provider: 'youtube' },
        'YouTube OAuth state stored'
      );
    } catch (error) {
      logger.error({ error }, 'Failed to store YouTube OAuth state');
      return NextResponse.json(
        { error: 'Failed to initialize OAuth flow. Please try again.' },
        { status: 500 }
      );
    }

    // Redirect to Google OAuth authorization page
    return NextResponse.redirect(authUrl);
  } catch (error) {
    logger.error({ error }, 'YouTube OAuth authorization error');
    return NextResponse.json(
      { error: 'Failed to start YouTube authorization' },
      { status: 500 }
    );
  }
}
