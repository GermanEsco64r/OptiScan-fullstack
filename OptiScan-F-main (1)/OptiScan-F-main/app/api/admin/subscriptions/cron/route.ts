// app/api/admin/subscriptions/cron/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { subscriptionService } from '@/lib/services/subscriptionService';
import { authService } from '@/lib/services/authService';

// Verificar suscripciones vencidas (para ser llamado por un cron job)
export async function POST(request: NextRequest) {
  try {
    // Verificar si es una llamada autorizada (puedes usar un token secreto)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    if (!authHeader || !authHeader.startsWith('Bearer ') || 
        authHeader.split(' ')[1] !== expectedToken) {
      return NextResponse.json(
        { success: false, message: 'No autorizado' },
        { status: 401 }
      );
    }
    
    // Verificar y desactivar usuarios vencidos
    const result = await subscriptionService.checkExpiredSubscriptions();
    
    // Enviar recordatorios (3 días antes)
    const reminders = await subscriptionService.sendPaymentReminders(3);
    
    return NextResponse.json({
      success: true,
      message: 'Tareas de suscripción ejecutadas correctamente',
      tasks: {
        expiredCheck: result,
        reminders
      }
    });
  } catch (error: any) {
    console.error('❌ Error en cron de suscripciones:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}

// Obtener estadísticas de suscripciones
export async function GET(request: NextRequest) {
  try {
    const session = await authService.verifySession();
    if (!session.success || !session.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'No autorizado' },
        { status: 401 }
      );
    }
    
    const stats = await subscriptionService.getSubscriptionStats();
    
    if (!stats.success) {
      return NextResponse.json(stats, { status: 400 });
    }
    
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('❌ Error al obtener estadísticas:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}