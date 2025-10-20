import { drizzle as drizzleSQLite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePostgres } from 'drizzle-orm/node-postgres';
import Database from 'better-sqlite3';
import { Pool } from 'pg';

// Determine which database to use based on environment
const databaseUrl = process.env.DATABASE_URL;

// Use SQLite if DATABASE_URL is not set (local development or build time)
// Use PostgreSQL when DATABASE_URL is set (Railway production)
const useSQLite = !databaseUrl;

let db: ReturnType<typeof drizzleSQLite> | ReturnType<typeof drizzlePostgres>;
let sqliteDb: ReturnType<typeof drizzleSQLite> | null = null;
let postgresDb: ReturnType<typeof drizzlePostgres> | null = null;

if (useSQLite) {
  // SQLite configuration for local development
  console.log('🗄️  Using SQLite database for local development');
  const sqlite = new Database('local.db');
  sqliteDb = drizzleSQLite(sqlite);
  db = sqliteDb;
} else {
  // PostgreSQL configuration for production (Railway)
  console.log('🗄️  Using PostgreSQL database');
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required for production');
  }
  const pool = new Pool({
    connectionString: databaseUrl,
  });
  postgresDb = drizzlePostgres(pool);
  db = postgresDb;
}

export { db, useSQLite, sqliteDb, postgresDb };
