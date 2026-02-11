import { NextRequest, NextResponse } from 'next/server';
import { SecurityService } from '@/lib/security/auth';
import { userCRUD } from '@/lib/crud/userCrud';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token no proporcionado' },
        { status: 401 }
      );
    }

    const securityService = SecurityService.getInstance();
    const decoded = securityService.verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Token inválido o expirado' },
        { status: 401 }
      );
    }

    const user = await userCRUD.getUserById(decoded.id);
    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado o desactivado' },
        { status: 404 }
      );
    }

    const { password, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      message: 'Sesión válida'
    });
  } catch (error: any) {
    console.error('Error al verificar sesión:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al verificar sesión' 
      },
      { status: 500 }
    );
  }
}