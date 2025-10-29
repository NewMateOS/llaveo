import type { APIRoute } from 'astro';
import { createSecureResponse } from '../lib/security';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  
  try {
    // Verificar conectividad básica
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: import.meta.env.MODE,
      version: '1.0.0',
      checks: {
        database: 'unknown', // Se puede implementar verificación de DB
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
        },
        responseTime: 0
      }
    };

    // Calcular tiempo de respuesta
    healthCheck.checks.responseTime = Date.now() - startTime;

    // Verificar si las variables de entorno están configuradas
    const envCheck = {
      supabaseUrl: !!import.meta.env.PUBLIC_SUPABASE_URL,
      supabaseKey: !!import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
      brandName: !!import.meta.env.PUBLIC_BRAND_NAME
    };

    const allEnvConfigured = Object.values(envCheck).every(Boolean);
    
    if (!allEnvConfigured) {
      healthCheck.status = 'degraded';
      healthCheck.warnings = ['Variables de entorno no completamente configuradas'];
    }

    return createSecureResponse(healthCheck, healthCheck.status === 'healthy' ? 200 : 503);

  } catch (error) {
    console.error('Health check failed:', error);
    
    return createSecureResponse({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
};
