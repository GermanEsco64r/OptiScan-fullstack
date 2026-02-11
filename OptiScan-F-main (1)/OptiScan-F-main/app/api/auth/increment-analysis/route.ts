import { NextRequest, NextResponse } from 'next/server';
import { SecurityService } from '@/lib/security/auth';
import { userCRUD } from '@/lib/crud/userCrud';

export async function POST(request: NextRequest) {
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

    const { userId } = await request.json();

    // Verificar que el usuario que hace la petición es el mismo o es admin
    if (decoded.id !== userId && decoded.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'No autorizado' },
        { status: 403 }
      );
    }

    const updatedUser = await userCRUD.incrementAnalysisCount(userId);
    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: 'Error al actualizar contador de análisis' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Análisis registrado correctamente',
      analysisCount: updatedUser.subscription?.analysisCount
    });
  } catch (error: any) {
    console.error('Error al incrementar análisis:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al registrar análisis' 
      },
      { status: 500 }
    );
  }
}