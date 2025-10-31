import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, useSQLite } from '@/lib/db';
import { jobLogsTable, appSettingsTable } from '@/lib/schema';
import { eq, count, and, like } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all stats in parallel for better performance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbAny = db as any;
    const [
      successfulRuns,
      failedRuns,
      enabledJobs,
    ] = await Promise.all([
      // Count successful job executions
      dbAny.select({ count: count() })
        .from(jobLogsTable)
        .where(eq(jobLogsTable.status, 'success')) as Promise<Array<{ count: number }>>,

      // Count failed job executions
      dbAny.select({ count: count() })
        .from(jobLogsTable)
        .where(eq(jobLogsTable.status, 'error')) as Promise<Array<{ count: number }>>,

      // Count enabled automations
      dbAny.select({ count: count() })
        .from(appSettingsTable)
        .where(and(
          like(appSettingsTable.key, '%_enabled'),
          eq(appSettingsTable.value, 'true')
        )) as Promise<Array<{ count: number }>>,
    ]);

    const successCount = successfulRuns[0]?.count || 0;
    const failCount = failedRuns[0]?.count || 0;
    const activeJobsCount = enabledJobs[0]?.count || 0;
    const totalExecutions = successCount + failCount;

    return NextResponse.json({
      automations: {
        successfulRuns: successCount,
        failedRuns: failCount,
        activeJobs: activeJobsCount,
        totalExecutions,
      },
      system: {
        database: useSQLite ? 'SQLite' : 'PostgreSQL',
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
