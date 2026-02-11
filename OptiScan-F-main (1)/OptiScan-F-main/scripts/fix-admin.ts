// scripts/fix-admin.ts
import 'dotenv/config';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function fixAdminUser() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Buscando usuario admin...');
    
    // Verificar si el admin existe
    const adminResult = await client.query(
      'SELECT * FROM users WHERE email = $1',
      ['admin@optica.com']
    );
    
    if (adminResult.rows.length === 0) {
      console.log('❌ Usuario admin no encontrado. Creándolo...');
      
      // Generar hash para 'Admin123!'
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Admin123!', salt);
      
      // Insertar usuario admin
      await client.query('BEGIN');
      
      const userInsert = await client.query(`
        INSERT INTO users (name, last_name, company, email, password_hash, role, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        'Admin',
        'OptiScan',
        'OptiScan',
        'admin@optica.com',
        hashedPassword,
        'admin',
        true
      ]);
      
      const userId = userInsert.rows[0].id;
      
      // Crear suscripción enterprise
      await client.query(`
        INSERT INTO subscriptions (user_id, plan, status, analysis_count, analysis_limit)
        VALUES ($1, $2, $3, $4, $5)
      `, [userId, 'enterprise', 'active', 0, 9999]);
      
      await client.query('COMMIT');
      console.log('✅ Usuario admin creado exitosamente');
      
    } else {
      console.log('✅ Usuario admin encontrado');
      const admin = adminResult.rows[0];
      
      // Verificar si la contraseña necesita ser actualizada
      const passwordValid = await bcrypt.compare('Admin123!', admin.password_hash);
      
      if (!passwordValid) {
        console.log('🔄 Actualizando contraseña del admin...');
        
        // Generar nuevo hash
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Admin123!', salt);
        
        await client.query(
          'UPDATE users SET password_hash = $1 WHERE id = $2',
          [hashedPassword, admin.id]
        );
        
        console.log('✅ Contraseña actualizada correctamente');
      } else {
        console.log('✅ Contraseña del admin es correcta');
      }
    }
    
    // Mostrar información del admin
    const adminInfo = await client.query(`
      SELECT u.id, u.name, u.email, u.role, s.plan, s.status
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE u.email = 'admin@optica.com'
    `);
    
    console.log('\n📋 Información del admin:');
    adminInfo.rows.forEach(row => {
      console.log(`   ID: ${row.id}`);
      console.log(`   Nombre: ${row.name}`);
      console.log(`   Email: ${row.email}`);
      console.log(`   Rol: ${row.role}`);
      console.log(`   Plan: ${row.plan}`);
      console.log(`   Estado: ${row.status}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    await client.query('ROLLBACK');
  } finally {
    client.release();
    await pool.end();
  }
}

fixAdminUser();