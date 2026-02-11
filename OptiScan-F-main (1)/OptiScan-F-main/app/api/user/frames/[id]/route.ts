import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/authService';
import { frameService } from '@/lib/services/frameService';

// PUT: Actualizar un marco
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`🔍 PUT /api/user/frames/${params.id} - Iniciando verificación`);
    
    // Extraer token del header
    const token = authService.extractTokenFromHeader(request);
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        message: 'No autorizado - Token no proporcionado' 
      }, { status: 401 });
    }

    // Verificar el token
    const session = await authService.verifyTokenFromString(token);
    if (!session.success || !session.user) {
      return NextResponse.json({ 
        success: false, 
        message: session.message || 'No autorizado' 
      }, { status: 401 });
    }

    console.log('✅ Usuario autenticado:', session.user.email);
    
    // Leer los datos del cuerpo de la solicitud
    let frameData;
    try {
      frameData = await request.json();
      console.log(`📥 Datos recibidos para actualizar marco ${params.id}:`, frameData);
    } catch (parseError) {
      console.error('❌ Error al parsear JSON:', parseError);
      return NextResponse.json({ 
        success: false, 
        message: 'Formato de datos inválido' 
      }, { status: 400 });
    }

    // NUEVO: Función para limpiar y convertir valores de medidas
    const cleanMeasurementValue = (value: any): number | null => {
      if (value === null || value === undefined || value === '') {
        return null;
      }
      const num = Number(value);
      return isNaN(num) ? null : num;
    };

    // NUEVO: Limpiar los valores de medidas antes de enviar al servicio
    const cleanedFrameData = {
      ...frameData,
      width_mm: cleanMeasurementValue(frameData.width_mm),
      height_mm: cleanMeasurementValue(frameData.height_mm),
      bridge_mm: cleanMeasurementValue(frameData.bridge_mm),
      temple_mm: cleanMeasurementValue(frameData.temple_mm)
    };

    console.log('🧹 Datos limpiados para actualizar marco:', cleanedFrameData);

    // Validar datos mínimos
    if (!cleanedFrameData.name || !cleanedFrameData.style) {
      console.log('❌ Faltan campos obligatorios:', { 
        name: cleanedFrameData.name, 
        style: cleanedFrameData.style 
      });
      return NextResponse.json({ 
        success: false, 
        message: 'Faltan campos obligatorios: nombre y tipo de rostro' 
      }, { status: 400 });
    }

    const result = await frameService.updateFrame(params.id, session.user.id, cleanedFrameData);
    
    if (!result.success) {
      console.log('❌ Error al actualizar marco:', result.message);
      return NextResponse.json(result, { status: 400 });
    }
    
    console.log('✅ Marco actualizado exitosamente');
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error en PUT /api/user/frames/[id]:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar un marco
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Extraer token del header
    const token = authService.extractTokenFromHeader(request);
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        message: 'No autorizado - Token no proporcionado' 
      }, { status: 401 });
    }

    // Verificar el token
    const session = await authService.verifyTokenFromString(token);
    if (!session.success || !session.user) {
      return NextResponse.json({ 
        success: false, 
        message: session.message || 'No autorizado' 
      }, { status: 401 });
    }

    const result = await frameService.deleteFrame(params.id, session.user.id);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error en DELETE /api/user/frames/[id]:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}