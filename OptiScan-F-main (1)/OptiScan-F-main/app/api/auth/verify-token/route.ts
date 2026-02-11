import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/pool';
import { extractUserFromToken } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    
    console.log('🔍 /api/auth/verify-token recibió token:', token ? 'Token presente' : 'No token');
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token no proporcionado' },
        { status: 400 }
      );
    }

    // Verificar el token JWT directamente
    const userFromToken = extractUserFromToken(token);
    
    if (!userFromToken) {
      console.log('❌ Token JWT inválido o expirado');
      return NextResponse.json(
        { success: false, message: 'Token inválido o expirado' },
        { status: 401 }
      );
    }

    console.log('✅ Token válido, usuario:', userFromToken.email, 'ID:', userFromToken.id);

    // Buscar usuario en la base de datos
    const query = `
      SELECT u.*, s.plan, s.status, s.analysis_count, s.analysis_limit, s.next_billing_date
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE u.id = $1 AND u.is_active = true
    `;
    
    const result = await pool.query(query, [userFromToken.id]);
    
    if (result.rows.length === 0) {
      console.log('❌ Usuario no encontrado o inactivo:', userFromToken.id);
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado o inactivo' },
        { status: 401 }
      );
    }

    const row = result.rows[0];
    const user = {
      id: row.id,
      name: row.name,
      lastName: row.last_name,
      company: row.company,
      email: row.email,
      role: row.role,
      isActive: row.is_active,
      subscription: {
        plan: row.plan,
        status: row.status,
        analysisCount: row.analysis_count,
        analysisLimit: row.analysis_limit,
        nextBilling: row.next_billing_date
          ? row.next_billing_date.toISOString()
          : undefined,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    console.log('✅ Verificación exitosa para usuario:', user.email);

    return NextResponse.json({
      success: true,
      user,
      message: 'Token válido'
    });

  } catch (error: any) {
    console.error('🔥 Error en /api/auth/verify-token:', error.message || error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}