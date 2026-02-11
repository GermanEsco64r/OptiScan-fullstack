// lib/crud/userCrud.ts
import { SecurityService, User, RegisterData } from "@/lib/security/auth";
import pool from "@/lib/database/pool";

// Definir los planes y sus características
export const PLAN_DETAILS = {
  free: {
    name: "Free",
    price: 0,
    analysisLimit: 5,
    billingCycleDays: 30,
    features: ["5 análisis", "Catálogo básico", "Soporte por email"]
  },
  basic: {
    name: "Básico",
    price: 19000,
    analysisLimit: 15,
    billingCycleDays: 30,
    features: ["15 análisis/mes", "Catálogo completo", "Soporte prioritario"]
  },
  pro: {
    name: "Profesional",
    price: 49000,
    analysisLimit: 50,
    billingCycleDays: 30,
    features: ["50 análisis/mes", "Análisis avanzados", "Soporte 24/7"]
  },
  enterprise: {
    name: "Empresarial",
    price: 199000,
    analysisLimit: 9999,
    billingCycleDays: 365,
    features: ["Análisis ilimitados", "Dashboard empresarial", "Soporte dedicado"]
  }
} as const;

// Clase CRUD para usuarios con PostgreSQL
export class UserCRUD {
  private securityService: SecurityService;
  private pool = pool; // Hacer pool accesible internamente

  constructor() {
    this.securityService = SecurityService.getInstance();
    this.verifyAdminExists();
  }

  // Verificar que el admin exista en la BD
  private async verifyAdminExists(): Promise<void> {
    try {
      const admin = await this.getUserByEmail("admin@optica.com");
      if (!admin) {
        console.warn("⚠️ Usuario admin no encontrado en la base de datos");
      }
    } catch (error) {
      console.error("Error verificando admin:", error);
    }
  }

  // Función para calcular la próxima fecha de pago
  private calculateNextBillingDate(plan: string, startDate?: Date): Date {
    const now = startDate || new Date();
    const nextBilling = new Date(now);
    
    switch (plan) {
      case 'free':
        nextBilling.setDate(now.getDate() + 30);
        break;
      case 'basic':
      case 'pro':
        nextBilling.setMonth(now.getMonth() + 1);
        break;
      case 'enterprise':
        nextBilling.setFullYear(now.getFullYear() + 1);
        break;
      default:
        nextBilling.setDate(now.getDate() + 30);
    }
    
    return nextBilling;
  }

  // Función para calcular días restantes
  public calculateDaysRemaining(nextBillingDate: Date | null): number {
    if (!nextBillingDate) return 0;
    
    const now = new Date();
    const nextBilling = new Date(nextBillingDate);
    
    const diffTime = nextBilling.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  }

  // Crear nuevo usuario
  public async createUser(
    userData: Partial<User> & { password: string },
  ): Promise<User> {
    const client = await pool.connect();
    try {
      const sanitizedData = {
        name: this.securityService.sanitizeInput(userData.name || ""),
        lastName: this.securityService.sanitizeInput(userData.lastName || ""),
        company: this.securityService.sanitizeInput(userData.company || ""),
        email: this.securityService.sanitizeInput(userData.email || ""),
      };

      if (!this.securityService.validateEmail(sanitizedData.email)) {
        throw new Error("Email inválido");
      }

      if (!this.securityService.validatePassword(userData.password)) {
        throw new Error(
          "La contraseña debe tener al menos 6 caracteres, incluyendo letras y números",
        );
      }

      // Verificar si el usuario ya existe
      const existingUser = await this.getUserByEmail(sanitizedData.email);
      if (existingUser) {
        throw new Error("El usuario ya existe");
      }

      const hashedPassword = userData.password;
      const plan = userData.subscription?.plan || "free";
      
      // Calcular fecha de próximo pago
      const nextBillingDate = this.calculateNextBillingDate(plan);

      // Iniciar transacción
      await client.query("BEGIN");

      // Insertar usuario
      const userQuery = `
        INSERT INTO users (name, last_name, company, email, password_hash, role, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, name, last_name, company, email, role, is_active, created_at, updated_at
      `;
      const userValues = [
        sanitizedData.name,
        sanitizedData.lastName,
        sanitizedData.company,
        sanitizedData.email,
        hashedPassword,
        userData.role || "user",
        userData.isActive !== undefined ? userData.isActive : true,
        new Date(),
        new Date(),
      ];

      const userResult = await client.query(userQuery, userValues);
      const newUser = userResult.rows[0];

      // Verificar estructura de la tabla subscriptions
      const tableInfo = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'subscriptions'
        AND column_name IN ('last_payment_date', 'next_billing_date')
        ORDER BY column_name
      `);

      const hasColumns = {
        lastPaymentDate: tableInfo.rows.some((row: any) => row.column_name === 'last_payment_date'),
        nextBillingDate: tableInfo.rows.some((row: any) => row.column_name === 'next_billing_date')
      };

      // Construir consulta dinámica basada en columnas existentes
      let subscriptionQuery = '';
      let subscriptionValues: any[] = [];

      if (hasColumns.lastPaymentDate && hasColumns.nextBillingDate) {
        subscriptionQuery = `
          INSERT INTO subscriptions (
            user_id, plan, status, analysis_count, analysis_limit, 
            next_billing_date, last_payment_date, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;
        subscriptionValues = [
          newUser.id,
          plan,
          userData.subscription?.status || "trial",
          userData.subscription?.analysisCount || 0,
          PLAN_DETAILS[plan as keyof typeof PLAN_DETAILS]?.analysisLimit || 5,
          nextBillingDate,
          new Date(),
          new Date(),
          new Date(),
        ];
      } else if (hasColumns.nextBillingDate) {
        subscriptionQuery = `
          INSERT INTO subscriptions (
            user_id, plan, status, analysis_count, analysis_limit, 
            next_billing_date, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        subscriptionValues = [
          newUser.id,
          plan,
          userData.subscription?.status || "trial",
          userData.subscription?.analysisCount || 0,
          PLAN_DETAILS[plan as keyof typeof PLAN_DETAILS]?.analysisLimit || 5,
          nextBillingDate,
          new Date(),
          new Date(),
        ];
      } else {
        subscriptionQuery = `
          INSERT INTO subscriptions (
            user_id, plan, status, analysis_count, analysis_limit, 
            created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        subscriptionValues = [
          newUser.id,
          plan,
          userData.subscription?.status || "trial",
          userData.subscription?.analysisCount || 0,
          PLAN_DETAILS[plan as keyof typeof PLAN_DETAILS]?.analysisLimit || 5,
          new Date(),
          new Date(),
        ];
      }

      await client.query(subscriptionQuery, subscriptionValues);
      await client.query("COMMIT");

      // Formatear el usuario para devolverlo
      const user: User = {
        id: newUser.id,
        name: newUser.name,
        lastName: newUser.last_name,
        company: newUser.company,
        email: newUser.email,
        password: hashedPassword,
        role: newUser.role,
        isActive: newUser.is_active,
        subscription: {
          plan: plan,
          status: userData.subscription?.status || "trial",
          analysisCount: userData.subscription?.analysisCount || 0,
          analysisLimit: PLAN_DETAILS[plan as keyof typeof PLAN_DETAILS]?.analysisLimit || 5,
          nextBilling: nextBillingDate.toISOString(),
          lastPayment: new Date().toISOString(),
          daysRemaining: this.calculateDaysRemaining(nextBillingDate),
        },
        createdAt: newUser.created_at,
        updatedAt: newUser.updated_at,
      };

      return user;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("❌ Error en createUser:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Obtener usuario por ID
  public async getUserById(id: number): Promise<User | null> {
    try {
      const query = `
        SELECT 
          u.*, 
          s.plan, 
          s.status, 
          s.analysis_count, 
          s.analysis_limit, 
          s.next_billing_date,
          s.last_payment_date,
          COALESCE(EXTRACT(DAY FROM (s.next_billing_date - NOW())), 0) as days_remaining
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id
        WHERE u.id = $1
      `;
      
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return this.mapRowToUser(row);
    } catch (error: any) {
      console.error("❌ Error en getUserById:", error);
      
      // Consulta alternativa si hay error de columna
      if (error.message && error.message.includes('last_payment_date')) {
        const fallbackQuery = `
          SELECT 
            u.*, 
            s.plan, 
            s.status, 
            s.analysis_count, 
            s.analysis_limit, 
            s.next_billing_date,
            COALESCE(EXTRACT(DAY FROM (s.next_billing_date - NOW())), 0) as days_remaining
          FROM users u
          LEFT JOIN subscriptions s ON u.id = s.user_id
          WHERE u.id = $1
        `;
        
        const result = await pool.query(fallbackQuery, [id]);
        if (result.rows.length === 0) {
          return null;
        }
        
        const row = result.rows[0];
        return this.mapRowToUser(row);
      }
      
      throw error;
    }
  }

  // Obtener usuario por email
  public async getUserByEmail(email: string): Promise<User | null> {
    try {
      const query = `
        SELECT 
          u.*, 
          s.plan, 
          s.status, 
          s.analysis_count, 
          s.analysis_limit, 
          s.next_billing_date,
          s.last_payment_date,
          COALESCE(EXTRACT(DAY FROM (s.next_billing_date - NOW())), 0) as days_remaining
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id
        WHERE u.email = $1
      `;
      
      const result = await pool.query(query, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return this.mapRowToUser(row);
    } catch (error: any) {
      console.error("❌ Error en getUserByEmail:", error);
      
      // Consulta alternativa si hay error de columna
      if (error.message && error.message.includes('last_payment_date')) {
        const fallbackQuery = `
          SELECT 
            u.*, 
            s.plan, 
            s.status, 
            s.analysis_count, 
            s.analysis_limit, 
            s.next_billing_date,
            COALESCE(EXTRACT(DAY FROM (s.next_billing_date - NOW())), 0) as days_remaining
          FROM users u
          LEFT JOIN subscriptions s ON u.id = s.user_id
          WHERE u.email = $1
        `;
        
        const result = await pool.query(fallbackQuery, [email]);
        if (result.rows.length === 0) {
          return null;
        }
        
        const row = result.rows[0];
        return this.mapRowToUser(row);
      }
      
      throw error;
    }
  }

  // Mapear fila de BD a objeto User
  private mapRowToUser(row: any): User {
    const nextBillingDate = row.next_billing_date ? new Date(row.next_billing_date) : null;
    const daysRemaining = row.days_remaining ? 
      Math.max(0, Math.ceil(row.days_remaining)) : 
      this.calculateDaysRemaining(nextBillingDate);
    
    return {
      id: row.id,
      name: row.name,
      lastName: row.last_name,
      company: row.company,
      email: row.email,
      password: row.password_hash,
      role: row.role,
      isActive: row.is_active,
      subscription: {
        plan: row.plan || 'free',
        status: row.status || 'trial',
        analysisCount: row.analysis_count || 0,
        analysisLimit: row.analysis_limit || 5,
        nextBilling: row.next_billing_date ? row.next_billing_date.toISOString() : 
          this.calculateNextBillingDate(row.plan || 'free').toISOString(),
        lastPayment: row.last_payment_date ? row.last_payment_date.toISOString() : new Date().toISOString(),
        daysRemaining: daysRemaining,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Obtener todos los usuarios
  public async getAllUsers(): Promise<User[]> {
    try {
      const query = `
        SELECT 
          u.*, 
          s.plan, 
          s.status, 
          s.analysis_count, 
          s.analysis_limit, 
          s.next_billing_date,
          s.last_payment_date,
          COALESCE(EXTRACT(DAY FROM (s.next_billing_date - NOW())), 0) as days_remaining
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id
        ORDER BY u.created_at DESC
      `;
      
      const result = await pool.query(query);
      return result.rows.map(row => this.mapRowToUser(row));
    } catch (error: any) {
      console.error("❌ Error en getAllUsers:", error);
      
      // Consulta alternativa
      const fallbackQuery = `
        SELECT 
          u.*, 
          s.plan, 
          s.status, 
          s.analysis_count, 
          s.analysis_limit, 
          s.next_billing_date,
          COALESCE(EXTRACT(DAY FROM (s.next_billing_date - NOW())), 0) as days_remaining
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id
        ORDER BY u.created_at DESC
      `;
      
      const result = await pool.query(fallbackQuery);
      return result.rows.map(row => this.mapRowToUser(row));
    }
  }

  // Cambiar plan de suscripción
  public async changePlan(
    id: number,
    newPlan: User["subscription"]["plan"],
  ): Promise<User | null> {
    const client = await pool.connect();
    try {
      const nextBillingDate = this.calculateNextBillingDate(newPlan);
      
      // Verificar si last_payment_date existe
      const tableInfo = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        AND column_name = 'last_payment_date'
      `);

      const hasLastPaymentDate = tableInfo.rows.length > 0;

      let query: string;
      let values: any[];

      if (hasLastPaymentDate) {
        query = `
          UPDATE subscriptions 
          SET plan = $1, 
              analysis_limit = $2, 
              status = 'active',
              next_billing_date = $3, 
              last_payment_date = NOW(),
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $4
        `;
        values = [
          newPlan,
          PLAN_DETAILS[newPlan]?.analysisLimit || 5,
          nextBillingDate,
          id,
        ];
      } else {
        query = `
          UPDATE subscriptions 
          SET plan = $1, 
              analysis_limit = $2, 
              status = 'active',
              next_billing_date = $3, 
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $4
        `;
        values = [
          newPlan,
          PLAN_DETAILS[newPlan]?.analysisLimit || 5,
          nextBillingDate,
          id,
        ];
      }

      await client.query(query, values);

      // Activar al usuario si estaba inactivo
      await client.query(
        `UPDATE users SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id]
      );

      return await this.getUserById(id);
    } catch (error) {
      console.error("❌ Error en changePlan:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Verificar y desactivar usuarios con suscripción vencida
  public async checkAndDeactivateExpiredUsers(): Promise<void> {
    try {
      console.log("🔍 Verificando usuarios con suscripciones vencidas...");
      
      const query = `
        SELECT u.id, u.email, s.next_billing_date, s.status
        FROM users u
        JOIN subscriptions s ON u.id = s.user_id
        WHERE u.is_active = true 
          AND s.status = 'active' 
          AND s.next_billing_date IS NOT NULL
          AND s.next_billing_date < NOW()
      `;
      
      const result = await pool.query(query);
      
      if (result.rows.length > 0) {
        console.log(`⚠️ Encontrados ${result.rows.length} usuarios con suscripción vencida`);
        
        for (const user of result.rows) {
          console.log(`⏰ Desactivando usuario ${user.email} (ID: ${user.id})`);
          
          await pool.query(
            `UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`,
            [user.id]
          );
          
          await pool.query(
            `UPDATE subscriptions SET status = 'inactive', updated_at = NOW() WHERE user_id = $1`,
            [user.id]
          );
          
          console.log(`✅ Usuario ${user.email} desactivado por suscripción vencida`);
        }
      } else {
        console.log("✅ Todos los usuarios están al día con sus pagos");
      }
    } catch (error) {
      console.error("❌ Error al verificar usuarios vencidos:", error);
    }
  }

  // Verificar el estado de un usuario específico
  public async checkUserSubscriptionStatus(userId: number): Promise<{
    isActive: boolean;
    daysRemaining: number;
    nextBillingDate: Date | null;
    shouldDeactivate: boolean;
  }> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error("Usuario no encontrado");
      }

      if (!user.subscription.nextBilling) {
        return {
          isActive: user.isActive,
          daysRemaining: 0,
          nextBillingDate: null,
          shouldDeactivate: false
        };
      }

      const nextBillingDate = new Date(user.subscription.nextBilling);
      const now = new Date();
      const daysRemaining = this.calculateDaysRemaining(nextBillingDate);
      const shouldDeactivate = nextBillingDate < now && user.subscription.status === 'active';

      if (shouldDeactivate && user.isActive) {
        console.log(`⏰ Desactivando usuario ${user.email} automáticamente`);
        
        await pool.query(
          `UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`,
          [userId]
        );
        
        await pool.query(
          `UPDATE subscriptions SET status = 'inactive', updated_at = NOW() WHERE user_id = $1`,
          [userId]
        );
      }

      return {
        isActive: shouldDeactivate ? false : user.isActive,
        daysRemaining,
        nextBillingDate,
        shouldDeactivate
      };
    } catch (error) {
      console.error("Error al verificar estado de suscripción:", error);
      return {
        isActive: false,
        daysRemaining: 0,
        nextBillingDate: null,
        shouldDeactivate: false
      };
    }
  }

  // Obtener usuarios próximos a vencer
  public async getUsersWithExpiringSubscriptions(daysThreshold: number = 7): Promise<User[]> {
    try {
      const query = `
        SELECT 
          u.*, 
          s.plan, 
          s.status, 
          s.analysis_count, 
          s.analysis_limit, 
          s.next_billing_date,
          s.last_payment_date,
          COALESCE(EXTRACT(DAY FROM (s.next_billing_date - NOW())), 0) as days_remaining
        FROM users u
        JOIN subscriptions s ON u.id = s.user_id
        WHERE s.status = 'active'
          AND s.next_billing_date IS NOT NULL
          AND s.next_billing_date > NOW()
          AND s.next_billing_date <= (NOW() + INTERVAL '${daysThreshold} days')
        ORDER BY s.next_billing_date ASC
      `;

      const result = await pool.query(query);
      return result.rows.map(row => this.mapRowToUser(row));
    } catch (error: any) {
      console.error("Error en getUsersWithExpiringSubscriptions:", error);
      
      // Consulta alternativa
      const fallbackQuery = `
        SELECT 
          u.*, 
          s.plan, 
          s.status, 
          s.analysis_count, 
          s.analysis_limit, 
          s.next_billing_date,
          COALESCE(EXTRACT(DAY FROM (s.next_billing_date - NOW())), 0) as days_remaining
        FROM users u
        JOIN subscriptions s ON u.id = s.user_id
        WHERE s.status = 'active'
          AND s.next_billing_date IS NOT NULL
          AND s.next_billing_date > NOW()
          AND s.next_billing_date <= (NOW() + INTERVAL '${daysThreshold} days')
        ORDER BY s.next_billing_date ASC
      `;
      
      const result = await pool.query(fallbackQuery);
      return result.rows.map(row => this.mapRowToUser(row));
    }
  }

  // Obtener usuarios vencidos
  public async getUsersWithExpiredSubscriptions(): Promise<User[]> {
    try {
      const query = `
        SELECT 
          u.*, 
          s.plan, 
          s.status, 
          s.analysis_count, 
          s.analysis_limit, 
          s.next_billing_date,
          s.last_payment_date,
          COALESCE(EXTRACT(DAY FROM (s.next_billing_date - NOW())), 0) as days_remaining
        FROM users u
        JOIN subscriptions s ON u.id = s.user_id
        WHERE s.status = 'active'
          AND s.next_billing_date IS NOT NULL
          AND s.next_billing_date <= NOW()
        ORDER BY s.next_billing_date ASC
      `;

      const result = await pool.query(query);
      return result.rows.map(row => this.mapRowToUser(row));
    } catch (error: any) {
      console.error("Error en getUsersWithExpiredSubscriptions:", error);
      
      // Consulta alternativa
      const fallbackQuery = `
        SELECT 
          u.*, 
          s.plan, 
          s.status, 
          s.analysis_count, 
          s.analysis_limit, 
          s.next_billing_date,
          COALESCE(EXTRACT(DAY FROM (s.next_billing_date - NOW())), 0) as days_remaining
        FROM users u
        JOIN subscriptions s ON u.id = s.user_id
        WHERE s.status = 'active'
          AND s.next_billing_date IS NOT NULL
          AND s.next_billing_date <= NOW()
        ORDER BY s.next_billing_date ASC
      `;
      
      const result = await pool.query(fallbackQuery);
      return result.rows.map(row => this.mapRowToUser(row));
    }
  }

  // Actualizar usuario
  public async updateUser(
    id: number,
    updateData: Partial<User>,
  ): Promise<User | null> {
    const client = await pool.connect();
    try {
      const sanitizedData: any = {};
      if (updateData.name)
        sanitizedData.name = this.securityService.sanitizeInput(
          updateData.name,
        );
      if (updateData.lastName)
        sanitizedData.lastName = this.securityService.sanitizeInput(
          updateData.lastName,
        );
      if (updateData.company)
        sanitizedData.company = this.securityService.sanitizeInput(
          updateData.company,
        );
      if (updateData.email) {
        sanitizedData.email = this.securityService.sanitizeInput(
          updateData.email,
        );
        if (!this.securityService.validateEmail(sanitizedData.email)) {
          throw new Error("Email inválido");
        }
      }

      // Construir la consulta dinámicamente
      const setClause = Object.keys(sanitizedData)
        .map((key, index) => {
          const dbKey = key === "lastName" ? "last_name" : key;
          return `${dbKey} = $${index + 1}`;
        })
        .join(", ");

      if (setClause) {
        const values = Object.values(sanitizedData);
        values.push(id);

        const query = `
          UPDATE users 
          SET ${setClause}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $${values.length}
          RETURNING *
        `;

        const result = await client.query(query, values);
        if (result.rows.length === 0) {
          return null;
        }

        // Si hay datos de suscripción para actualizar
        if (updateData.subscription) {
          const subQuery = `
            UPDATE subscriptions 
            SET plan = $1, status = $2, analysis_count = $3, analysis_limit = $4,
                next_billing_date = $5, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $6
          `;
          const subValues = [
            updateData.subscription.plan,
            updateData.subscription.status,
            updateData.subscription.analysisCount,
            updateData.subscription.analysisLimit,
            updateData.subscription.nextBilling
              ? new Date(updateData.subscription.nextBilling)
              : null,
            id,
          ];
          await client.query(subQuery, subValues);
        }

        // Obtener el usuario actualizado
        return await this.getUserById(id);
      }

      return null;
    } finally {
      client.release();
    }
  }

  // Actualizar contraseña del usuario
  public async updatePassword(
    id: number,
    newPassword: string,
  ): Promise<boolean> {
    if (!this.securityService.validatePassword(newPassword)) {
      throw new Error(
        "La contraseña debe tener al menos 6 caracteres, incluyendo letras y números",
      );
    }

    const hashedPassword = await this.securityService.hashPassword(newPassword);

    const query = `
      UPDATE users 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    const result = await pool.query(query, [hashedPassword, id]);
    return result.rowCount > 0;
  }

  // Incrementar contador de análisis
  public async incrementAnalysisCount(id: number): Promise<User | null> {
    const query = `
      UPDATE subscriptions 
      SET analysis_count = analysis_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return null;
    }

    // Actualizar también la fecha de actualización del usuario
    await pool.query(
      `
      UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1
    `,
      [id],
    );

    return await this.getUserById(id);
  }

  // Renovar suscripción (simular pago)
  public async renewSubscription(
    userId: number,
    plan: string = 'basic'
  ): Promise<User | null> {
    const client = await pool.connect();
    try {
      const nextBillingDate = this.calculateNextBillingDate(plan);
      
      const query = `
        UPDATE subscriptions 
        SET plan = $1, 
            status = 'active',
            next_billing_date = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $3
      `;
      
      await client.query(query, [plan, nextBillingDate, userId]);
      
      // Activar al usuario
      await client.query(
        `UPDATE users SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [userId]
      );
      
      return await this.getUserById(userId);
    } finally {
      client.release();
    }
  }

  // Obtener estadísticas
  public async getStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalRevenue: number;
    totalAnalysis: number;
    expiredSubscriptions: number;
  }> {
    const usersQuery = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users
      FROM users
    `);

    const subscriptionQuery = await pool.query(`
      SELECT 
        SUM(s.analysis_count) as total_analysis,
        s.plan,
        COUNT(*) as plan_count,
        COUNT(CASE WHEN s.next_billing_date < NOW() AND s.status = 'active' THEN 1 END) as expired_count
      FROM subscriptions s
      WHERE s.status = 'active'
      GROUP BY s.plan
    `);

    let totalRevenue = 0;
    let totalAnalysis = 0;
    let expiredSubscriptions = 0;

    const planPrices: { [key: string]: number } = {
      free: 0,
      basic: 19000,
      pro: 49000,
      enterprise: 199000,
    };

    subscriptionQuery.rows.forEach((row) => {
      totalAnalysis += parseInt(row.total_analysis) || 0;
      totalRevenue +=
        (planPrices[row.plan] || 0) * (parseInt(row.plan_count) || 0);
      expiredSubscriptions += parseInt(row.expired_count) || 0;
    });

    return {
      totalUsers: parseInt(usersQuery.rows[0].total_users) || 0,
      activeUsers: parseInt(usersQuery.rows[0].active_users) || 0,
      totalRevenue,
      totalAnalysis,
      expiredSubscriptions,
    };
  }

  // Método para verificar credenciales (login)
  public async verifyCredentials(
    email: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      return null;
    }

    const passwordValid = await this.securityService.verifyPassword(
      password,
      user.password,
    );
    if (!passwordValid) {
      return null;
    }

    return user;
  }

  // Buscar usuarios
  public async searchUsers(query: string): Promise<User[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    const searchQuery = `
      SELECT 
        u.*, 
        s.plan, 
        s.status, 
        s.analysis_count, 
        s.analysis_limit, 
        s.next_billing_date,
        s.last_payment_date,
        COALESCE(EXTRACT(DAY FROM (s.next_billing_date - NOW())), 0) as days_remaining
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE 
        LOWER(u.name) LIKE $1 OR
        LOWER(u.last_name) LIKE $1 OR
        LOWER(u.email) LIKE $1 OR
        LOWER(u.company) LIKE $1
      ORDER BY u.created_at DESC
    `;

    const result = await pool.query(searchQuery, [searchTerm]);
    return result.rows.map(row => this.mapRowToUser(row));
  }

  // Obtener usuarios con filtros
  public async getUsersWithFilters(filters: {
    role?: string;
    isActive?: boolean;
    subscriptionPlan?: string;
    subscriptionStatus?: string;
  }): Promise<User[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.role) {
      conditions.push(`u.role = $${paramIndex}`);
      values.push(filters.role);
      paramIndex++;
    }

    if (filters.isActive !== undefined) {
      conditions.push(`u.is_active = $${paramIndex}`);
      values.push(filters.isActive);
      paramIndex++;
    }

    if (filters.subscriptionPlan) {
      conditions.push(`s.plan = $${paramIndex}`);
      values.push(filters.subscriptionPlan);
      paramIndex++;
    }

    if (filters.subscriptionStatus) {
      conditions.push(`s.status = $${paramIndex}`);
      values.push(filters.subscriptionStatus);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT 
        u.*, 
        s.plan, 
        s.status, 
        s.analysis_count, 
        s.analysis_limit, 
        s.next_billing_date,
        s.last_payment_date,
        COALESCE(EXTRACT(DAY FROM (s.next_billing_date - NOW())), 0) as days_remaining
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      ${whereClause}
      ORDER BY u.created_at DESC
    `;

    const result = await pool.query(query, values);
    return result.rows.map(row => this.mapRowToUser(row));
  }

  // Activar/desactivar usuario
  public async toggleUserStatus(id: number): Promise<User | null> {
    const query = `
      UPDATE users 
      SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return await this.getUserById(id);
  }

  // Eliminar usuario (soft delete)
  public async deleteUser(id: number): Promise<boolean> {
    const query = `
      UPDATE users 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  }
}

// Instancia única del CRUD
export const userCRUD = new UserCRUD();