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
    return async (req: any, res: any) => {
      try {
        // Extract IP address from request
        const ip =
          req.headers['x-forwarded-for']?.split(',')[0] ||
          req.headers['x-real-ip'] ||
          req.socket.remoteAddress ||
          '';

        // Consume one point for this IP
        await rateLimiter.consume(ip);

        // If we reach here, rate limit, the above will throw
        return handler(req, res);
      } catch (err) {
        // Rate limit exceeded
        if (err instanceof Error && err.name === 'RateLimiterError') {
          return new Response('Too Many Requests', { status: 429 });
        }
        throw err;
      }
    };
  };
}