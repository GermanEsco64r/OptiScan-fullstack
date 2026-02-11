// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SecurityService } from '@/lib/security/auth';
import { userCRUD } from '@/lib/crud/userCrud';

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json();

    if (!userData.name || !userData.lastName || !userData.company || !userData.email || !userData.password) {
      return NextResponse.json(
        { success: false, message: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    const securityService = SecurityService.getInstance();

    if (!securityService.validateEmail(userData.email)) {
      return NextResponse.json(
        { success: false, message: 'Email inválido' },
        { status: 400 }
      );
    }

    if (!securityService.validatePassword(userData.password)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'La contraseña debe tener al menos 6 caracteres, incluyendo letras y números' 
        },
        { status: 400 }
      );
    }

    const hashedPassword = await securityService.hashPassword(userData.password);

    // Calcular fecha de próximo pago (30 días para trial free)
    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + 30);

    const newUser = await userCRUD.createUser({
      name: userData.name,
      lastName: userData.lastName,
      company: userData.company,
      email: userData.email,
      password: hashedPassword,
      role: 'user',
      isActive: true,
      subscription: {
        plan: 'free',
        status: 'trial',
        analysisCount: 0,
        analysisLimit: 5,
        nextBilling: nextBillingDate.toISOString(),
        lastPayment: new Date().toISOString()
      }
    });

    const { password, ...userWithoutPassword } = newUser;
    const token = securityService.generateToken(userWithoutPassword);

    return NextResponse.json({
      success: true,
      token,
      user: userWithoutPassword,
      message: 'Usuario registrado exitosamente. Tienes 30 días de prueba gratuita.'
    });
  } catch (error: any) {
    console.error('Error en registro:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al crear usuario' 
      },
      { status: 500 }
    );
  }
}