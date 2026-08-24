import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';

type ManifestEntry = { file: string; confirmationSetting?: string };

let pool: Pool | undefined;
let schemaName: string | undefined;

export function safeTestDatabaseURL(value = process.env.TEST_DATABASE_URL) {
  if (!value) throw new Error('TEST_DATABASE_URL is required for PostgreSQL integration tests.');
  const url = new URL(value);
  const database = decodeURIComponent(url.pathname.slice(1));
  const localHost = ['127.0.0.1', 'localhost', '::1'].includes(url.hostname);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !localHost || !/(^|_)test($|_)/i.test(database)) {
    throw new Error('Integration database refused: use a local PostgreSQL database with test in its name. Remote, Neon, Preview, and Production targets are not allowed.');
  }
  return { value, database };
}

export async function setupIntegrationDatabase() {
  const target = safeTestDatabaseURL();
  const admin = new Pool({ connectionString: target.value, max: 1 });
  const identity = await admin.query<{ current_database: string }>('select current_database()');
  if (identity.rows[0]?.current_database !== target.database) throw new Error('Integration database identity did not match TEST_DATABASE_URL.');
  schemaName = `sitterfolio_it_${process.pid}_${randomBytes(5).toString('hex')}`;
  await admin.query(`create schema "${schemaName}"`);
  await admin.end();

  pool = new Pool({ connectionString: target.value, max: 5, options: `-c search_path=${schemaName},public` });
  const client = await pool.connect();
  try {
    const manifest = JSON.parse(await readFile(path.join(process.cwd(), 'migrations/manifest.json'), 'utf8')) as ManifestEntry[];
    const sqlFiles = (await readdir(path.join(process.cwd(), 'migrations'))).filter((file) => file.endsWith('.sql')).sort();
    const manifested = manifest.map((entry) => entry.file).sort();
    if (new Set(manifested).size !== manifested.length || JSON.stringify(manifested) !== JSON.stringify(sqlFiles)) {
      throw new Error('Migration manifest must contain every SQL migration exactly once.');
    }
    for (const entry of manifest) {
      if (entry.confirmationSetting) await client.query(`set ${entry.confirmationSetting} = 'yes'`);
      await client.query(await readFile(path.join(process.cwd(), 'migrations', entry.file), 'utf8'));
    }
  } finally {
    client.release();
  }
}

export async function teardownIntegrationDatabase() {
  const target = safeTestDatabaseURL();
  await pool?.end();
  pool = undefined;
  if (!schemaName) return;
  if (!/^sitterfolio_it_[a-zA-Z0-9_]+$/.test(schemaName)) throw new Error('Refusing to remove an unresolved integration schema.');
  const admin = new Pool({ connectionString: target.value, max: 1 });
  await admin.query(`drop schema "${schemaName}" cascade`);
  await admin.end();
  schemaName = undefined;
}

function activePool() {
  if (!pool) throw new Error('Integration database has not been initialized.');
  return pool;
}

export function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  return activePool().query<T>(text, values);
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await activePool().connect();
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
