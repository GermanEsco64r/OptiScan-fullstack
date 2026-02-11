import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/authService';
import { frameService } from '@/lib/services/frameService';

// GET: Obtener todos los marcos del usuario
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/user/frames - Iniciando verificación');
    
    // Extraer token del header
    const token = authService.extractTokenFromHeader(request);
    console.log('🔍 Token extraído del header:', token ? 'Sí' : 'No');
    
    if (!token) {
      console.log('❌ No hay token en el header');
      return NextResponse.json({ 
        success: false, 
        message: 'No autorizado - Token no proporcionado' 
      }, { status: 401 });
    }

    // Verificar el token
    const session = await authService.verifyTokenFromString(token);
    console.log('🔍 Resultado de verificación:', session.success);
    
    if (!session.success || !session.user) {
      console.log('❌ Verificación fallida:', session.message);
      return NextResponse.json({ 
        success: false, 
        message: session.message || 'No autorizado' 
      }, { status: 401 });
    }

    console.log('✅ Usuario autenticado:', session.user.email);
    const result = await frameService.getUserFrames(session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Error en GET /api/user/frames:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST: Crear un nuevo marco
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 POST /api/user/frames - Iniciando verificación');
    
    // Extraer token del header
    const token = authService.extractTokenFromHeader(request);
    console.log('🔍 Token extraído del header:', token ? 'Sí' : 'No');
    
    if (!token) {
      console.log('❌ No hay token en el header');
      return NextResponse.json({ 
        success: false, 
        message: 'No autorizado - Token no proporcionado' 
      }, { status: 401 });
    }

    // Verificar el token
    const session = await authService.verifyTokenFromString(token);
    console.log('🔍 Resultado de verificación:', session.success);
    
    if (!session.success || !session.user) {
      console.log('❌ Verificación fallida:', session.message);
      return NextResponse.json({ 
        success: false, 
        message: session.message || 'No autorizado' 
      }, { status: 401 });
    }

    console.log('✅ Usuario autenticado:', session.user.email);
    
    // Leer y loguear el body de la solicitud
    let frameData;
    try {
      frameData = await request.json();
      console.log('📥 Datos recibidos para crear marco:', frameData);
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

    console.log('🧹 Datos limpiados para crear marco:', cleanedFrameData);

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

    const result = await frameService.createFrame(session.user.id, cleanedFrameData);
    
    if (!result.success) {
      console.log('❌ Error al crear marco:', result.message);
      return NextResponse.json(result, { status: 400 });
    }
    
    console.log('✅ Marco creado exitosamente:', result.frame);
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Error en POST /api/user/frames:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}