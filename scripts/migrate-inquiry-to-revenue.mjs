import { readFile } from 'node:fs/promises';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
if (process.env.CONFIRM_FINANCIAL_MIGRATION !== 'yes') {
  throw new Error('Set CONFIRM_FINANCIAL_MIGRATION=yes after confirming the target database environment');
}

const client = new pg.Client({ connectionString });
try {
  await client.connect();
  const sql = await readFile(new URL('../migrations/2026-08-21-inquiry-to-revenue.sql', import.meta.url), 'utf8');
  await client.query('begin');
  await client.query(sql);
  await client.query('commit');
  console.log('Inquiry-to-revenue migration applied.');
} catch (error) {
  await client.query('rollback').catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
