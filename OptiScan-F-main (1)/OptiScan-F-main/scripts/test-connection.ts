// scripts/test-connection.ts
import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Conexión exitosa a PostgreSQL');
    console.log('Hora del servidor:', result.rows[0].now);
    client.release();
  } catch (error) {
    console.error('❌ Error de conexión:', error);
  } finally {
    await pool.end();
  }
}

testConnection();