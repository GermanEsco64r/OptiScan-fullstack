// lib/database/pool.ts
import { Pool } from 'pg';
import { dbConfig } from './config';

const pool = new Pool(dbConfig);

export default pool;