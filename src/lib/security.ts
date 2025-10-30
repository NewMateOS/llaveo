// Security utilities for LLaveo
import { createHash, randomBytes } from 'node:crypto';

// Rate limiting simple en memoria (en producción usar Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const TRUST_PROXY_HEADERS = (import.meta.env.LLAVEO_TRUST_PROXY_HEADERS || '').toLowerCase() === 'true';
const FORCE_HTTPS = (import.meta.env.LLAVEO_FORCE_HTTPS || '').toLowerCase() === 'true';

export interface SecurityHeaders {
  'Content-Security-Policy': string;
  'X-Frame-Options': string;
  'X-Content-Type-Options': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'Strict-Transport-Security'?: string;
}

export interface SecurityHeaderOptions {
  isHttps?: boolean;
  cspNonce?: string;
}

export interface SecurityContext {
  isHttps: boolean;
  cspNonce?: string;
}

export function createSecurityContext(request?: Request, generateNonce: boolean = true): SecurityContext {
  return {
    isHttps: FORCE_HTTPS || inferHttps(request),
    cspNonce: generateNonce ? randomBytes(16).toString('base64') : undefined
  };
}

export function resolveSecurityOptions(request?: Request, overrides: SecurityHeaderOptions = {}): SecurityHeaderOptions {
  return {
    isHttps: overrides.isHttps ?? FORCE_HTTPS || inferHttps(request),
    cspNonce: overrides.cspNonce
  };
}

export function getSecurityHeaders(options: SecurityHeaderOptions = {}): SecurityHeaders {
  const scriptSrc: string[] = ["'self'", 'https://cdn.jsdelivr.net', 'https://unpkg.com'];
  if (options.cspNonce) {
    scriptSrc.push(`'nonce-${options.cspNonce}'`);
  }

  const styleSrc: string[] = ["'self'", 'https://fonts.googleapis.com'];
  if (options.cspNonce) {
    styleSrc.push(`'nonce-${options.cspNonce}'`);
  }

  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    `style-src ${styleSrc.join(' ')}`,
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; ');

  const headers: SecurityHeaders = {
    'Content-Security-Policy': csp,
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  };

  if (options.isHttps) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  return headers;
}

export function applySecurityHeaders(response: Response, options: SecurityHeaderOptions = {}): Response {
  const headers = getSecurityHeaders(options);

  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export function rateLimit(identifier: string, maxRequests: number = 100, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const key = identifier;
  
  const current = rateLimitMap.get(key);

  // Si la entrada existe pero está expirada, eliminarla antes de crear una nueva
  if (current && now > current.resetTime) {
    rateLimitMap.delete(key);
  }

  // Limpiar otras entradas expiradas periódicamente (1% de las veces para evitar penalizar performance)
  if (Math.random() < 0.01) {
    cleanupExpiredEntries(now);
  }

  // Si no hay entrada o fue expirada (y ya eliminada), crear nueva
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  const entry = rateLimitMap.get(key)!;
  
  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

// Función para limpiar entradas expiradas del Map
function cleanupExpiredEntries(now: number): void {
  const entriesToDelete: string[] = [];
  
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      entriesToDelete.push(key);
    }
  }
  
  // Eliminar entradas expiradas
  for (const key of entriesToDelete) {
    rateLimitMap.delete(key);
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra mayúscula');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra minúscula');
  }
  
  if (!/\d/.test(password)) {
    errors.push('La contraseña debe contener al menos un número');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('La contraseña debe contener al menos un carácter especial');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remover < y >
    .substring(0, 1000); // Limitar longitud
}

export function validatePropertyId(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function getClientIP(request: Request): string {
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  if (TRUST_PROXY_HEADERS) {
    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
      return realIP;
    }

    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0]!.trim();
    }

    const forwardedHeader = request.headers.get('forwarded');
    if (forwardedHeader) {
      const parsed = parseForwardedFor(forwardedHeader);
      if (parsed) {
        return parsed;
      }
    }
  }

  const vercelIP = request.headers.get('x-vercel-ip');
  if (vercelIP) {
    return vercelIP;
  }

  const fingerprint = `${request.headers.get('user-agent') ?? ''}|${request.headers.get('accept-language') ?? ''}`;
  if (!fingerprint.trim()) {
    return 'anonymous';
  }

  return `anon-${createHash('sha256').update(fingerprint).digest('hex').slice(0, 16)}`;
}

export function createSecureResponse(data: any, status: number = 200, options: SecurityHeaderOptions = {}): Response {
  const response = new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });

  return applySecurityHeaders(response, options);
}

export function createErrorResponse(message: string, status: number = 400, details?: any, options: SecurityHeaderOptions = {}): Response {
  const errorData = {
    error: message,
    ...(details && { details })
  };

  return createSecureResponse(errorData, status, options);
}

function inferHttps(request?: Request): boolean {
  if (!request) {
    return false;
  }

  const directProtocol = new URL(request.url).protocol;
  if (directProtocol === 'https:') {
    return true;
  }

  const forwardedProto = request.headers.get('x-forwarded-proto') ?? request.headers.get('x-forwarded-protocol');
  if (forwardedProto) {
    return forwardedProto.split(',')[0]!.trim().toLowerCase() === 'https';
  }

  const forwardedHeader = request.headers.get('forwarded');
  if (forwardedHeader && forwardedHeader.toLowerCase().includes('proto=https')) {
    return true;
  }

  const cfVisitor = request.headers.get('cf-visitor');
  if (cfVisitor) {
    try {
      const parsed = JSON.parse(cfVisitor);
      if (parsed && typeof parsed === 'object' && parsed.scheme === 'https') {
        return true;
      }
    } catch {
      // ignore malformed header
    }
  }

  return false;
}

function parseForwardedFor(header: string): string | null {
  const parts = header.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.toLowerCase().startsWith('for=')) {
      const value = trimmed.slice(4).replace(/^"|"$/g, '');
      const host = value.split(',')[0]?.trim();
      if (host) {
        return host;
      }
    }
  }
  return null;
}
