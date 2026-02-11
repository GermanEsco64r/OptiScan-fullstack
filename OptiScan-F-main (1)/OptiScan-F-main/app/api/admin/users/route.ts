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

    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'No autorizado' },
        { status: 403 }
      );
    }

    const users = await userCRUD.getAllUsers();
    // Eliminar la contraseña de cada usuario
    const usersWithoutPassword = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    return NextResponse.json({
      success: true,
      users: usersWithoutPassword,
    });
  } catch (error: any) {
    console.error('Error al obtener usuarios:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al obtener usuarios' 
      },
      { status: 500 }
    );
  }
}