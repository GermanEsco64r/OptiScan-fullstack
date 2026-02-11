import { NextRequest, NextResponse } from 'next/server';
import { SecurityService } from '@/lib/security/auth';
import { userCRUD } from '@/lib/crud/userCrud';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const userId = parseInt(params.id);
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, message: 'ID de usuario inválido' },
        { status: 400 }
      );
    }

    const user = await userCRUD.toggleUserStatus(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const { password, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      message: `Usuario ${user.isActive ? 'activado' : 'desactivado'} correctamente`,
      user: userWithoutPassword,
    });
  } catch (error: any) {
    console.error('Error al cambiar estado del usuario:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al cambiar estado del usuario' 
      },
      { status: 500 }
    );
  }
}