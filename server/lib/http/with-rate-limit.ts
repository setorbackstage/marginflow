import { RateLimiterMemory } from 'rate-limiter-flexible';

/**
 * Wraps an API handler with per-IP rate limiting (best-effort).
 *
 * ⚠️ LIMITAÇÃO CONHECIDA (VULN-003): em ambientes serverless (Vercel), cada
 * invocação roda em isolado efêmero e o `RateLimiterMemory` NÃO persiste entre
 * instâncias. Isto NÃO protege contra ataque distribuído em produção — é uma
 * defesa best-effort por instância, não uma barreira real. Para proteção
 * efetiva em produção, use Vercel Edge Rate Limiting ou um backend compartilhado
 * (Redis/Upstash/KV). Documentado para evitar falsa sensação de proteção.
 *
 * O login (`server/lib/rate-limit.ts`) aplica limite adicional por e-mail.
 *
 * @param options.points - Number of requests allowed per window (default 100).
 * @param options.duration - Window in seconds (default 60).
 */
export function withRateLimit(options: { points?: number; duration?: number } = {}) {
  const { points = 100, duration = 60 } = options;
  const rateLimiter = new RateLimiterMemory({ points, duration });

  return (handler: any) => {
    return async (req: any, ...rest: any[]) => {
      try {
        // Extract IP address from request (App Router: Headers object; legacy: plain object)
        let ip = '';
        if (req?.headers?.get) {
          ip =
            req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            req.headers.get('x-real-ip') ||
            '';
        } else if (req?.headers) {
          const fwd = req.headers['x-forwarded-for'];
          ip =
            (typeof fwd === 'string' ? fwd.split(',')[0]?.trim() : fwd?.[0]) ||
            req.headers['x-real-ip'] ||
            req.socket?.remoteAddress ||
            '';
        }

        // Consume one point for this IP
        await rateLimiter.consume(ip || 'unknown');

        return handler(req, ...rest);
      } catch (err) {
        // Rate limit exceeded (rate-limiter-flexible rejects with RateLimiterRes, not Error)
        if (err && typeof err === 'object' && 'msBeforeNext' in err) {
          return new Response('Too Many Requests', { status: 429 });
        }
        throw err;
      }
    };
  };
}