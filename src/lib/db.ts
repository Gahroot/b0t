import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// PostgreSQL configuration
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required. Make sure Docker PostgreSQL is running.');
}

console.log('🗄️  Using PostgreSQL database:', databaseUrl.substring(0, 30) + '...');

// Configurable connection pool for scaling
// Development: 20 connections (single instance)
// Production: 100 connections (vertical scaling) or 50 per worker (horizontal scaling)
const maxConnections = parseInt(process.env.DB_POOL_MAX || '20', 10);
const minConnections = parseInt(process.env.DB_POOL_MIN || '5', 10);
const connectionTimeoutMs = parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10);
const idleTimeoutMs = parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10);

const pool = new Pool({
  connectionString: databaseUrl,
  max: maxConnections, // Maximum pool size
  min: minConnections, // Minimum pool size (keep connections warm)
  connectionTimeoutMillis: connectionTimeoutMs, // Timeout when acquiring connection
  idleTimeoutMillis: idleTimeoutMs, // Close idle connections after 30s
  allowExitOnIdle: false, // Keep pool alive
});

// Log pool configuration
console.log(`📊 Database pool: ${minConnections}-${maxConnections} connections`);

// Pool error handling
pool.on('error', (err) => {
  console.error('❌ Unexpected database pool error:', err);
});

// Pool monitoring (optional, useful for debugging)
if (process.env.DB_POOL_LOGGING === 'true') {
  pool.on('connect', () => {
    console.log('✅ New database connection established');
  });
  pool.on('acquire', () => {
    console.log('🔒 Connection acquired from pool');
  });
  pool.on('release', () => {
    console.log('🔓 Connection released back to pool');
  });
}

export const db = drizzle(pool);

// Export pool for monitoring
export { pool };
