// lib/services/authService.ts
import {
  SecurityService,
  LoginCredentials,
  RegisterData,
} from "@/lib/security/auth";

export class AuthService {
  private securityService: SecurityService;
  private apiBaseUrl: string;

  constructor() {
    this.securityService = SecurityService.getInstance();
    this.apiBaseUrl =
      typeof window !== "undefined" ? "" : "http://localhost:3000";
  }

  // Helper para hacer requests
  private async fetchApi(endpoint: string, options: RequestInit = {}) {
    const token = this.securityService.loadSession().token;

    const headers = {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${this.apiBaseUrl}/api${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Login con email y contraseña
  public async login(credentials: LoginCredentials): Promise<{
    success: boolean;
    token?: string;
    user?: any;
    message?: string;
  }> {
    try {
      console.log("📝 Intentando login para:", credentials.email);

      if (!this.securityService.validateEmail(credentials.email)) {
        console.log("❌ Email inválido:", credentials.email);
        return {
          success: false,
          message: "Email inválido",
        };
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      console.log("📡 Respuesta del servidor:", response.status);

      const data = await response.json();
      console.log("📊 Datos de respuesta:", data);

      if (!response.ok || !data.success) {
        return {
          success: false,
          message: data.message || "Error al iniciar sesión",
        };
      }

      if (data.token && data.user) {
        this.securityService.saveSession(data.token, data.user);
        this.securityService.setCurrentUser(data.user);
        console.log("✅ Login exitoso para:", data.user.email);
      }

      return {
        success: true,
        token: data.token,
        user: data.user,
        message: data.message,
      };
    } catch (error: any) {
      console.error("🔥 Error en login:", error);
      return {
        success: false,
        message: error.message || "Error de conexión con el servidor",
      };
    }
  }

  // Registro de nuevo usuario
  public async register(userData: RegisterData): Promise<{
    success: boolean;
    token?: string;
    user?: any;
    message?: string;
  }> {
    try {
      if (
        !userData.name ||
        !userData.lastName ||
        !userData.company ||
        !userData.email ||
        !userData.password
      ) {
        return {
          success: false,
          message: "Todos los campos son requeridos",
        };
      }

      if (!this.securityService.validateEmail(userData.email)) {
        return {
          success: false,
          message: "Email inválido",
        };
      }

      if (!this.securityService.validatePassword(userData.password)) {
        return {
          success: false,
          message:
            "La contraseña debe tener al menos 6 caracteres, incluyendo letras y números",
        };
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!data.success) {
        return {
          success: false,
          message: data.message || "Error al registrar usuario",
        };
      }

      if (data.token && data.user) {
        this.securityService.saveSession(data.token, data.user);
        this.securityService.setCurrentUser(data.user);
      }

      return {
        success: true,
        token: data.token,
        user: data.user,
        message: data.message,
      };
    } catch (error: any) {
      console.error("Error en registro:", error);
      return {
        success: false,
        message: error.message || "Error de conexión con el servidor",
      };
    }
  }

  // Verificar sesión actual
  public async verifySession(): Promise<{
    success: boolean;
    user?: any;
    message?: string;
  }> {
    try {
      const session = this.securityService.loadSession();

      if (!session.token) {
        return {
          success: false,
          message: "No hay sesión activa",
        };
      }

      const response = await fetch("/api/auth/verify", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

      if (!response.ok) {
        this.securityService.logout();
        return {
          success: false,
          message: "Sesión expirada o inválida",
        };
      }

      const data = await response.json();

      if (!data.success || !data.user) {
        this.securityService.logout();
        return {
          success: false,
          message: data.message || "Error al verificar sesión",
        };
      }

      this.securityService.setCurrentUser(data.user);
      return {
        success: true,
        user: data.user,
        message: data.message,
      };
    } catch (error: any) {
      console.error("Error al verificar sesión:", error);
      this.securityService.logout();
      return {
        success: false,
        message: "Error de conexión con el servidor",
      };
    }
  }

  // Cerrar sesión
  public logout(): void {
    this.securityService.logout();
  }

  // Verificar si el usuario es admin
  public isAdmin(): boolean {
    const user = this.securityService.getCurrentUser();
    return user ? user.role === "admin" : false;
  }

  // Verificar permisos
  public hasPermission(requiredRole: "user" | "admin"): boolean {
    const user = this.securityService.getCurrentUser();
    return user
      ? this.securityService.hasPermission(user, requiredRole)
      : false;
  }

  // Incrementar análisis del usuario
  public async incrementUserAnalysis(userId: number): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const session = this.securityService.loadSession();

      if (!session.token) {
        return {
          success: false,
          message: "No hay sesión activa",
        };
      }

      const response = await fetch("/api/auth/increment-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        return {
          success: false,
          message: "Error al conectar con el servidor",
        };
      }

      const data = await response.json();
      return {
        success: data.success,
        message: data.message,
      };
    } catch (error: any) {
      console.error("Error al incrementar análisis:", error);
      return {
        success: false,
        message: "Error de conexión",
      };
    }
  }

  // Login con Google (mantener para compatibilidad)
  public async loginWithGoogle(googleToken: string): Promise<{
    success: boolean;
    token?: string;
    user?: any;
    message?: string;
  }> {
    return {
      success: false,
      message: "Login con Google no implementado en esta versión",
    };
  }

  // Método para verificar token desde un string (para usar en API routes)
  public async verifyTokenFromString(token: string): Promise<{
    success: boolean;
    user?: any;
    message?: string;
  }> {
    try {
      console.log(
        "🔍 Verificando token desde string:",
        token ? "Token presente" : "No token",
      );

      if (!token) {
        console.log("❌ Token no proporcionado");
        return {
          success: false,
          message: "Token no proporcionado",
        };
      }

      // Opción 1: Usar SecurityService (corregido)
      const securityService = SecurityService.getInstance();
      const decoded = securityService.verifyToken(token);

      if (decoded) {
        console.log("✅ Token verificado localmente con SecurityService");
        return {
          success: true,
          user: decoded,
        };
      }

      // Opción 2: Usar API fallback
      console.log("🔄 Falló verificación local, intentando con API...");
      const response = await fetch(`${this.apiBaseUrl}/api/auth/verify-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      console.log("📡 Respuesta de verify-token:", response.status);

      if (!response.ok) {
        return {
          success: false,
          message: "Error al verificar token",
        };
      }

      const data = await response.json();
      console.log("📊 Datos de verify-token:", data);

      if (!data.success || !data.user) {
        return {
          success: false,
          message: data.message || "Token inválido",
        };
      }

      return {
        success: true,
        user: data.user,
        message: data.message,
      };
    } catch (error: any) {
      console.error("🔥 Error en verifyTokenFromString:", error);
      return {
        success: false,
        message: error.message || "Error de conexión",
      };
    }
  }

  // Método para extraer token del header de request
  public extractTokenFromHeader(request: Request): string | null {
    const authHeader = request.headers.get("Authorization");
    console.log("📋 Authorization header:", authHeader);

    if (!authHeader) return null;

    const [bearer, token] = authHeader.split(" ");
    console.log("📋 Bearer:", bearer, "Token:", token ? "Presente" : "Ausente");

    if (bearer !== "Bearer" || !token) return null;

    return token;
  }
}

// Instancia única del servicio de autenticación
export const authService = new AuthService();
