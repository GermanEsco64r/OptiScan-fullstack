// lib/middleware/authMiddleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { SecurityService } from '@/lib/security/auth';

export async function authMiddleware(request: NextRequest) {
  const securityService = SecurityService.getInstance();
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') || 
                request.cookies.get('auth_token')?.value;

  if (!token) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  const decoded = securityService.verifyToken(token);
  if (!decoded) {
    return NextResponse.json(
      { error: 'Token inválido o expirado' },
      { status: 401 }
    );
  }

  // Agregar usuario al request
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', decoded.id.toString());
  requestHeaders.set('x-user-email', decoded.email);
  requestHeaders.set('x-user-role', decoded.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export function adminMiddleware(request: NextRequest) {
  const userRole = request.headers.get('x-user-role');
  
  if (userRole !== 'admin') {
    return NextResponse.json(
      { error: 'Acceso denegado. Se requieren permisos de administrador.' },
      { status: 403 }
    );
  }

  return NextResponse.next();
}