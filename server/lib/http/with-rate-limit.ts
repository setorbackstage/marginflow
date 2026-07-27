import { RateLimiterMemory } from 'rate-limiter-flexible';

/**
 * Returns a higher-order function that wraps an API handler with rate limiting by IP.
 * @param options - Options for the rate limiter.
 * @param options.points - Number of points to consume per interval (default: 100).
 * @param options.duration - Duration in seconds during which points are consumed (default: 60).
 * @returns A higher-order function that wraps an API handler.
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