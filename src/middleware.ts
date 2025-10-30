import type { MiddlewareHandler } from 'astro';
import { applySecurityHeaders, createSecurityContext } from './lib/security';

export const onRequest: MiddlewareHandler = async (context, next) => {
  const securityContext = createSecurityContext(context.request);

  context.locals.cspNonce = securityContext.cspNonce;
  context.locals.security = { isHttps: securityContext.isHttps };

  const response = await next();

  return applySecurityHeaders(response, securityContext);
};
