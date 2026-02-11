import { NextRequest, NextResponse } from 'next/server';
import { SecurityService } from '@/lib/security/auth';
import { userCRUD } from '@/lib/crud/userCrud';

export async function POST(request: NextRequest) {
  try {
    const credentials = await request.json();
    console.log('🔐 Login request para:', credentials.email);

    if (!credentials.email || !credentials.password) {
      return NextResponse.json(
        { success: false, message: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const securityService = SecurityService.getInstance();

    if (!securityService.validateEmail(credentials.email)) {
      return NextResponse.json(
        { success: false, message: 'Email inválido' },
        { status: 400 }
      );
    }

    const user = await userCRUD.getUserByEmail(credentials.email);
    console.log('👤 Usuario encontrado:', user ? 'Sí' : 'No');
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    console.log('🔑 Verificando contraseña...');
    const passwordValid = await securityService.verifyPassword(
      credentials.password,
      user.password
    );
    
    console.log('✅ Contraseña válida:', passwordValid);

    if (!passwordValid) {
      return NextResponse.json(
        { success: false, message: 'Contraseña incorrecta' },
        { status: 401 }
      );
    }

    // Verificar estado de suscripción ANTES de verificar isActive
    if (user.subscription?.nextBilling) {
      const nextBilling = new Date(user.subscription.nextBilling);
      const now = new Date();
      
      // Calcular días restantes
      const diffTime = nextBilling.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      user.subscription.daysRemaining = diffDays > 0 ? diffDays : 0;
      
      // Verificar si la suscripción está vencida
      if (diffDays < 0 && user.subscription.status === 'active') {
        console.log(`⏰ Suscripción vencida para ${user.email}, desactivando...`);
        
        try {
          // Desactivar usuario y suscripción
          const updateUserQuery = `
            UPDATE users 
            SET is_active = false, updated_at = NOW() 
            WHERE id = $1
          `;
          
          const updateSubscriptionQuery = `
            UPDATE subscriptions 
            SET status = 'inactive', updated_at = NOW() 
            WHERE user_id = $1
          `;
          
          // Usar una transacción para asegurar consistencia
          const client = await userCRUD['pool'].connect();
          try {
            await client.query('BEGIN');
            await client.query(updateUserQuery, [user.id]);
            await client.query(updateSubscriptionQuery, [user.id]);
            await client.query('COMMIT');
          } catch (error) {
            await client.query('ROLLBACK');
            throw error;
          } finally {
            client.release();
          }
          
          // Actualizar estado local del usuario
          user.isActive = false;
          user.subscription.status = 'inactive';
          
          console.log(`✅ Usuario ${user.email} desactivado por suscripción vencida`);
        } catch (error) {
          console.error('❌ Error al desactivar usuario:', error);
          // Continuar con el login pero con estado actualizado
          user.isActive = false;
          user.subscription.status = 'inactive';
        }
      }
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      // Si la suscripción está vencida, dar un mensaje más específico
      if (user.subscription?.status === 'inactive') {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Tu suscripción ha expirado. Por favor, renueva tu plan para continuar usando el servicio.' 
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { success: false, message: 'Tu cuenta está desactivada. Contacta al administrador.' },
        { status: 403 }
      );
    }

    // Preparar usuario sin contraseña para el token
    const { password, ...userWithoutPassword } = user;
    
    // Asegurarse de que daysRemaining esté definido
    if (!userWithoutPassword.subscription.daysRemaining && userWithoutPassword.subscription.nextBilling) {
      const nextBilling = new Date(userWithoutPassword.subscription.nextBilling);
      const now = new Date();
      const diffTime = nextBilling.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      userWithoutPassword.subscription.daysRemaining = diffDays > 0 ? diffDays : 0;
    }

    const token = securityService.generateToken(userWithoutPassword);

    console.log('🎟️ Token generado para:', user.email);
    console.log('📅 Estado de suscripción:', {
      plan: userWithoutPassword.subscription.plan,
      status: userWithoutPassword.subscription.status,
      nextBilling: userWithoutPassword.subscription.nextBilling,
      daysRemaining: userWithoutPassword.subscription.daysRemaining
    });

    return NextResponse.json({
      success: true,
      token,
      user: userWithoutPassword,
      message: 'Inicio de sesión exitoso'
    });
  } catch (error: any) {
    console.error('🔥 Error en login API:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}