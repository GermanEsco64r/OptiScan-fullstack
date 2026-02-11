// lib/database/config.ts
export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'optiscan',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20, // máximo de conexiones en el pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

// Para usar con DATABASE_URL
// export function getDatabaseUrl(): string {
//   if (process.env.DATABASE_URL) {
//     return process.env.DATABASE_URL;
//   }
  
//   return `postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;
// }