import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { useSQLite, sqliteDb, postgresDb } from '@/lib/db';
import { accountsTableSQLite, accountsTablePostgres } from '@/lib/schema';
import { logger } from '@/lib/logger';
import { eq, and } from 'drizzle-orm';

/**
 * YouTube Connection Status Endpoint
 *
 * GET: Check if YouTube is connected
 * DELETE: Disconnect YouTube account
 */

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Look up YouTube account in accounts table
    let youtubeAccount;
    if (useSQLite) {
      if (!sqliteDb) throw new Error('SQLite database not initialized');
      [youtubeAccount] = await sqliteDb
        .select()
        .from(accountsTableSQLite)
        .where(
          and(
            eq(accountsTableSQLite.userId, session.user.id),
            eq(accountsTableSQLite.provider, 'youtube')
          )
        )
        .limit(1);
    } else {
      if (!postgresDb) throw new Error('PostgreSQL database not initialized');
      [youtubeAccount] = await postgresDb
        .select()
        .from(accountsTablePostgres)
        .where(
          and(
            eq(accountsTablePostgres.userId, session.user.id),
            eq(accountsTablePostgres.provider, 'youtube')
          )
        )
        .limit(1);
    }

    if (!youtubeAccount) {
      return NextResponse.json({
        connected: false,
      });
    }

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    const isExpired = youtubeAccount.expires_at ? youtubeAccount.expires_at < now : false;

    return NextResponse.json({
      connected: true,
      account: {
        providerAccountId: youtubeAccount.providerAccountId,
        accountName: youtubeAccount.account_name,
        hasRefreshToken: !!youtubeAccount.refresh_token,
        isExpired,
        expiresAt: youtubeAccount.expires_at,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error checking YouTube connection status');
    return NextResponse.json(
      { error: 'Failed to check YouTube connection status' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete YouTube account from database
    if (useSQLite) {
      if (!sqliteDb) throw new Error('SQLite database not initialized');
      await sqliteDb
        .delete(accountsTableSQLite)
        .where(
          and(
            eq(accountsTableSQLite.userId, session.user.id),
            eq(accountsTableSQLite.provider, 'youtube')
          )
        );
    } else {
      if (!postgresDb) throw new Error('PostgreSQL database not initialized');
      await postgresDb
        .delete(accountsTablePostgres)
        .where(
          and(
            eq(accountsTablePostgres.userId, session.user.id),
            eq(accountsTablePostgres.provider, 'youtube')
          )
        );
    }

    logger.info({ userId: session.user.id }, 'YouTube account disconnected');

    return NextResponse.json({
      success: true,
      message: 'YouTube account disconnected successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Error disconnecting YouTube account');
    return NextResponse.json(
      { error: 'Failed to disconnect YouTube account' },
      { status: 500 }
    );
  }
}
