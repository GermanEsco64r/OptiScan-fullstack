import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import jwt from 'jsonwebtoken';

/**
 * Combina clases de Tailwind de forma segura
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Función para formatear fechas
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Función para formatear moneda
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Función para validar URL de imagen
 */
export function isValidImageUrl(url: string): boolean {
  try {
    new URL(url);
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
  } catch {
    return false;
  }
}

/**
 * Función para generar ID único
 */
export function generateId(prefix: string = "id"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Función para calcular compatibilidad de marcos
 */
export function calculateFrameCompatibility(
  frameWidth: number,
  faceWidth: number,
  frameStyle: string,
  faceShape: string,
): number {
  // Cálculo base por diferencia de ancho
  const widthDiff = Math.abs(frameWidth - faceWidth);
  let compatibility = 100 - widthDiff * 2;

  // Ajustes según estilo de marco y forma de rostro
  const styleCompatibility: Record<string, Record<string, number>> = {
    rectangular: {
      ovalado: 10,
      redondo: 15,
      cuadrado: 5,
      corazón: 8,
    },
    redondo: {
      ovalado: 5,
      redondo: 10,
      cuadrado: 15,
      corazón: 8,
    },
    aviador: {
      ovalado: 8,
      redondo: 12,
      cuadrado: 7,
      corazón: 10,
    },
  };

  const styleBonus =
    styleCompatibility[frameStyle.toLowerCase()]?.[faceShape.toLowerCase()] ??
    0;

  compatibility += styleBonus;

  // Limitar el rango final
  return Math.max(70, Math.min(95, Math.round(compatibility)));
}

/**
 * Verifica un token JWT directamente (para uso en API routes del servidor)
 */
export function verifyToken(token: string): any {
  try {
    const jwt = require("jsonwebtoken");
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error(
        "❌ JWT_SECRET no está definido en las variables de entorno",
      );
      return null;
    }

    return jwt.verify(token, secret);
  } catch (error: any) {
    console.error("❌ Error verificando token:", error.message);
    return null;
  }
}

/**
 * Decodifica un token JWT sin verificar (solo para depuración)
 */
export function decodeToken(token: string): any {
  try {
    const jwt = require("jsonwebtoken");
    return jwt.decode(token);
  } catch (error: any) {
    console.error("Error decodificando token:", error.message);
    return null;
  }
}

/**
 * Verifica si un token JWT está expirado
 */
export function isTokenExpired(token: string): boolean {
  try {
    const jwt = require("jsonwebtoken");
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return true;
    }

    const decoded = jwt.verify(token, secret);
    const now = Math.floor(Date.now() / 1000);

    return decoded.exp < now;
  } catch (error) {
    return true;
  }
}

/**
 * Verifica un token JWT directamente
 */
export function verifyJWTToken(token: string): any {
  try {
    const secret = process.env.JWT_SECRET || "tu_clave_secreta_super_segura_2024";
    
    if (!secret) {
      console.error('❌ JWT_SECRET no está definido');
      return null;
    }
    
    return jwt.verify(token, secret);
  } catch (error: any) {
    console.error('❌ Error verificando token:', error.message);
    return null;
  }
}

/**
 * Decodifica un token JWT sin verificar
 */
export function decodeJWTToken(token: string): any {
  try {
    return jwt.decode(token);
  } catch (error: any) {
    console.error('Error decodificando token:', error.message);
    return null;
  }
}

/**
 * Extrae información del usuario desde el token JWT
 */
export function extractUserFromToken(token: string): any {
  try {
    const decoded = verifyJWTToken(token);
    
    if (!decoded) {
      return null;
    }
    
    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
      lastName: decoded.lastName,
      company: decoded.company
    };
  } catch (error: any) {
    console.error('Error extrayendo usuario del token:', error.message);
    return null;
  }
}

/**
 * Verifica si un token JWT está expirado
 */
export function isJWTTokenExpired(token: string): boolean {
  try {
    const decoded = decodeJWTToken(token);
    if (!decoded || !decoded.exp) return true;
    
    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
  } catch (error) {
    return true;
  }
}
