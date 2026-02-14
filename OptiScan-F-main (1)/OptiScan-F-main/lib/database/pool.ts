// lib/database/pool.ts

import { Pool } from 'pg';
import { dbConfig, sslConfig } from './config';

const pool = new Pool({
  ...dbConfig,
  ssl: sslConfig,
  max: 20, // máximo de conexiones en el pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export default pool;
