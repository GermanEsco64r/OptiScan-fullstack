// lib/security/auth.ts
import bcrypt from "bcryptjs";
import jwt, { JwtPayload } from "jsonwebtoken";

// Interfaz para el payload del token
interface TokenPayload extends JwtPayload {
  id: number;
  email: string;
  role: "user" | "admin";
  name: string;
  lastName: string;
  company: string;
}

// Interfaz para el usuario
export interface User {
  id: number;
  name: string;
  lastName: string;
  company: string;
  email: string;
  password: string;
  role: "user" | "admin";
  isActive: boolean;
  subscription?: {
    plan: "free" | "basic" | "pro" | "enterprise";
    status: "active" | "inactive" | "trial";
    analysisCount: number;
    nextBilling?: string;
    analysisLimit?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Interfaz para login
export interface LoginCredentials {
  email: string;
  password: string;
}

// Interfaz para registro
export interface RegisterData {
  name: string;
  lastName: string;
  company: string;
  email: string;
  password: string;
}

// Clase de seguridad
export class SecurityService {
  private static instance: SecurityService;
  private currentUser: User | null = null;

  private constructor() {}

  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  // Obtener JWT_SECRET de forma segura
  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("❌ ERROR: JWT_SECRET no está definido en las variables de entorno");
      throw new Error("JWT_SECRET no está definido en las variables de entorno");
    }
    return secret;
  }

  // Hash de contraseña
  public async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  // Verificar contraseña
  public async verifyPassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Generar token JWT
  public generateToken(user: Omit<User, "password">): string {
    const secret = this.getJwtSecret();
    
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        lastName: user.lastName,
        company: user.company,
      },
      secret,
      { expiresIn: "24h" },
    );
  }

  // Verificar token JWT
  public verifyToken(token: string): TokenPayload | null {
    try {
      const secret = this.getJwtSecret();
      console.log('🔍 Verificando token');
      
      const decoded = jwt.verify(token, secret) as TokenPayload;
      
      console.log('✅ Token verificado exitosamente');
      console.log('📊 Token decodificado:', {
        id: decoded.id,
        email: decoded.email,
        exp: decoded.exp,
        expDate: decoded.exp ? new Date(decoded.exp * 1000).toLocaleString() : 'No exp'
      });
      
      return decoded;
    } catch (error: any) {
      console.error('❌ Error verificando token:', error.message);
      
      // Información adicional para depuración
      try {
        const decoded = jwt.decode(token);
        console.log('📋 Token decodificado (sin verificar):', decoded);
        if (decoded && typeof decoded === 'object' && 'exp' in decoded) {
          const now = Math.floor(Date.now() / 1000);
          const exp = (decoded as any).exp;
          console.log('⏰ Estado de expiración:', {
            expirado: exp < now,
            exp: exp,
            now: now,
            diferencia: exp - now
          });
        }
      } catch (decodeError) {
        console.error('❌ No se pudo decodificar el token');
      }
      
      return null;
    }
  }

  // Validar email
  public validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validar contraseña (mínimo 6 caracteres, al menos una letra y un número)
  public validatePassword(password: string): boolean {
    // Temporal: solo verificar longitud mínima
    console.log("Validando contraseña:", password);
    return password.length >= 6;
  }

  // Sanitizar entrada de usuario
  public sanitizeInput(input: string): string {
    return input.trim().replace(/[<>]/g, "").slice(0, 255);
  }

  // Verificar si usuario es admin
  public isAdmin(user: User): boolean {
    return user.role === "admin";
  }

  // Verificar si usuario está activo
  public isActive(user: User): boolean {
    return user.isActive;
  }

  // Establecer usuario actual (para uso en frontend)
  public setCurrentUser(user: User | null): void {
    this.currentUser = user;
  }

  // Obtener usuario actual
  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Cerrar sesión
  public logout(): void {
    this.currentUser = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("current_user");
    }
  }

  // Guardar sesión en localStorage (solo frontend)
  public saveSession(token: string, user: Omit<User, "password">): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token);
      localStorage.setItem("current_user", JSON.stringify(user));
    }
  }

  // Cargar sesión desde localStorage (solo frontend)
  public loadSession(): {
    token: string | null;
    user: Omit<User, "password"> | null;
  } {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      const userStr = localStorage.getItem("current_user");
      return {
        token,
        user: userStr ? JSON.parse(userStr) : null,
      };
    }
    return { token: null, user: null };
  }

  // Verificar permisos de usuario
  public hasPermission(user: User, requiredRole: "user" | "admin"): boolean {
    const roleHierarchy = { user: 1, admin: 2 };
    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  }

  // Validar token de Google (simulación)
  public async validateGoogleToken(
    token: string,
  ): Promise<{ email: string; name: string } | null> {
    // Simulación - en producción usarías la API de Google
    if (token === "google_auth_token") {
      return {
        email: "usuario.google@example.com",
        name: "Usuario Google",
      };
    }
    return null;
  }
}