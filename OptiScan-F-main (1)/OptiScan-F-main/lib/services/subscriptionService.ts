// lib/services/subscriptionService.ts
import { userCRUD } from "@/lib/crud/userCrud";

export class SubscriptionService {
  private static instance: SubscriptionService;

  private constructor() {}

  public static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  // Verificar y desactivar usuarios vencidos
  public async checkExpiredSubscriptions(): Promise<{
    success: boolean;
    message: string;
    deactivatedCount: number;
  }> {
    try {
      console.log("⏰ Iniciando verificación de suscripciones vencidas...");
      
      // Verificar y desactivar usuarios vencidos
      await userCRUD.checkAndDeactivateExpiredUsers();
      
      // Obtener usuarios vencidos para reporte
      const expiredUsers = await userCRUD.getUsersWithExpiredSubscriptions();
      
      console.log(`✅ Verificación completada. ${expiredUsers.length} usuarios vencidos encontrados`);
      
      return {
        success: true,
        message: `Verificación completada. ${expiredUsers.length} usuarios vencidos encontrados`,
        deactivatedCount: expiredUsers.length
      };
    } catch (error) {
      console.error("❌ Error al verificar suscripciones vencidas:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Error desconocido",
        deactivatedCount: 0
      };
    }
  }

  // Enviar recordatorios de pago
  public async sendPaymentReminders(daysBefore: number = 3): Promise<{
    success: boolean;
    message: string;
    remindersSent: number;
  }> {
    try {
      console.log(`📧 Enviando recordatorios de pago (${daysBefore} días antes)...`);
      
      // Obtener usuarios que vencen pronto
      const expiringUsers = await userCRUD.getUsersWithExpiringSubscriptions(daysBefore);
      
      let remindersSent = 0;
      
      // Aquí implementarías la lógica para enviar emails
      // Por ahora solo logueamos
      for (const user of expiringUsers) {
        const daysRemaining = user.subscription.daysRemaining || 0;
        console.log(`📧 Recordatorio para ${user.email}: 
          Plan: ${user.subscription.plan}
          Vence en: ${daysRemaining} días
          Fecha próximo pago: ${user.subscription.nextBilling}`);
        
        // En un entorno real, aquí enviarías el email
        remindersSent++;
      }
      
      return {
        success: true,
        message: `Se enviaron ${remindersSent} recordatorios de pago`,
        remindersSent
      };
    } catch (error) {
      console.error("❌ Error al enviar recordatorios:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Error desconocido",
        remindersSent: 0
      };
    }
  }

  // Obtener estadísticas de suscripciones
  public async getSubscriptionStats(): Promise<{
    success: boolean;
    stats?: any;
    message?: string;
  }> {
    try {
      const stats = await userCRUD.getStats();
      
      // Calcular ingresos mensuales estimados
      const monthlyRevenue = stats.totalRevenue / 12;
      
      return {
        success: true,
        stats: {
          ...stats,
          monthlyRevenue: Math.round(monthlyRevenue),
          averageRevenuePerUser: stats.totalUsers > 0 ? 
            Math.round(stats.totalRevenue / stats.totalUsers) : 0
        }
      };
    } catch (error) {
      console.error("❌ Error al obtener estadísticas:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Error desconocido"
      };
    }
  }

  // Renovar suscripción de usuario
  public async renewUserSubscription(
    userId: number,
    plan: string = 'basic'
  ): Promise<{
    success: boolean;
    user?: any;
    message?: string;
  }> {
    try {
      const user = await userCRUD.renewSubscription(userId, plan);
      
      if (!user) {
        return {
          success: false,
          message: "Usuario no encontrado"
        };
      }
      
      return {
        success: true,
        user,
        message: `Suscripción renovada exitosamente. Próximo pago: ${user.subscription.nextBilling}`
      };
    } catch (error) {
      console.error("❌ Error al renovar suscripción:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Error desconocido"
      };
    }
  }
}

export const subscriptionService = SubscriptionService.getInstance();