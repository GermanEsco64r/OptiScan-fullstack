const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'optiscan',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Conexión a PostgreSQL establecida');
    
    // Verificar tablas
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📊 Tablas encontradas:');
    result.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
    // Verificar usuarios
    const users = await client.query('SELECT id, email, role FROM users LIMIT 5');
    console.log('\n👤 Usuarios (primeros 5):');
    users.rows.forEach(user => console.log(`  - ${user.email} (${user.role})`));
    
    client.release();
    await pool.end();
    console.log('\n✅ Prueba completada exitosamente');
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
    process.exit(1);
  }
}

testConnection();