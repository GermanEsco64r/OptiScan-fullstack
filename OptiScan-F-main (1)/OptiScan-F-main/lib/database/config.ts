// lib/database/config.ts

// Configuración principal
export const dbConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'Optiscan2026',
    };

// Configuración SSL (NECESARIO para Railway)
export const sslConfig =
  process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false;

// Opcional: si en algún momento necesitas generar manualmente la URL
export function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  return `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || ''}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'optiscan'}`;
}
