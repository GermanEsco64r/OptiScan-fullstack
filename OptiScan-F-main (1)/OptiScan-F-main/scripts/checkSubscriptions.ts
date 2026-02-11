// scripts/checkSubscriptions.ts
import { subscriptionService } from '@/lib/services/subscriptionService';

async function runSubscriptionChecks() {
  console.log('🚀 Iniciando verificaciones de suscripción...');
  
  try {
    // Verificar y desactivar usuarios vencidos
    const result = await subscriptionService.checkExpiredSubscriptions();
    console.log(`✅ ${result.deactivatedCount} usuarios desactivados`);
    
    // Enviar recordatorios
    const reminders = await subscriptionService.sendPaymentReminders(3);
    console.log(`📧 ${reminders.remindersSent} recordatorios enviados`);
    
    // Obtener estadísticas
    const stats = await subscriptionService.getSubscriptionStats();
    if (stats.success) {
      console.log('📊 Estadísticas de suscripción:');
      console.log(`   Usuarios totales: ${stats.stats?.totalUsers}`);
      console.log(`   Usuarios activos: ${stats.stats?.activeUsers}`);
      console.log(`   Suscripciones vencidas: ${stats.stats?.expiredSubscriptions}`);
      console.log(`   Ingresos mensuales estimados: $${stats.stats?.monthlyRevenue}`);
    }
    
    console.log('🎉 Verificaciones completadas exitosamente');
  } catch (error) {
    console.error('❌ Error en las verificaciones:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runSubscriptionChecks();
}

export { runSubscriptionChecks };