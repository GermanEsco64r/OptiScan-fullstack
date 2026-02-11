// import { NextRequest, NextResponse } from 'next/server';
// import { authService } from '@/lib/services/authService';
// import { frameService } from '@/lib/services/frameService';

// // PUT: Activar/desactivar marco
// export async function PUT(
//   request: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const session = await authService.verifySession();
//     if (!session.success || !session.user) {
//       return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
//     }

//     const result = await frameService.toggleFrameStatus(params.id, session.user.id);
    
//     if (!result.success) {
//       return NextResponse.json(result, { status: 400 });
//     }
    
//     return NextResponse.json(result);
//   } catch (error) {
//     console.error('Error en PUT /api/user/frames/[id]/toggle:', error);
//     return NextResponse.json(
//       { success: false, message: 'Error interno del servidor' },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/authService';
import { frameService } from '@/lib/services/frameService';

// PUT: Activar/desactivar marco
export async function PUT(
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

    const result = await frameService.toggleFrameStatus(params.id, session.user.id);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error en PUT /api/user/frames/[id]/toggle:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}