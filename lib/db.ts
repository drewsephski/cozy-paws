import { Pool, type PoolClient, type QueryResultRow } from 'pg';

function databaseUrl() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return undefined;
  const url = new URL(connectionString);
  if (url.searchParams.has('sslmode')) url.searchParams.set('sslmode', 'verify-full');
  return url.toString();
}

export const pool = new Pool({ connectionString: databaseUrl(), max: 5 });

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  return pool.query<T>(text, values);
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await work(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
